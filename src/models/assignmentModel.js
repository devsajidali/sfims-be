import pool from "../config/db.js";
import {
  createAssetRequestSchema,
  approveAssetRequestSchema,
} from "../schema/assignmentSchema.js";
import { formatJoiError } from "../utils/helpers.js";

/**
 * CREATE ASSET REQUEST
 * Employee → TeamLead → IT
 * Management → IT
 */
export const create = async (data) => {
  const { error } = createAssetRequestSchema.validate(data);
  if (error) throw new Error(formatJoiError(error));

  const { requester_id, asset_id, request_type } = data;
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // 1️⃣ Employee exists
    const [empRows] = await connection.execute(
      "SELECT role FROM employee WHERE employee_id = ?",
      [requester_id],
    );
    if (!empRows.length) throw new Error("Employee not found");

    // 2️⃣ Employee validations (only for Employee type)
    if (request_type === "Employee") {
      const [team] = await connection.execute(
        "SELECT * FROM employee_team WHERE employee_id = ?",
        [requester_id],
      );
      if (!team.length) throw new Error("Employee must be assigned to a team");

      const [project] = await connection.execute(
        "SELECT * FROM employee_project WHERE employee_id = ?",
        [requester_id],
      );
      if (!project.length)
        throw new Error("Employee must be assigned to a project");

      const [leadRows] = await connection.execute(
        `SELECT tl.employee_id
         FROM team_lead tl
         JOIN employee_team et ON et.team_id = tl.team_id
         WHERE et.employee_id = ? AND tl.status = 'Active'
         LIMIT 1`,
        [requester_id],
      );
      if (!leadRows.length)
        throw new Error("No active Team Lead found for employee");
    }

    // 3️⃣ Prevent duplicate pending request
    const [pendingReq] = await connection.execute(
      `SELECT request_id FROM asset_request
       WHERE requester_id = ? AND asset_id = ? AND request_status = 'Pending'`,
      [requester_id, asset_id],
    );
    if (pendingReq.length)
      throw new Error("A pending request for this asset already exists");

    // 4️⃣ Asset availability (lock row for update)
    const [asset] = await connection.execute(
      "SELECT quantity FROM asset WHERE asset_id = ? FOR UPDATE",
      [asset_id],
    );
    if (!asset.length) throw new Error("Asset not found");
    if (asset[0].quantity <= 0) throw new Error("Asset out of stock");

    // 5️⃣ Create asset request
    const [result] = await connection.execute(
      `INSERT INTO asset_request (requester_id, asset_id, request_type)
       VALUES (?, ?, ?)`,
      [requester_id, asset_id, request_type],
    );
    const requestId = result.insertId;

    // 6️⃣ Team Lead approval (only for Employee requests)
    if (request_type === "Employee") {
      const [leadRows] = await connection.execute(
        `SELECT tl.employee_id
         FROM team_lead tl
         JOIN employee_team et ON et.team_id = tl.team_id
         WHERE et.employee_id = ? AND tl.status = 'Active'
         LIMIT 1`,
        [requester_id],
      );

      await connection.execute(
        `INSERT INTO asset_request_approval
         (request_id, approver_id, approval_level)
         VALUES (?, ?, 'TeamLead')`,
        [requestId, leadRows[0].employee_id],
      );
    }

    // 7️⃣ IT approval (always)
    const [itRows] = await connection.execute(
      `SELECT employee_id FROM employee WHERE department_id = 3 LIMIT 1`,
    );
    if (!itRows.length) throw new Error("No IT approver found");

    await connection.execute(
      `INSERT INTO asset_request_approval
       (request_id, approver_id, approval_level)
       VALUES (?, ?, 'IT')`,
      [requestId, itRows[0].employee_id],
    );

    // 8️⃣ Audit log
    await connection.execute(
      `INSERT INTO audit_log (action_type, request_id, performed_by)
       VALUES ('Request', ?, ?)`,
      [requestId, requester_id],
    );

    await connection.commit();
    return {
      message: "Asset request created successfully",
      request_id: requestId,
    };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
};

// Issue Asset (FINAL STEP)
export const issueAsset = async (request_id) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 1️⃣ Fetch approved request
    const [[req]] = await connection.execute(
      `SELECT requester_id, asset_id
       FROM asset_request
       WHERE request_id = ? AND request_status='Approved'
       FOR UPDATE`,
      [request_id],
    );
    if (!req) throw new Error("Request not approved");

    // 2️⃣ Fetch and lock asset
    const [asset] = await connection.execute(
      "SELECT quantity FROM asset WHERE asset_id = ? FOR UPDATE",
      [req.asset_id],
    );
    if (!asset.length) throw new Error("Asset not found");
    if (asset[0].quantity <= 0) throw new Error("Insufficient asset quantity");

    // 3️⃣ Issue the asset
    await connection.execute(
      `INSERT INTO asset_issue
       (request_id, asset_id, employee_id, issue_date, quantity_issued)
       VALUES (?, ?, ?, CURDATE(), 1)`,
      [request_id, req.asset_id, req.requester_id],
    );

    // 4️⃣ Decrement asset quantity
    const [updateResult] = await connection.execute(
      "UPDATE asset SET quantity = quantity - 1 WHERE asset_id = ?",
      [req.asset_id],
    );
    if (updateResult.affectedRows === 0) {
      throw new Error("Failed to decrement asset quantity");
    }

    // 5️⃣ Update request status to 'Issued'
    await connection.execute(
      "UPDATE asset_request SET request_status='Issued' WHERE request_id=?",
      [request_id],
    );

    // 6️⃣ Audit log
    await connection.execute(
      `INSERT INTO audit_log (action_type, request_id, performed_by)
       VALUES ('Issue', ?, ?)`,
      [request_id, req.requester_id],
    );

    await connection.commit();
    return { message: "Asset issued successfully" };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
};

// Approval + Final Issue Logic
export const updateStatus = async (data) => {
  const { error } = approveAssetRequestSchema.validate(data);
  if (error) throw new Error(formatJoiError(error));

  const { request_id, approver_id, approval_level, approval_status, remarks } =
    data;

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 1️⃣ Update approval record
    await connection.execute(
      `UPDATE asset_request_approval
       SET approval_status = ?, remarks = ?, approval_date = NOW()
       WHERE request_id = ? AND approver_id = ? AND approval_level = ?`,
      [
        approval_status,
        remarks || null,
        request_id,
        approver_id,
        approval_level,
      ],
    );

    // 2️⃣ Audit log for approval/rejection
    await connection.execute(
      `INSERT INTO audit_log (action_type, request_id, performed_by)
       VALUES (?, ?, ?)`,
      [
        approval_status === "Approved" ? "Approve" : "Reject",
        request_id,
        approver_id,
      ],
    );

    // 3️⃣ Check all approvals
    const [approvals] = await connection.execute(
      "SELECT approval_status FROM asset_request_approval WHERE request_id = ?",
      [request_id],
    );

    const rejected = approvals.some((a) => a.approval_status === "Rejected");
    const approved = approvals.every((a) => a.approval_status === "Approved");

    if (rejected) {
      await connection.execute(
        "UPDATE asset_request SET request_status='Rejected' WHERE request_id=?",
        [request_id],
      );
    }

    if (approved) {
      // 4️⃣ Mark request as approved
      await connection.execute(
        "UPDATE asset_request SET request_status='Approved' WHERE request_id=?",
        [request_id],
      );

      // 5️⃣ Fetch the approved request and lock it
      const [[req]] = await connection.execute(
        `SELECT requester_id, asset_id
         FROM asset_request
         WHERE request_id = ? AND request_status='Approved'
         FOR UPDATE`,
        [request_id],
      );
      if (!req) throw new Error("Approved request not found");

      // 6️⃣ Fetch and lock the asset row
      const [assetRows] = await connection.execute(
        "SELECT quantity FROM asset WHERE asset_id = ? FOR UPDATE",
        [req.asset_id],
      );
      if (!assetRows.length) throw new Error("Asset not found");
      if (assetRows[0].quantity <= 0)
        throw new Error("Insufficient asset quantity");

      // 7️⃣ Issue asset (record issuance)
      await connection.execute(
        `INSERT INTO asset_issue
         (request_id, asset_id, employee_id, issue_date, quantity_issued)
         VALUES (?, ?, ?, CURDATE(), 1)`,
        [request_id, req.asset_id, req.requester_id],
      );

      // 8️⃣ Decrement actual asset quantity
      await connection.execute(
        "UPDATE asset SET quantity = quantity - 1 WHERE asset_id = ?",
        [req.asset_id],
      );

      // 9️⃣ Update request status to 'Issued'
      await connection.execute(
        "UPDATE asset_request SET request_status='Issued' WHERE request_id=?",
        [request_id],
      );

      // 🔟 Audit log for issue
      await connection.execute(
        `INSERT INTO audit_log (action_type, request_id, performed_by)
         VALUES ('Issue', ?, ?)`,
        [request_id, req.requester_id],
      );
    }

    await connection.commit();
    return { message: "Approval updated and asset issued" };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
};

/**
 * Get all requests (Admin/HR) with optional filters: status, requester_id
 */
export const getAllRequests = async (filters = {}) => {
  const params = [];
  let where = "WHERE 1=1";

  if (filters.status) {
    where += " AND ar.request_status = ?";
    params.push(filters.status);
  }

  if (filters.requester_id) {
    where += " AND ar.requester_id = ?";
    params.push(filters.requester_id);
  }

  const [rows] = await pool.execute(
    `SELECT ar.*, e.full_name AS requester_name, ast.asset_type, ast.brand, ast.model, ast.serial_number
     FROM asset_request ar
     JOIN employee e ON ar.requester_id = e.employee_id
     JOIN asset ast ON ar.asset_id = ast.asset_id
     ${where}
     ORDER BY ar.request_date DESC`,
    params,
  );
  return rows;
};

/**
 * Get pending approvals (Team Lead / IT)
 */
export const getPendingApprovals = async (approver_id) => {
  if (!approver_id) throw new Error("Approver ID required");

  // Fetch the level of the approver
  const [[approver]] = await pool.execute(
    "SELECT role, department_id FROM employee WHERE employee_id = ?",
    [approver_id],
  );
  if (!approver) throw new Error("Approver not found");

  let query = `
    SELECT ar.request_id, ar.requester_id, ar.asset_id, ar.request_type,
           ar.request_status, ar.request_date,
           e.full_name AS requester_name,
           ast.asset_type, ast.brand, ast.model, ast.serial_number,
           ara.approval_level
    FROM asset_request ar
    JOIN asset_request_approval ara ON ar.request_id = ara.request_id
    JOIN employee e ON ar.requester_id = e.employee_id
    JOIN asset ast ON ar.asset_id = ast.asset_id
    WHERE ara.approver_id = ? AND ara.approval_status = 'Pending'
  `;
  const params = [approver_id];

  // If IT, hide Employee requests still pending with Team Lead
  if (approver.department_id === 3) {
    query += `
      AND (
        ar.request_type = 'Management'
        OR NOT EXISTS (
          SELECT 1
          FROM asset_request_approval t
          WHERE t.request_id = ar.request_id
            AND t.approval_level = 'TeamLead'
            AND t.approval_status = 'Pending'
        )
      )
    `;
  }

  query += " ORDER BY ar.request_date DESC";

  const [rows] = await pool.execute(query, params);
  return rows;
};

/**
 * Get employee's assigned assets and status
 */
export const getEmployeeAssets = async (employee_id, status) => {
  console.log(employee_id, status);
  if (!employee_id) throw new Error("Employee ID required");

  const params = [employee_id];
  let where = "ar.requester_id = ?";

  if (status) {
    where += " AND ar.request_status = ?";
    params.push(status); // 'Pending', 'Approved', 'Issued', etc.
  }

  const [rows] = await pool.execute(
    `SELECT ar.*, ast.asset_type, ast.brand, ast.model, ast.serial_number
     FROM asset_request ar
     JOIN asset ast ON ar.asset_id = ast.asset_id
     WHERE ${where}
     ORDER BY ar.request_date DESC`,
    params,
  );

  return rows;
};
