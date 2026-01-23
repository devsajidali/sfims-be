import pool from "../config/db.js";
import {
  createAssignmentSchema,
  updateAssignmentSchema,
  deleteAssignmentSchema,
  pendingApprovalsSchema,
  updateAssignmentStatusSchema,
  assignmentStatusSchema,
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

    // 1️⃣ Check asset availability
    const [assetRows] = await connection.execute(
      `SELECT quantity FROM asset WHERE asset_id = ?`,
      [data.asset_id]
    );

    if (assetRows.length === 0) throw new Error("Asset not found");

    const availableQuantity = assetRows[0].quantity;
    if (availableQuantity <= 0) throw new Error("Asset is out of stock");

    // 2️⃣ Check if employee already has this asset assigned
    const [existingAssignment] = await connection.execute(
      `SELECT * FROM assignment 
       WHERE employee_id = ? AND asset_id = ? AND (return_date IS NULL OR return_date > NOW())`,
      [data.employee_id, data.asset_id]
    );

    if (existingAssignment.length > 0)
      throw new Error("Employee already has this asset assigned");

    // 3️⃣ Insert assignment (always 1 asset per assignment)
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

/**
 * Get approval status for a specific assignment
 */ export const getApprovalStatus = async (assignmentId) => {
  const [rows] = await pool.execute(
    `SELECT aa.approval_id, aa.role, aa.approval_status, aa.remarks, aa.approval_date,
            e.employee_id, e.full_name AS approver_name
       FROM assignment_approval aa
       JOIN employee e ON aa.approver_id = e.employee_id
       WHERE aa.assignment_id = ?`,
    [assignmentId]
  );
  return rows;
};

/**
 * Get pending approvals for an approver
 */
export const getPendingApprovals = async (approverId) => {
  const { error } = pendingApprovalsSchema.validate({
    approverId,
  });

  if (error) throw new Error(formatJoiError(error));
  const [rows] = await pool.execute(
    `SELECT 
        aa.approval_id,
        aa.assignment_id,
        aa.role,
        aa.approval_status,
        a.assignment_date,
        a.status AS assignment_status,
        e.employee_id,
        e.full_name AS requested_by,
        ast.asset_type,
        ast.brand,
        ast.model,
        ast.serial_number
     FROM assignment_approval aa
     JOIN assignment a ON aa.assignment_id = a.assignment_id
     JOIN employee e ON a.employee_id = e.employee_id
     JOIN asset ast ON a.asset_id = ast.asset_id
     WHERE aa.approver_id = ?
       AND aa.approval_status = 'Pending'
     ORDER BY a.assignment_date`,
    [approverId]
  );

  return rows;
};

// Approve or reject assignment
export const approveAssignment = async (body) => {
  const { error } = assignmentStatusSchema.validate({
    ...body,
  });

  if (error) throw new Error(formatJoiError(error));

  const { approver_id, role, approval_status, remarks, assignment_id } = body;
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Check if approval already exists for this role
    const [existing] = await connection.execute(
      `SELECT * FROM assignment_approval WHERE assignment_id = ? AND role = ?`,
      [assignment_id, role]
    );

    console.log(existing);
    return;
    if (existing.approval_status && existing.approval_status === "Approved") {
      throw new Error("Already Approved");
    }

    if (existing.length === 0) {
      await connection.execute(
        `INSERT INTO assignment_approval 
         (assignment_id, approver_id, role, approval_status, remarks, approval_date)
         VALUES (?, ?, ?, ?, ?, NOW())`,
        [assignment_id, approver_id, role, approval_status, remarks || null]
      );
    } else {
      await connection.execute(
        `UPDATE assignment_approval 
         SET approval_status = ?, remarks = ?, approval_date = NOW()
         WHERE assignment_id = ? AND role = ?`,
        [approval_status, remarks || null, assignment_id, role]
      );
    }

    // Determine final assignment status
    const [approvalRows] = await connection.execute(
      `SELECT role, approval_status FROM assignment_approval WHERE assignment_id = ?`,
      [assignment_id]
    );

    let finalStatus = "Pending";

    // Management (CEO/Head) requests → IT only
    // Others → Employee → Team Lead → HR → IT
    const allApproved = approvalRows.every(
      (a) => a.approval_status === "Approved"
    );
    const anyRejected = approvalRows.some(
      (a) => a.approval_status === "Rejected"
    );

    if (anyRejected) finalStatus = "Rejected";
    else if (allApproved) finalStatus = "Approved";

    await connection.execute(
      `UPDATE assignment SET status = ? WHERE assignment_id = ?`,
      [finalStatus, assignment_id]
    );

    await connection.commit();
    return fetchAssignmentWithDetails("WHERE a.assignment_id = ?", [
      assignment_id,
    ]).then((res) => res[0]);
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
};
