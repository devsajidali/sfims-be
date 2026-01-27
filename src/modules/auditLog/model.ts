import pool from "../../config/db.ts";
import type { AuditLog } from "./types.ts";
import type { RowDataPacket } from "mysql2/promise";

// Get all audit logs
export const findAll = async (): Promise<AuditLog[]> => {
  const [rows] = await pool.execute<RowDataPacket[]>(
    "SELECT * FROM audit_log ORDER BY timestamp DESC",
  );
  return rows as AuditLog[];
};

// Get audit log by ID
export const findById = async (id: number): Promise<AuditLog | null> => {
  const [rows] = await pool.execute<RowDataPacket[]>(
    "SELECT * FROM audit_log WHERE log_id = ?",
    [id],
  );
  return (rows as AuditLog[])[0] || null;
};
