import pool from "../config/db.js";
import { createEmployeeSchema } from "../schema/employeeSchema.js";
import { formatJoiError, parseCSV, parseXLS } from "../utils/helpers.js";

/**
 * Get all employees with optional pagination
 */
export const findAll = async ({ page, limit } = {}) => {
  let sql = `
    SELECT 
      e.employee_id,
      e.first_name,
      e.last_name,
      e.full_name,
      e.designation,
      e.email,
      e.contact_number,
      e.department_id,
      d.department_name,
      GROUP_CONCAT(ep.project_id) AS project_ids,
      GROUP_CONCAT(p.project_name) AS project_names
    FROM employee e
    LEFT JOIN department d ON e.department_id = d.department_id
    LEFT JOIN employee_project ep ON e.employee_id = ep.employee_id
    LEFT JOIN project p ON ep.project_id = p.project_id
    GROUP BY e.employee_id
  `;

  if (page != null && limit != null) {
    const l = parseInt(limit, 10);
    const offset = (parseInt(page, 10) - 1) * l;
    const [countRows] = await pool.query(
      "SELECT COUNT(*) AS total FROM employee",
    );
    const total = countRows[0].total;

    sql += ` LIMIT ${l} OFFSET ${offset}`;
    const [rows] = await pool.query(sql);
    return { records: rows, total_records: total };
  }

  const [rows] = await pool.query(sql);
  return rows;
};

/**
 * Get a single employee by ID
 */
export const findById = async (id) => {
  if (!Number.isInteger(id)) throw new Error(`Invalid employee ID: ${id}`);

  const [rows] = await pool.execute(
    "SELECT * FROM employee WHERE employee_id = ?",
    [id],
  );
  if (rows.length === 0) throw new Error(`Employee with ID ${id} not found.`);

  const [projects] = await pool.execute(
    "SELECT project_id FROM employee_project WHERE employee_id = ?",
    [id],
  );

  const [team] = await pool.execute(
    "SELECT t.team_id, t.team_name FROM employee_team et JOIN team t ON et.team_id = t.team_id WHERE et.employee_id = ?",
    [id],
  );

  return {
    ...rows[0],
    project_ids: projects.map((p) => p.project_id),
    team: team[0] || null,
  };
};

/**
 * Get all team members under a specific team lead
 */
export const findAllTeamMembers = async (teamLeadId) => {
  if (!Number.isInteger(teamLeadId))
    throw new Error(`Invalid team lead ID: ${teamLeadId}`);

  const [teamLeadResult] = await pool.execute(
    "SELECT department_id FROM team_lead WHERE employee_id = ?",
    [teamLeadId],
  );

  if (teamLeadResult.length === 0)
    throw new Error(`Team lead with ID ${teamLeadId} not found.`);

  const departmentId = teamLeadResult[0].department_id;

  const [teamMembers] = await pool.execute(
    `SELECT 
      e.employee_id, 
      e.first_name, 
      e.last_name, 
      e.designation, 
      e.email, 
      e.contact_number, 
      d.department_name,
      GROUP_CONCAT(ep.project_id) AS project_ids,
      GROUP_CONCAT(p.project_name) AS project_names
    FROM employee e
    LEFT JOIN department d ON e.department_id = d.department_id
    LEFT JOIN employee_project ep ON e.employee_id = ep.employee_id
    LEFT JOIN project p ON ep.project_id = p.project_id
    WHERE e.department_id = ?
    GROUP BY e.employee_id`,
    [departmentId],
  );

  if (teamMembers.length === 0)
    throw new Error(
      `No employees found in department with ID ${departmentId}.`,
    );

  return teamMembers;
};

/**
 * Process bulk file upload (CSV/XLS/XLSX)
 */
export const processBulkFile = async (
  file,
  department_id,
  project_ids = [],
) => {
  let rows = [];
  if (file.mimetype.includes("csv")) rows = await parseCSV(file.buffer);
  else rows = parseXLS(file.buffer);

  const errors = [];
  let inserted = 0;
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    for (let i = 0; i < rows.length; i++) {
      const emp = rows[i];

      if (!emp.first_name || !emp.last_name || !emp.email) {
        errors.push({ row: i + 1, error: "Missing required fields" });
        continue;
      }

      if (!/\S+@\S+\.\S+/.test(emp.email)) {
        errors.push({ row: i + 1, error: "Invalid email format" });
        continue;
      }

      const [dupe] = await connection.execute(
        "SELECT employee_id FROM employee WHERE email = ?",
        [emp.email],
      );
      if (dupe.length > 0) {
        errors.push({ row: i + 1, error: "Email already exists" });
        continue;
      }

      const [result] = await connection.execute(
        `INSERT INTO employee 
          (first_name, last_name, designation, email, contact_number, department_id)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          emp.first_name,
          emp.last_name,
          emp.designation || null,
          emp.email,
          emp.contact_number || null,
          department_id,
        ],
      );

      const employeeId = result.insertId;

      if (Array.isArray(project_ids) && project_ids.length > 0) {
        const projectValues = project_ids.map((pid) => [employeeId, pid]);
        await connection.query(
          `INSERT INTO employee_project (employee_id, project_id) VALUES ?`,
          [projectValues],
        );
      }

      inserted++;
    }

    await connection.commit();
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }

  return { total_rows: rows.length, inserted, errors };
};

/**
 * Create a new employee
 */
export const create = async (data) => {
  const { error, value } = createEmployeeSchema.validate(data, {
    abortEarly: false,
  });
  if (error) throw new Error(formatJoiError(error));

  const connection = await pool.getConnection();

  const isUpperManagement = ["CEO"].includes(data.designation);
  try {
    await connection.beginTransaction();

    // Duplicate email check
    const [existing] = await connection.execute(
      "SELECT employee_id FROM employee WHERE email = ?",
      [value.email],
    );
    if (existing.length > 0) {
      const err = new Error("Employee with this email already exists");
      err.code = "DUPLICATE_EMPLOYEE";
      throw err;
    }

    // Validate group
    if (
      (!Array.isArray(value.group) || value.group.length < 2) &&
      !isUpperManagement
    ) {
      const err = new Error(
        "Group must have at least 2 items: department and team",
      );
      err.code = "INVALID_GROUP";
      throw err;
    }

    // Find department & team dynamically
    let departmentId = null;
    let teamId = null;

    for (const item of value.group) {
      if (!departmentId) {
        const [dept] = await connection.execute(
          "SELECT department_id FROM department WHERE department_name = ?",
          [item],
        );
        if (dept[0]) {
          departmentId = dept[0].department_id;
          continue;
        }
      }

      if (!teamId) {
        const [team] = await connection.execute(
          "SELECT team_id FROM team WHERE team_name = ?",
          [item],
        );
        if (team[0]) {
          teamId = team[0].team_id;
          continue;
        }
      }
    }

    if (!departmentId) {
      const err = new Error(
        `No valid department found in group: ${value.group.join(", ")}`,
      );
      err.code = "INVALID_DEPARTMENT";
      throw err;
    }

    if (!teamId && !isUpperManagement) {
      const err = new Error(
        `No valid team found in group: ${value.group.join(", ")}`,
      );
      err.code = "INVALID_TEAM";
      throw err;
    }

    const [result] = await connection.execute(
      `INSERT INTO employee
        (first_name, last_name, designation, role, department_id, email, contact_number)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        value.first_name,
        value.last_name,
        value.designation || null,
        "Employee",
        departmentId,
        value.email,
        value.contact_number || null,
      ],
    );
    const employeeId = result.insertId;
    if (teamId) {

      await connection.execute(
        "INSERT INTO employee_team (employee_id, team_id) VALUES (?, ?)",
        [employeeId, teamId],
      );

      await connection.commit();
    }
    return {
      employee_id: employeeId,
      department_id: departmentId,
      team_id: teamId ?? null,
      ...value,
    };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
};

/**
 * Update an existing employee
 */
export const update = async (data) => {
  if (!data.employee_id || !Number.isInteger(data.employee_id))
    throw new Error("Invalid employee_id");

  const id = data.employee_id;
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [existing] = await connection.execute(
      "SELECT * FROM employee WHERE employee_id = ?",
      [id],
    );
    if (existing.length === 0)
      throw new Error(`Employee with ID ${id} not found.`);

    const fields = [];
    const values = [];

    if (data.first_name !== undefined) {
      fields.push("first_name = ?");
      values.push(data.first_name);
    }
    if (data.last_name !== undefined) {
      fields.push("last_name = ?");
      values.push(data.last_name);
    }
    if (data.designation !== undefined) {
      fields.push("designation = ?");
      values.push(data.designation);
    }
    if (data.email !== undefined) {
      fields.push("email = ?");
      values.push(data.email);
    }
    if (data.contact_number !== undefined) {
      fields.push("contact_number = ?");
      values.push(data.contact_number);
    }

    // Handle group update
    let departmentId = null;
    let teamId = null;

    if (Array.isArray(data.group)) {
      if (data.group.length < 2) {
        const err = new Error(
          "Group must have at least 2 items: department and team",
        );
        err.code = "INVALID_GROUP";
        throw err;
      }

      for (const item of data.group) {
        if (!departmentId) {
          const [dept] = await connection.execute(
            "SELECT department_id FROM department WHERE department_name = ?",
            [item],
          );
          if (dept[0]) {
            departmentId = dept[0].department_id;
            continue;
          }
        }

        if (departmentId && !teamId) {
          const [team] = await connection.execute(
            "SELECT team_id FROM team WHERE team_name = ? AND department_id = ?",
            [item, departmentId],
          );
          if (team[0]) {
            teamId = team[0].team_id;
            continue;
          }
        }
      }

      if (!departmentId) {
        const err = new Error(
          `No valid department found in group: ${data.group.join(", ")}`,
        );
        err.code = "INVALID_DEPARTMENT";
        throw err;
      }

      if (!teamId) {
        const err = new Error(
          `No valid team found in group: ${data.group.join(", ")}`,
        );
        err.code = "INVALID_TEAM";
        throw err;
      }

      fields.push("department_id = ?");
      values.push(departmentId);
    }

    if (fields.length > 0) {
      const sql = `UPDATE employee SET ${fields.join(", ")} WHERE employee_id = ?`;
      values.push(id);
      await connection.execute(sql, values);
    }

    // Update team assignment
    if (teamId) {
      await connection.execute(
        "DELETE FROM employee_team WHERE employee_id = ?",
        [id],
      );
      await connection.execute(
        "INSERT INTO employee_team (employee_id, team_id) VALUES (?, ?)",
        [id, teamId],
      );
    }

    // Update projects
    if (Array.isArray(data.project_ids)) {
      await connection.execute(
        "DELETE FROM employee_project WHERE employee_id = ?",
        [id],
      );
      if (data.project_ids.length > 0) {
        const projectValues = data.project_ids.map((pid) => [id, pid]);
        await connection.query(
          "INSERT INTO employee_project (employee_id, project_id) VALUES ?",
          [projectValues],
        );
      }
    }

    await connection.commit();

    return {
      employee_id: id,
      department_id: departmentId,
      team_id: teamId,
      ...data,
    };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
};

/**
 * Delete employee by ID
 */
export const remove = async (id) => {
  if (!Number.isInteger(id)) throw new Error(`Invalid employee ID: ${id}`);

  const [existing] = await pool.execute(
    "SELECT employee_id FROM employee WHERE employee_id = ?",
    [id],
  );
  if (existing.length === 0)
    throw new Error(`Employee with ID ${id} not found.`);

  await pool.execute("DELETE FROM employee WHERE employee_id = ?", [id]);
};
