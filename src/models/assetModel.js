import pool from "../config/db.js";
import {
  createAssetSchema,
  updateAssetSchema,
  deleteAssetSchema,
  findAllOptionsSchema,
} from "../schema/assetSchema.js";
import { formatJoiError } from "../utils/helpers.js";

// Helper: find asset by id
export const findById = async (id) => {
  const [rows] = await pool.execute("SELECT * FROM asset WHERE asset_id = ?", [
    id,
  ]);
  return rows[0] || null;
};

// Helper: check if serial number exists
export const existsBySerialNumber = async (serial_number, excludeId = null) => {
  let query = "SELECT * FROM asset WHERE serial_number = ?";
  const params = [serial_number];

  if (excludeId) {
    query += " AND asset_id != ?";
    params.push(excludeId);
  }

  const [rows] = await pool.execute(query, params);
  return rows.length > 0;
};

// CREATE ASSET
export const create = async (data) => {
  const { error } = createAssetSchema.validate(data);
  if (error) throw new Error(formatJoiError(error));

  const duplicate = await existsBySerialNumber(data.serial_number);
  if (duplicate) throw new Error("Serial number already exists");

  const [result] = await pool.execute(
    `INSERT INTO asset
      (asset_type, brand, model, specifications, serial_number, purchase_date, vendor, warranty_expiry, status, quantity)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.asset_type,
      data.brand ?? null,
      data.model ?? null,
      data.specifications ?? null,
      data.serial_number,
      data.purchase_date ?? null,
      data.vendor ?? null,
      data.warranty_expiry ?? null,
      data.status ?? "Available",
      data.quantity ?? 1,
    ]
  );

  return { asset_id: result.insertId, ...data };
};

// UPDATE ASSET
export const update = async (data) => {
  const { error } = updateAssetSchema.validate(data);
  if (error) throw new Error(formatJoiError(error));

  const existing = await findById(data?.asset_id);
  if (!existing) throw new Error(`Asset with id ${data.asset_id} not found`);

  const duplicate = await existsBySerialNumber(
    data.serial_number,
    data.asset_id
  );
  if (duplicate) throw new Error("Serial number already exists");

  const [result] = await pool.execute(
    `UPDATE asset SET
      asset_type = ?, brand = ?, model = ?, specifications = ?, serial_number = ?,
      purchase_date = ?, vendor = ?, warranty_expiry = ?, status = ?, quantity = ?
     WHERE asset_id = ?`,
    [
      data.asset_type,
      data.brand ?? null,
      data.model ?? null,
      data.specifications ?? null,
      data.serial_number,
      data.purchase_date ?? null,
      data.vendor ?? null,
      data.warranty_expiry ?? null,
      data.status ?? "Available",
      data.quantity ?? 1,
      data.asset_id,
    ]
  );

  return { asset_id: data.asset_id, ...data };
};

// DELETE ASSET
export const remove = async (assetId, res) => {
  // 1. Validate input
  const { error } = deleteAssetSchema.validate({ asset_id: assetId });
  if (error) throw new Error(formatJoiError(error));

  // 2. Check if asset exists
  const existing = await findById(assetId);
  if (!existing) throw new Error(`Asset with id ${assetId} not found`);

  try {
    // 3. Delete the asset
    const [result] = await pool.execute(
      "DELETE FROM asset WHERE asset_id = ?",
      [assetId]
    );

    // 4. Check if deletion actually happened
    if (result.affectedRows < 1) {
      throw new Error("Failed to delete asset");
    }

    // 5. Success
    res.status(500).json({
      message: "Asset deleted successfully",
    });
    return;
  } catch (err) {
    // Handle foreign key constraint errors
    if (err.code === "ER_ROW_IS_REFERENCED_2") {
      throw new Error(
        "Cannot delete asset: It is assigned to an employee or referenced elsewhere."
      );
    }
    throw err; // rethrow other errors
  }
};

// FIND ALL ASSETS
export const AssetDisabledStatus = Object.freeze({
  ENABLED: 0,
  DISABLED: 1,
});

export const findAll = async (options = {}) => {
  const { error } = findAllOptionsSchema.validate(options);
  if (error) throw new Error(formatJoiError(error));
  const { page, limit, search, employee_id } = options;
  const params = [];
  let whereClauses = [];

  // Search filter
  if (search && search.trim().length >= 3) {
    whereClauses.push(
      "(asset_type LIKE ? OR model LIKE ? OR serial_number LIKE ?)"
    );
    params.push(
      `%${search.trim()}%`,
      `%${search.trim()}%`,
      `%${search.trim()}%`
    );
  }

  const whereClause =
    whereClauses.length > 0 ? ` WHERE ${whereClauses.join(" AND ")}` : "";

  // Count total
  let total = null;
  if (page && limit) {
    const [countRows] = await pool.execute(
      `SELECT COUNT(*) as cnt FROM asset ${whereClause}`,
      params
    );
    total = countRows[0].cnt;
  }
  // Main query
  let query = `
    SELECT
      a.*${
        employee_id
          ? `,
      CASE
        WHEN a.quantity <= 0 THEN ${AssetDisabledStatus.DISABLED}
        WHEN EXISTS (
          SELECT 1 FROM assignment asg
          WHERE asg.asset_id = a.asset_id
            AND asg.status IN ('Assigned','Pending')
            AND (asg.return_date IS NULL OR asg.return_date > NOW())
        ) THEN ${AssetDisabledStatus.DISABLED}
        ELSE ${AssetDisabledStatus.ENABLED}
      END AS is_disabled`
          : ""
      }
    FROM asset a
    ${whereClause}
    ORDER BY a.asset_id
  `;

  const queryParams = [...params];

  // Pagination
  if (page && limit) {
    query += " LIMIT ? OFFSET ?";
    queryParams.push(parseInt(limit), parseInt((page - 1) * limit));
  }

  const [rows] = await pool.execute(query, queryParams);

  if (page && limit) {
    return { total_records: total, page, limit, records: rows };
  }

  return rows;
};
