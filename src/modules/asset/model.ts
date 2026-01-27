// model.ts
import pool from "../../config/db.ts";
import {
  createAssetSchema,
  updateAssetSchema,
  deleteAssetSchema,
  findAllOptionsSchema,
} from "./schema.ts";
import { formatJoiError } from "../../utils/helpers.ts";
import type { Asset, PaginatedAssets } from "./types.ts";

// Helper: find asset by ID
export const findById = async (id: number): Promise<Asset> => {
  const [rows]: any = await pool.execute(
    "SELECT * FROM asset WHERE asset_id = ?",
    [id],
  );
  if (!rows?.length) throw new Error(`Asset with id ${id} not found`);
  return rows[0] || null;
};

// Helper: check if serial number exists
export const existsBySerialNumber = async (
  serial_number: string,
  excludeId: number | null = null,
): Promise<boolean> => {
  let query = "SELECT * FROM asset WHERE serial_number = ?";
  const params: any[] = [serial_number];

  if (excludeId) {
    query += " AND asset_id != ?";
    params.push(excludeId);
  }

  const [rows]: any = await pool.execute(query, params);
  return rows.length > 0;
};

// CREATE ASSET
export const create = async (data: Asset): Promise<{ message: string }> => {
  const { error } = createAssetSchema.validate(data);
  if (error) throw new Error(formatJoiError(error));

  const duplicate = await existsBySerialNumber(data.serial_number);
  if (duplicate) throw new Error("Serial number already exists");

  const [result]: any = await pool.execute(
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
    ],
  );

  return { message: "Asset(s) added successfully" };
};

// UPDATE ASSET
export const update = async (
  data: Asset & { asset_id: number },
): Promise<{ message: string } | Asset> => {
  const { error } = updateAssetSchema.validate(data, { presence: "optional" });
  if (error) throw new Error(formatJoiError(error));

  const existing = await findById(data.asset_id);
  if (!existing) throw new Error(`Asset with id ${data.asset_id} not found`);

  if (data.serial_number) {
    const duplicate = await existsBySerialNumber(
      data.serial_number,
      data.asset_id,
    );
    if (duplicate) throw new Error("Serial number already exists");
  }

  // Build dynamic query for provided fields
  const fields: string[] = [];
  const values: any[] = [];

  const updatableFields: (keyof Asset)[] = [
    "asset_type",
    "brand",
    "model",
    "specifications",
    "serial_number",
    "purchase_date",
    "vendor",
    "warranty_expiry",
    "status",
    "quantity",
  ];

  updatableFields.forEach((key) => {
    if (data[key] !== undefined) {
      fields.push(`${key} = ?`);
      values.push(data[key]);
    }
  });

  if (fields.length === 0) return existing;

  values.push(data.asset_id); // For WHERE clause

  const sql = `UPDATE asset SET ${fields.join(", ")} WHERE asset_id = ?`;
  await pool.execute(sql, values);

  return { message: "Asset updated successfully" };
};

// DELETE ASSET
export const remove = async (assetId: number): Promise<{ message: string }> => {
  const { error } = deleteAssetSchema.validate({ asset_id: assetId });
  if (error) throw new Error(formatJoiError(error));

  const existing = await findById(assetId);
  if (!existing) throw new Error(`Asset with id ${assetId} not found`);

  try {
    const [result]: any = await pool.execute(
      "DELETE FROM asset WHERE asset_id = ?",
      [assetId],
    );
    if (result.affectedRows < 1) throw new Error("Failed to delete asset");
    return { message: "Asset deleted successfully" };
  } catch (err: any) {
    if (err.code === "ER_ROW_IS_REFERENCED_2") {
      throw new Error(
        "Cannot delete asset: It is assigned to an employee or referenced elsewhere.",
      );
    }
    throw err;
  }
};

// Asset status constants
export const AssetDisabledStatus = Object.freeze({
  ENABLED: 0,
  DISABLED: 1,
});

// FIND ALL ASSETS
export const findAll = async (
  options: any = {},
): Promise<PaginatedAssets | Asset[]> => {
  const { error } = findAllOptionsSchema.validate(options);
  if (error) throw new Error(formatJoiError(error));

  const { page, limit, search, employee_id } = options;
  const params: any[] = [];
  const whereClauses: string[] = [];

  // Search filter
  if (search && search.trim().length >= 3) {
    whereClauses.push(
      "(asset_type LIKE ? OR model LIKE ? OR serial_number LIKE ?)",
    );
    params.push(
      `%${search.trim()}%`,
      `%${search.trim()}%`,
      `%${search.trim()}%`,
    );
  }

  const whereClause =
    whereClauses.length > 0 ? ` WHERE ${whereClauses.join(" AND ")}` : "";

  // Count total for pagination
  let total: any | null = null;
  if (page && limit) {
    const [countRows]: any = await pool.execute(
      `SELECT COUNT(*) as cnt FROM asset ${whereClause}`,
      params,
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
  const queryParams: any = [...params];

  // Pagination
  if (page && limit) {
    query += " LIMIT ? OFFSET ?";
    queryParams.push(parseInt(limit), parseInt((page - 1) * limit));
  }

  const [rows]: any = await pool.execute(query, queryParams);

  if (page && limit) {
    return { total_records: total, page, limit, records: rows };
  }

  return rows;
};
