import pool from "../config/db.js";
import {
  createAssignmentSchema,
  updateAssignmentSchema,
  deleteAssignmentSchema,
  updateAssignmentStatusSchema,
} from "../schema/assignmentSchema.js";
import { formatJoiError } from "../utils/helpers.js";

/**
 * Helper function to fetch assignments with full employee and asset details
 */
const fetchAssignmentWithDetails = async (whereClause = "", params = []) => {
  const [rows] = await pool.execute(
    `SELECT 
       a.assignment_id,
       a.assignment_date,
       a.return_date,
       a.remarks,
       a.status,
       e.employee_id,
       e.full_name AS employee_name,
       e.designation AS employee_role,
       IFNULL(JSON_ARRAYAGG(JSON_OBJECT(
          'asset_id', ast.asset_id,
          'asset_type', ast.asset_type,
          'brand', ast.brand,
          'model', ast.model,
          'specifications', ast.specifications,
          'serial_number', ast.serial_number,
          'purchase_date', ast.purchase_date,
          'vendor', ast.vendor,
          'warranty_expiry', ast.warranty_expiry,
          'status', ast.status,
          'quantity', ast.quantity
       )), JSON_ARRAY()) AS assets
     FROM assignment a
     JOIN employee e ON a.employee_id = e.employee_id
     JOIN asset ast ON a.asset_id = ast.asset_id
     ${whereClause}
     GROUP BY a.assignment_id, e.employee_id
    `,
    params
  );

  return rows.map((row) => ({
    assignment_id: row.assignment_id,
    assignment_date: row.assignment_date,
    return_date: row.return_date,
    remarks: row.remarks,
    status: row.status,
    employee: {
      employee_id: row.employee_id,
      name: row.employee_name,
      role: row.employee_role,
    },
    assets: Array.isArray(row.assets)
      ? row.assets
      : JSON.parse(row.assets || "[]"),
  }));
};

/**
 * Create a new assignment
 */
export const create = async (data) => {
  // Validate input
  const { error } = createAssignmentSchema.validate(data);
  if (error) throw new Error(formatJoiError(error));

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 1️⃣ Check if asset quantity is available
    const [assetRows] = await connection.execute(
      `SELECT quantity FROM asset WHERE asset_id = ?`,
      [data.asset_id]
    );

    if (assetRows.length === 0) throw new Error("Asset not found");
    if (assetRows[0].quantity <= 0) throw new Error("Asset is out of stock");

    // 2️⃣ Check if employee already has this asset assigned and not returned
    const [existingAssignment] = await connection.execute(
      `SELECT * FROM assignment 
       WHERE employee_id = ? AND asset_id = ? AND (return_date IS NULL OR return_date > NOW())`,
      [data.employee_id, data.asset_id]
    );

    if (existingAssignment.length > 0)
      throw new Error("Employee already has this asset assigned");

    // 3️⃣ Insert assignment
    const [result] = await connection.execute(
      `INSERT INTO assignment 
       (employee_id, asset_id, assignment_date, return_date, remarks, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        data.employee_id,
        data.asset_id,
        data.assignment_date,
        data.return_date,
        data.remarks,
        data.status || "assigned",
      ]
    );

    // 4️⃣ Decrease asset quantity
    await connection.execute(
      `UPDATE asset SET quantity = quantity - 1 WHERE asset_id = ?`,
      [data.asset_id]
    );

    await connection.commit();

    // 5️⃣ Return full assignment details
    return fetchAssignmentWithDetails("WHERE a.assignment_id = ?", [
      result.insertId,
    ]).then((res) => res[0]);
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
};

/**
 * Get all assignments
 */
export const findAll = async () => {
  return fetchAssignmentWithDetails();
};

/**
 * Get assignment by ID
 */
export const findById = async (id) => {
  const results = await fetchAssignmentWithDetails(
    "WHERE a.assignment_id = ?",
    [id]
  );
  return results[0] || null;
};

/**
 * Get assignments by employee ID
 */
export const findByEmployeeId = async (employeeId) => {
  return fetchAssignmentWithDetails("WHERE a.employee_id = ?", [employeeId]);
};

/**
 * Update an assignment
 */
export const update = async (id, data) => {
  const { error } = updateAssignmentSchema.validate({
    assignment_id: id,
    ...data,
  });
  if (error) throw new Error(formatJoiError(error));

  await pool.execute(
    `UPDATE assignment 
     SET employee_id = ?, asset_id = ?, assignment_date = ?, return_date = ?, remarks = ?, status = ?
     WHERE assignment_id = ?`,
    [
      data.employee_id,
      data.asset_id,
      data.assignment_date,
      data.return_date,
      data.remarks,
      data.status,
      id,
    ]
  );

  return fetchAssignmentWithDetails("WHERE a.assignment_id = ?", [id]).then(
    (res) => res[0]
  );
};

/**
 * Delete an assignment
 */
export const remove = async (id) => {
  const { error } = deleteAssignmentSchema.validate({ assignment_id: id });
  if (error) throw new Error(formatJoiError(error));

  await pool.execute("DELETE FROM assignment WHERE assignment_id = ?", [id]);
  return { message: "Assignment deleted successfully" };
};

/**
 * Update assignment status
 */
export const updateStatus = async (id, status) => {
  const { error } = updateAssignmentStatusSchema.validate({
    assignment_id: id,
    status,
  });
  if (error) throw new Error(formatJoiError(error));

  await pool.execute(
    "UPDATE assignment SET status = ? WHERE assignment_id = ?",
    [status, id]
  );

  return fetchAssignmentWithDetails("WHERE a.assignment_id = ?", [id]).then(
    (res) => res[0]
  );
};
