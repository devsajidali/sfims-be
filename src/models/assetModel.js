import pool from "../config/db.js";

export const create = async (data) => {
  const [result] = await pool.execute(
    "INSERT INTO asset (asset_type, brand, model, specifications, serial_number, purchase_date, vendor, warranty_expiry, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    [
      data.asset_type,
      data.brand,
      data.model,
      data.specifications,
      data.serial_number,
      data.purchase_date,
      data.vendor,
      data.warranty_expiry,
      data.status,
    ]
  );
  return { asset_id: result.insertId, ...data };
};

export const findAll = async () => {
  const [rows] = await pool.execute("SELECT * FROM asset");
  return rows;
};

export const findById = async (id) => {
  const [rows] = await pool.execute("SELECT * FROM asset WHERE asset_id = ?", [
    id,
  ]);
  return rows[0];
};

export const update = async (id, data) => {
  await pool.execute(
    "UPDATE asset SET asset_type = ?, brand = ?, model = ?, specifications = ?, serial_number = ?, purchase_date = ?, vendor = ?, warranty_expiry = ?, status = ? WHERE asset_id = ?",
    [
      data.asset_type,
      data.brand,
      data.model,
      data.specifications,
      data.serial_number,
      data.purchase_date,
      data.vendor,
      data.warranty_expiry,
      data.status,
      id,
    ]
  );
  return { asset_id: id, ...data };
};

export const remove = async (id) => {
  await pool.execute("DELETE FROM asset WHERE asset_id = ?", [id]);
};
