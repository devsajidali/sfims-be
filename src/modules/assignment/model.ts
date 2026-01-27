import pool from "../../config/db.ts";
import {
  createAssignmentRequestSchema,
  approveAssignmentRequestSchema,
} from "./schema.ts";
import { formatJoiError } from "../../utils/helpers.ts";

import type {
  CreateAssignmentPayload,
  UpdateApprovalPayload,
  CreateAssignmentResponse,
  MessageResponse,
  GetAllRequestsFilter,
  PendingApprovalRow,
  EmployeeAssetRow,
  AssetRequestRow,
} from "./types.ts";

/**
 * CREATE ASSET REQUEST
 * Employee → TeamLead → IT
 * Management → IT
 */
export const create = async (
  data: CreateAssignmentPayload,
): Promise<CreateAssignmentResponse> => {
  const { error } = createAssignmentRequestSchema.validate(data);
  if (error) throw new Error(formatJoiError(error));

  const { requester_id, asset_id, request_type } = data;
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // 1️⃣ Employee exists
    const [empRows]: any[] = await connection.execute(
      "SELECT role FROM employee WHERE employee_id = ?",
      [requester_id],
    );
    if (!empRows.length) throw new Error("Employee not found");

    // 2️⃣ Employee validations (only for Employee type)
    if (request_type === "Employee") {
      const [team]: any[] = await connection.execute(
        "SELECT * FROM employee_team WHERE employee_id = ?",
        [requester_id],
      );
      if (!team.length) throw new Error("Employee must be assigned to a team");

      const [project]: any[] = await connection.execute(
        "SELECT * FROM employee_project WHERE employee_id = ?",
        [requester_id],
      );
      if (!project.length)
        throw new Error("Employee must be assigned to a project");

      const [leadRows]: any[] = await connection.execute(
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
    const [pendingReq]: any[] = await connection.execute(
      `SELECT request_id FROM asset_request
       WHERE requester_id = ? AND asset_id = ? AND request_status = 'Pending'`,
      [requester_id, asset_id],
    );
    if (pendingReq.length)
      throw new Error("A pending request for this asset already exists");

    // 4️⃣ Asset availability (lock row for update)
    const [asset]: any[] = await connection.execute(
      "SELECT quantity FROM asset WHERE asset_id = ? FOR UPDATE",
      [asset_id],
    );
    if (!asset.length) throw new Error("Asset not found");
    if (asset[0].quantity <= 0) throw new Error("Asset out of stock");

    // 5️⃣ Create asset request
    const [result]: any = await connection.execute(
      `INSERT INTO asset_request (requester_id, asset_id, request_type)
       VALUES (?, ?, ?)`,
      [requester_id, asset_id, request_type],
    );
    const requestId: number = result.insertId;

    // 6️⃣ Team Lead approval (only for Employee requests)
    if (request_type === "Employee") {
      const [leadRows]: any[] = await connection.execute(
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
    const [itRows]: any[] = await connection.execute(
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
export const issueAsset = async (
  request_id: number,
): Promise<MessageResponse> => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [[req]]: any = await connection.execute(
      `SELECT requester_id, asset_id
       FROM asset_request
       WHERE request_id = ? AND request_status='Approved'
       FOR UPDATE`,
      [request_id],
    );
    if (!req) throw new Error("Request not approved");

    const [asset]: any[] = await connection.execute(
      "SELECT quantity FROM asset WHERE asset_id = ? FOR UPDATE",
      [req.asset_id],
    );
    if (!asset.length) throw new Error("Asset not found");
    if (asset[0].quantity <= 0) throw new Error("Insufficient asset quantity");

    await connection.execute(
      `INSERT INTO asset_issue
       (request_id, asset_id, employee_id, issue_date, quantity_issued)
       VALUES (?, ?, ?, CURDATE(), 1)`,
      [request_id, req.asset_id, req.requester_id],
    );

    const [updateResult]: any = await connection.execute(
      "UPDATE asset SET quantity = quantity - 1 WHERE asset_id = ?",
      [req.asset_id],
    );
    if (updateResult.affectedRows === 0)
      throw new Error("Failed to decrement asset quantity");

    await connection.execute(
      "UPDATE asset_request SET request_status='Issued' WHERE request_id=?",
      [request_id],
    );

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
export const updateStatus = async (
  data: UpdateApprovalPayload,
): Promise<MessageResponse> => {
  const { error } = approveAssignmentRequestSchema.validate(data);
  if (error) throw new Error(formatJoiError(error));

  const { request_id, approver_id, approval_level, approval_status, remarks } =
    data;

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

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

    await connection.execute(
      `INSERT INTO audit_log (action_type, request_id, performed_by)
       VALUES (?, ?, ?)`,
      [
        approval_status === "Approved" ? "Approve" : "Reject",
        request_id,
        approver_id,
      ],
    );

    const [approvals]: any[] = await connection.execute(
      "SELECT approval_status FROM asset_request_approval WHERE request_id = ?",
      [request_id],
    );

    const rejected = approvals.some(
      (a: any) => a.approval_status === "Rejected",
    );
    const approved = approvals.every(
      (a: any) => a.approval_status === "Approved",
    );

    if (rejected) {
      await connection.execute(
        "UPDATE asset_request SET request_status='Rejected' WHERE request_id=?",
        [request_id],
      );
    }

    if (approved) {
      await connection.execute(
        "UPDATE asset_request SET request_status='Approved' WHERE request_id=?",
        [request_id],
      );

      const [[req]]: any = await connection.execute(
        `SELECT requester_id, asset_id
         FROM asset_request
         WHERE request_id = ? AND request_status='Approved'
         FOR UPDATE`,
        [request_id],
      );
      if (!req) throw new Error("Approved request not found");

      const [assetRows]: any[] = await connection.execute(
        "SELECT quantity FROM asset WHERE asset_id = ? FOR UPDATE",
        [req.asset_id],
      );
      if (!assetRows.length) throw new Error("Asset not found");
      if (assetRows[0].quantity <= 0)
        throw new Error("Insufficient asset quantity");

      await connection.execute(
        `INSERT INTO asset_issue
         (request_id, asset_id, employee_id, issue_date, quantity_issued)
         VALUES (?, ?, ?, CURDATE(), 1)`,
        [request_id, req.asset_id, req.requester_id],
      );

      await connection.execute(
        "UPDATE asset SET quantity = quantity - 1 WHERE asset_id = ?",
        [req.asset_id],
      );

      await connection.execute(
        "UPDATE asset_request SET request_status='Issued' WHERE request_id=?",
        [request_id],
      );

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
 * Get all requests
 */
export const getAllRequests = async (
  filters: GetAllRequestsFilter = {},
): Promise<AssetRequestRow[]> => {
  const params: any[] = [];
  let where = "WHERE 1=1";

  if (filters.status) {
    where += " AND ar.request_status = ?";
    params.push(filters.status);
  }

  if (filters.requester_id) {
    where += " AND ar.requester_id = ?";
    params.push(filters.requester_id);
  }

  const [rows]: any = await pool.execute(
    `SELECT ar.*, e.full_name AS requester_name,
            ast.asset_type, ast.brand, ast.model, ast.serial_number
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
 * Get pending approvals
 */
export const getPendingApprovals = async (
  approver_id: number,
): Promise<PendingApprovalRow[]> => {
  if (!approver_id) throw new Error("Approver ID required");

  const [[approver]]: any = await pool.execute(
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

  const params: any[] = [approver_id];

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

  const [rows]: any = await pool.execute(query, params);
  return rows;
};

/**
 * Get employee assets
 */
export const getEmployeeAssets = async (
  employee_id: number,
  status?: string,
): Promise<EmployeeAssetRow[]> => {
  if (!employee_id) throw new Error("Employee ID required");

  const params: any[] = [employee_id];
  let where = "ar.requester_id = ?";

  if (status) {
    where += " AND ar.request_status = ?";
    params.push(status);
  }

  const [rows]: any = await pool.execute(
    `SELECT ar.*, ast.asset_type, ast.brand, ast.model, ast.serial_number
     FROM asset_request ar
     JOIN asset ast ON ar.asset_id = ast.asset_id
     WHERE ${where}
     ORDER BY ar.request_date DESC`,
    params,
  );

  return rows;
};
