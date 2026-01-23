import pool from "../config/db.js";
import {
  createDepartmentSchema,
  deleteDepartmentSchema,
  findAllOptionsSchema,
  updateDepartmentSchema,
} from "../schema/departmentSchema.js";
import { formatJoiError } from "../utils/helpers.js";

// Helper to find department by ID
export const findById = async (id) => {
  // Fetch a single department by its ID
  const [rows] = await pool.execute(
    "SELECT * FROM department WHERE department_id = ?",
    [id],
  );
  return rows[0] || null;
};

// Check if department name already exists (optionally excluding an ID)
export const existsByName = async (department_name, excludeId = null) => {
  let query = "SELECT * FROM department WHERE department_name = ?";
  const params = [department_name];

  if (excludeId) {
    query += " AND department_id != ?";
    params.push(excludeId);
  }

  const [rows] = await pool.execute(query, params);
  return rows.length > 0;
};

// Create a new department
export const create = async (data) => {
  // Validate input
  const { error } = createDepartmentSchema.validate(data);
  if (error) throw new Error(formatJoiError(error));

  // Check for duplicate name
  const duplicate = await existsByName(data.department_name);
  if (duplicate) throw new Error("Department name already exists");

  const [result] = await pool.execute(
    "INSERT INTO department (department_name) VALUES (?)",
    [data.department_name],
  );

  return {
    department_id: result.insertId,
    department_name: data.department_name,
  };
};

// Update a department
export const update = async (data) => {
  // Validate input
  const { error } = updateDepartmentSchema.validate(data);
  if (error) throw new Error(formatJoiError(error));

  // Check if department exists
  const existing = await findById(data.department_id);
  if (!existing) {
    throw new Error(`Department with id ${data.department_id} not found`);
  }

  // Check for duplicate name
  const duplicate = await existsByName(
    data.department_name,
    data.department_id,
  );
  if (duplicate) throw new Error("Department name already exists");

  const [result] = await pool.execute(
    "UPDATE department SET department_name = ? WHERE department_id = ?",
    [data.department_name, data.department_id],
  );

  if (result.affectedRows < 1) {
    throw new Error(
      `Failed to update — department with id ${data.department_id} not found`,
    );
  }

  return {
    department_id: data.department_id,
    department_name: data.department_name,
  };
};

// Remove a department
export const remove = async (departmentId) => {
  // Validate input
  const { error } = deleteDepartmentSchema.validate({
    department_id: departmentId,
  });
  if (error) throw new Error(formatJoiError(error));

  // Check if department exists
  const existing = await findById(departmentId);
  if (!existing) {
    const err = new Error(`Department with id ${departmentId} not found`);
    err.status = 404;
    throw err;
  }

  const [result] = await pool.execute(
    "DELETE FROM department WHERE department_id = ?",
    [departmentId],
  );

  if (result.affectedRows < 1) {
    const err = new Error(
      `Department with id ${departmentId} could not be deleted`,
    );
    err.status = 404;
    throw err;
  }

  return true;
};

// Find all departments with optional search and pagination
export const findAll = async (options = {}) => {
  // Validate input
  const { error } = findAllOptionsSchema.validate(options);
  if (error) {
    throw new Error(formatJoiError(error));
  }

  const { page, limit, search } = options;
  const hasSearch = typeof search === "string" && search.trim().length >= 3;
  const hasPagination = page != null && limit != null;

  // Base where clause
  let whereClause = "";
  const params = [];

  if (hasSearch) {
    whereClause = " WHERE department_name LIKE ?";
    params.push(`%${search.trim()}%`);
  }

  if (hasPagination) {
    // Count total records
    const countSql = `SELECT COUNT(*) as cnt FROM department${whereClause}`;
    const [countRows] = await pool.execute(countSql, params);
    const total = countRows[0].cnt;

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const offset = (pageNum - 1) * limitNum;

    // Fetch paginated records
    const dataSql = `
      SELECT * FROM department
      ${whereClause}
      ORDER BY department_id
      LIMIT ? OFFSET ?
    `;
    const dataParams = params.concat([limitNum, offset]);
    const [rows] = await pool.query(dataSql, dataParams);

    return {
      total_records: total,
      page: parseInt(page),
      limit: parseInt(limit),
      records: rows,
    };
  } else if (hasSearch) {
    // Only search, no pagination
    const dataSql = `
      SELECT * FROM department
      ${whereClause}
      ORDER BY department_id
    `;
    const [rows] = await pool.execute(dataSql, params);
    return rows;
  } else {
    // No pagination or search — return all
    const [rows] = await pool.execute(
      "SELECT * FROM department ORDER BY department_id",
    );
    return rows;
  }
};
