import pool from '../config/db.js';

export const create = async (data) => {
  const [result] = await pool.execute(
    'INSERT INTO assignment (employee_id, asset_id, assignment_date, return_date, remarks) VALUES (?, ?, ?, ?, ?)',
    [data.employee_id, data.asset_id, data.assignment_date, data.return_date, data.remarks]
  );
  return { assignment_id: result.insertId, ...data };
};

export const findAll = async () => {
  const [rows] = await pool.execute('SELECT * FROM assignment');
  return rows;
};

export const findById = async (id) => {
  const [rows] = await pool.execute('SELECT * FROM assignment WHERE assignment_id = ?', [id]);
  return rows[0];
};

export const update = async (id, data) => {
  await pool.execute(
    'UPDATE assignment SET employee_id = ?, asset_id = ?, assignment_date = ?, return_date = ?, remarks = ? WHERE assignment_id = ?',
    [data.employee_id, data.asset_id, data.assignment_date, data.return_date, data.remarks, id]
  );
  return { assignment_id: id, ...data };
};

export const remove = async (id) => {
  await pool.execute('DELETE FROM assignment WHERE assignment_id = ?', [id]);
};
