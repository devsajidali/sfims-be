import pool from "../config/db.js";
import { parseCSV, parseXLS } from "../utils/helpers.js";

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
      e.project_id,
      p.project_name
    FROM employee e
    LEFT JOIN department d ON e.department_id = d.department_id
    LEFT JOIN project p ON e.project_id = p.project_id
  `;

  // If pagination params are provided
  if (page != null && limit != null) {
    const l = parseInt(limit, 10);
    const offset = (parseInt(page, 10) - 1) * l;

    // Get total count
    const [countRows] = await pool.query(
      `SELECT COUNT(*) AS total FROM employee`
    );
    const total = countRows[0].total;

    // Add LIMIT/OFFSET
    sql += ` LIMIT ${l} OFFSET ${offset}`;
    const [rows] = await pool.query(sql);

    return { records: rows, total_records: total };
  }

  // If no pagination: return all rows as array
  const [rows] = await pool.query(sql);
  return rows;
};

export const findById = async (id) => {
  const [rows] = await pool.execute(
    "SELECT * FROM employee WHERE employee_id = ?",
    [id]
  );
  return rows[0];
};

export const findAllTeamMembers = async (teamLeadId) => {
  try {
    // Step 1: Get the department_id for the given team lead
    const [teamLeadResult] = await pool.execute(
      "SELECT department_id FROM team_lead WHERE employee_id = ?",
      [teamLeadId]
    );

    // If the team lead doesn't exist, throw an error with a descriptive message
    if (teamLeadResult.length === 0) {
      throw new Error(`Team lead with ID ${teamLeadId} not found.`);
    }

    const departmentId = teamLeadResult[0].department_id;

    // Step 2: Find all employees in the same department, including the team lead
    const [teamMembers] = await pool.execute(
      `SELECT 
        e.employee_id, 
        e.first_name, 
        e.last_name, 
        e.designation, 
        e.email, 
        e.contact_number, 
        d.department_name, 
        p.project_name 
      FROM employee e
      LEFT JOIN department d ON e.department_id = d.department_id
      LEFT JOIN project p ON e.project_id = p.project_id
      WHERE e.department_id = ?`,
      [departmentId]
    );

    // If no employees are found in the department, throw an error
    if (teamMembers.length === 0) {
      throw new Error(
        `No employees found in department with ID ${departmentId}.`
      );
    }

    return teamMembers; // Return all employees in the department, including the team lead
  } catch (error) {
    // Rethrow the error with a custom message
    throw new Error(error.message);
  }
};

// MAIN BULK UPLOAD PROCESSOR
export const processBulkFile = async (file, department_id, project_id) => {
  let rows = [];

  // Detect file type
  if (file.mimetype.includes("csv")) {
    rows = await parseCSV(file.buffer);
  } else {
    rows = parseXLS(file.buffer);
  }

  const errors = [];
  let inserted = 0;

  for (let i = 0; i < rows.length; i++) {
    const emp = rows[i];

    // BASIC VALIDATION
    if (!emp.first_name || !emp.last_name || !emp.email) {
      errors.push({ row: i + 1, error: "Missing required fields" });
      continue;
    }

    // Validate email
    if (!/\S+@\S+\.\S+/.test(emp.email)) {
      errors.push({ row: i + 1, error: "Invalid email format" });
      continue;
    }

    // Check duplicate email
    const [dupe] = await pool.execute(
      "SELECT employee_id FROM employee WHERE email = ?",
      [emp.email]
    );

    if (dupe.length > 0) {
      errors.push({ row: i + 1, error: "Email already exists" });
      continue;
    }

    // INSERT INTO DB (department_id & project_id come from FE)
    await pool.execute(
      `INSERT INTO employee 
        (first_name, last_name, designation, email, contact_number, department_id, project_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        emp.first_name,
        emp.last_name,
        emp.designation || null,
        emp.email,
        emp.contact_number || null,
        department_id,
        project_id,
      ]
    );

    inserted++;
  }

  return {
    total_rows: rows.length,
    inserted,
    errors,
  };
};

export const create = async (data) => {
  const [result] = await pool.execute(
    `INSERT INTO employee 
      (first_name, last_name, designation, department_id, email, contact_number, project_id) 
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      data.first_name,
      data.last_name,
      data.designation,
      data.department_id,
      data.email,
      data.contact_number,
      data.project_id,
    ]
  );

  return { employee_id: result.insertId, ...data };
};


export const update = async (id, data) => {
  await pool.execute(
    "UPDATE employee SET name = ?, designation = ?, department = ?, email = ?, contact_number = ?, project_id = ? WHERE employee_id = ?",
    [
      data.name,
      data.designation,
      data.department,
      data.email,
      data.contact_number,
      data.project_id,
      id,
    ]
  );
  return { employee_id: id, ...data };
};

export const remove = async (id) => {
  await pool.execute("DELETE FROM employee WHERE employee_id = ?", [id]);
};
