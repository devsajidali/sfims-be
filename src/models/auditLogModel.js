import pool from "../config/db.js";

export const findAll = async () => {
  const [rows] = await pool.execute(
    "SELECT * FROM audit_log ORDER BY timestamp DESC"
  );
  return rows;
};

export const findById = async (id) => {
  const [rows] = await pool.execute(
    "SELECT * FROM audit_log WHERE log_id = ?",
    [id]
  );
  return rows[0];
};
