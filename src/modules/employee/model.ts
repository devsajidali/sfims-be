import pool from "../../config/db.ts";
import { parseCSV, parseXLS, formatJoiError } from "../../utils/helpers.ts";
import { createEmployeeSchema } from "./schema.ts";
import type {
  Employee,
  BulkUploadResult,
  Pagination,
  ServiceResponse,
} from "./types.ts";

type DBRow = Record<string, any>;

/**
 * Get all employees with optional pagination
 */
export const findAll = async ({ page, limit }: Pagination = {}): Promise<
  ServiceResponse<Employee>
> => {
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
    const l = parseInt(limit.toString(), 10);
    const offset = (parseInt(page.toString(), 10) - 1) * l;
    const [countRows]: any = await pool.query(
      "SELECT COUNT(*) AS total FROM employee",
    );
    const total: any = countRows[0].total;

    sql += ` LIMIT ${l} OFFSET ${offset}`;
    const [rows] = await pool.query(sql);
    return { records: rows as Employee[], total_records: total };
  }

  const [rows] = await pool.query(sql);
  return { records: rows as Employee[] };
};

/**
 * Get a single employee by ID
 */
export const findById = async (id: number): Promise<Employee> => {
  if (!Number.isInteger(id)) throw new Error(`Invalid employee ID: ${id}`);

  const [rows] = await pool.execute(
    "SELECT * FROM employee WHERE employee_id = ?",
    [id],
  );
  const employeeRows = rows as DBRow[];
  if (employeeRows.length === 0)
    throw new Error(`Employee with ID ${id} not found.`);

  const [projects] = await pool.execute(
    "SELECT project_id FROM employee_project WHERE employee_id = ?",
    [id],
  );
  const projectIds: number[] = (projects as DBRow[]).map((p) => p.project_id);

  const [team] = await pool.execute(
    `SELECT t.team_id, t.team_name 
     FROM employee_team et 
     JOIN team t ON et.team_id = t.team_id 
     WHERE et.employee_id = ?`,
    [id],
  );
  const teamObj: any | null = (team as DBRow[])[0] || null;

  return {
    ...(employeeRows[0] as Employee),
    project_ids: projectIds,
    team: teamObj,
  };
};

/**
 * Get all team members under a specific team lead
 */
export const findAllTeamMembers = async (
  teamLeadId: number,
): Promise<Employee[]> => {
  if (!Number.isInteger(teamLeadId))
    throw new Error(`Invalid team lead ID: ${teamLeadId}`);

  const [teamLeadResult] = await pool.execute(
    "SELECT department_id FROM team_lead WHERE employee_id = ?",
    [teamLeadId],
  );
  const leadRows = teamLeadResult as DBRow[];
  if (leadRows.length === 0)
    throw new Error(`Team lead with ID ${teamLeadId} not found.`);

  const departmentId = leadRows[0].department_id;

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

  if ((teamMembers as DBRow[]).length === 0)
    throw new Error(
      `No employees found in department with ID ${departmentId}.`,
    );

  return teamMembers as Employee[];
};

/**
 * Process bulk file upload (CSV/XLS/XLSX)
 */
export const processBulkFile = async (
  file: any,
  department_id: number,
  project_ids: number[] = [],
): Promise<BulkUploadResult> => {
  let rows: any = [];
  if (file.mimetype.includes("csv")) rows = await parseCSV(file.buffer);
  else rows = parseXLS(file.buffer);

  const errors: { row: number; error: string }[] = [];
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
      if ((dupe as DBRow[]).length > 0) {
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

      const employeeId = (result as any).insertId;

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
export const create = async (data: Employee): Promise<Employee> => {
  const { error, value } = createEmployeeSchema.validate(data, {
    abortEarly: false,
  });
  if (error) throw new Error(formatJoiError(error));

  const connection = await pool.getConnection();
  const isUpperManagement = ["CEO"].includes(data.group?.[0] ?? "");

  try {
    await connection.beginTransaction();

    // Duplicate email check
    const [existing] = await connection.execute(
      "SELECT employee_id FROM employee WHERE email = ?",
      [value.email],
    );
    if ((existing as DBRow[]).length > 0) {
      const err = new Error("Employee with this email already exists");
      (err as any).code = "DUPLICATE_EMPLOYEE";
      throw err;
    }

    // Find department & team
    let departmentId: number | null = null;
    let teamId: number | null = null;

    for (const item of value.group || []) {
      if (!departmentId) {
        const [dept] = await connection.execute(
          "SELECT department_id FROM department WHERE department_name = ?",
          [item],
        );
        if ((dept as DBRow[])[0])
          departmentId = (dept as DBRow[])[0].department_id;
      }
      if (departmentId && !teamId) {
        const [team] = await connection.execute(
          "SELECT team_id FROM team WHERE team_name = ?",
          [item],
        );
        if ((team as DBRow[])[0]) teamId = (team as DBRow[])[0].team_id;
      }
    }

    if (!departmentId)
      throw Object.assign(new Error("Invalid department"), {
        code: "INVALID_DEPARTMENT",
      });
    if (!teamId && !isUpperManagement)
      throw Object.assign(new Error("Invalid team"), { code: "INVALID_TEAM" });

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

    const employeeId = (result as any).insertId;

    if (teamId) {
      await connection.execute(
        "INSERT INTO employee_team (employee_id, team_id) VALUES (?, ?)",
        [employeeId, teamId],
      );
    }

    await connection.commit();

    return {
      employee_id: employeeId,
      department_id: departmentId,
      team_id: teamId,
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
export const update = async (data: Employee): Promise<ServiceResponse> => {
  if (!data.employee_id) throw new Error("Invalid employee_id");
  const id = data.employee_id;
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [existing] = await connection.execute(
      "SELECT * FROM employee WHERE employee_id = ?",
      [id],
    );
    if ((existing as DBRow[]).length === 0)
      throw new Error(`Employee with ID ${id} not found.`);

    const fields: string[] = [];
    const values: any[] = [];

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

    let departmentId: number | null = null;
    let teamId: number | null = null;

    if (Array.isArray(data.group)) {
      for (const item of data.group) {
        if (!departmentId) {
          const [dept] = await connection.execute(
            "SELECT department_id FROM department WHERE department_name = ?",
            [item],
          );
          if ((dept as DBRow[])[0])
            departmentId = (dept as DBRow[])[0].department_id;
        }
        if (departmentId && !teamId) {
          const [team] = await connection.execute(
            "SELECT team_id FROM team WHERE team_name = ? AND department_id = ?",
            [item, departmentId],
          );
          if ((team as DBRow[])[0]) teamId = (team as DBRow[])[0].team_id;
        }
      }
      if (!departmentId)
        throw Object.assign(new Error("Invalid department"), {
          code: "INVALID_DEPARTMENT",
        });
      if (!teamId)
        throw Object.assign(new Error("Invalid team"), {
          code: "INVALID_TEAM",
        });

      fields.push("department_id = ?");
      values.push(departmentId);
    }

    if (fields.length > 0) {
      const sql = `UPDATE employee SET ${fields.join(", ")} WHERE employee_id = ?`;
      values.push(id);
      await connection.execute(sql, values);
    }

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
      title: "success",
      message: "Employee profile updated successfully",
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
export const remove = async (id: number): Promise<void> => {
  if (!Number.isInteger(id)) throw new Error(`Invalid employee ID: ${id}`);
  const [existing] = await pool.execute(
    "SELECT employee_id FROM employee WHERE employee_id = ?",
    [id],
  );
  if ((existing as DBRow[]).length === 0)
    throw new Error(`Employee with ID ${id} not found.`);
  await pool.execute("DELETE FROM employee WHERE employee_id = ?", [id]);
};
