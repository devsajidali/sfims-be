import pool from "../config/db.js";
import {
  createProjectSchema,
  deleteProjectSchema,
  findAllOptionsSchema,
  updateProjectSchema,
} from "../schema/projectSchema.js";
import { formatJoiError } from "../utils/helpers.js";

// helper to find project by id
export const findById = async (id) => {
  const [rows] = await pool.execute(
    "SELECT * FROM project WHERE project_id = ?",
    [id]
  );
  return rows[0] || null;
};

export const existsByName = async (project_name, excludeId = null) => {
  let query = "SELECT * FROM project WHERE project_name = ?";
  const params = [project_name];

  if (excludeId) {
    query += " AND project_id != ?";
    params.push(excludeId);
  }

  const [rows] = await pool.execute(query, params);
  return rows.length > 0;
};

export const create = async (data) => {
  const { error } = createProjectSchema.validate(data);
  if (error) throw new Error(formatJoiError(error));

  const duplicate = await existsByName(data.project_name);
  if (duplicate) throw new Error("Project name already exists");

  const [result] = await pool.execute(
    "INSERT INTO project (project_name) VALUES (?)",
    [data.project_name]
  );

  return { project_id: result.insertId, ...data };
};

export const update = async (data) => {
  const { error } = updateProjectSchema.validate(data);
  if (error) throw new Error(formatJoiError(error));

  const existing = await findById(data.project_id);
  if (!existing) {
    throw new Error(`Project with id ${data.project_id} not found`);
  }

  const duplicate = await existsByName(data.project_name, data.project_id);
  if (duplicate) throw new Error("Project name already exists");

  const [result] = await pool.execute(
    "UPDATE project SET project_name = ? WHERE project_id = ?",
    [data.project_name, data.project_id]
  );

  if (result.affectedRows < 1) {
    throw new Error(
      `Failed to update — project with id ${data.project_id} not found`
    );
  }

  return { project_id: data.project_id, ...data };
};

export const remove = async (projectId, res) => {
  const { error } = deleteProjectSchema.validate({ project_id: projectId });
  console.log(error);
  if (error) throw new Error(formatJoiError(error));
  const existing = await findById(projectId);
  if (!existing) {
    throw new Error(`Project with id ${projectId} not found`);
  }

  const [result] = await pool.execute(
    "DELETE FROM project WHERE project_id = ?",
    [projectId]
  );

  if (result.affectedRows < 1) {
    res.status(500).json({
      status: "error",
      message: `Failed to delete — project with id ${project_id} not found`,
    });
    return;
  }

  res
    .status(200)
    .json({ status: "success", message: "Project deleted successfully" });
};

export const findAll = async (options = {}) => {
  const { error } = findAllOptionsSchema.validate(options);
  if (error) {
    throw new Error(formatJoiError(error));
  }

  const { page, limit, search } = options;
  const hasSearch = typeof search === "string" && search.trim().length >= 3;
  const hasPagination = page != null && limit != null;

  // Base where clause
  let whereClause = "";
  const params = [];

  if (hasSearch) {
    whereClause = " WHERE project_name LIKE ?";
    params.push(`%${search.trim()}%`);
  }

  if (hasPagination) {
    // count total
    const countSql = `SELECT COUNT(*) as cnt FROM project${whereClause}`;
    const [countRows] = await pool.execute(countSql, params);
    const total = countRows[0].cnt;

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const offset = (pageNum - 1) * limitNum;

    const dataSql = `
    SELECT * FROM project
    ${whereClause}
    ORDER BY project_id
    LIMIT ? OFFSET ?
  `;
    const dataParams = params.concat([limitNum, offset]); // numbers, not strings
    const [rows] = await pool.query(dataSql, dataParams);

    return {
      total_records: total,
      page: parseInt(page),
      limit: parseInt(limit),
      records: rows,
    };
  } else if (hasSearch) {
    // only search, no pagination
    const dataSql = `
      SELECT * FROM project
      ${whereClause}
      ORDER BY project_id
    `;
    const [rows] = await pool.execute(dataSql, params);
    return rows;
  } else {
    // no pagination or search — return all
    const [rows] = await pool.execute(
      "SELECT * FROM project ORDER BY project_id"
    );
    return rows;
  }
};
