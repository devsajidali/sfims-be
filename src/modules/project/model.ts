import pool from "../../config/db.ts";
import {
  createProjectSchema,
  deleteProjectSchema,
  findAllOptionsSchema,
  updateProjectSchema,
} from "./schema.ts";
import { formatJoiError } from "../../utils/helpers.ts";

import type {
  Project,
  CreateProjectPayload,
  UpdateProjectPayload,
  FindAllProjectsOptions,
  PaginatedProjects,
} from "./types.ts";


// FIND BY ID
export const findById = async (id: number): Promise<Project> => {
  const [rows]: any = await pool.execute(
    "SELECT * FROM project WHERE project_id = ?",
    [id],
  );

  if (!rows?.length) {
    throw new Error(`Project with id ${id} not found`);
  }

  return rows[0];
};


// EXISTS BY NAME
export const existsByName = async (
  project_name: string,
  excludeId?: number | null,
): Promise<boolean> => {
  let query = "SELECT * FROM project WHERE project_name = ?";
  const params: any[] = [project_name];

  if (excludeId) {
    query += " AND project_id != ?";
    params.push(excludeId);
  }

  const [rows]: any = await pool.execute(query, params);
  return rows.length > 0;
};


// CREATE
export const create = async (
  data: CreateProjectPayload,
): Promise<Project> => {
  const { error } = createProjectSchema.validate(data);
  if (error) throw new Error(formatJoiError(error));

  const duplicate = await existsByName(data.project_name);
  if (duplicate) throw new Error("Project name already exists");

  const [result]: any = await pool.execute(
    "INSERT INTO project (project_name) VALUES (?)",
    [data.project_name],
  );

  return {
    project_id: result.insertId,
    project_name: data.project_name,
  };
};


// UPDATE
export const update = async (
  data: UpdateProjectPayload,
): Promise<Project> => {
  const { error } = updateProjectSchema.validate(data);
  if (error) throw new Error(formatJoiError(error));

  await findById(data.project_id);

  const duplicate = await existsByName(
    data.project_name,
    data.project_id,
  );
  if (duplicate) throw new Error("Project name already exists");

  const [result]: any = await pool.execute(
    "UPDATE project SET project_name = ? WHERE project_id = ?",
    [data.project_name, data.project_id],
  );

  if (result.affectedRows < 1) {
    throw new Error(
      `Failed to update — project with id ${data.project_id} not found`,
    );
  }

  return {
    project_id: data.project_id,
    project_name: data.project_name,
  };
};


// REMOVE
export const remove = async (projectId: number): Promise<boolean> => {
  const { error } = deleteProjectSchema.validate({ project_id: projectId });
  if (error) throw new Error(formatJoiError(error));

  await findById(projectId);

  const [result]: any = await pool.execute(
    "DELETE FROM project WHERE project_id = ?",
    [projectId],
  );

  if (result.affectedRows < 1) {
    throw new Error(
      `Failed to delete — project with id ${projectId} not found`,
    );
  }

  return true;
};


// FIND ALL
export const findAll = async (
  options: FindAllProjectsOptions = {},
): Promise<Project[] | PaginatedProjects> => {
  const { error } = findAllOptionsSchema.validate(options);
  if (error) throw new Error(formatJoiError(error));

  const { page, limit, search } = options;
  const hasSearch = typeof search === "string" && search.trim().length >= 3;
  const hasPagination = page != null && limit != null;

  let whereClause = "";
  const params: any[] = [];

  if (hasSearch) {
    whereClause = " WHERE project_name LIKE ?";
    params.push(`%${search.trim()}%`);
  }

  if (hasPagination) {
    const countSql = `SELECT COUNT(*) as cnt FROM project${whereClause}`;
    const [countRows]: any = await pool.execute(countSql, params);
    const total = countRows[0].cnt;

    const pageNum = parseInt(page!, 10);
    const limitNum = parseInt(limit!, 10);
    const offset = (pageNum - 1) * limitNum;

    const dataSql = `
      SELECT * FROM project
      ${whereClause}
      ORDER BY project_id
      LIMIT ? OFFSET ?
    `;

    const [rows]: any = await pool.query(dataSql, [
      ...params,
      limitNum,
      offset,
    ]);

    return {
      total_records: total,
      page: pageNum,
      limit: limitNum,
      records: rows,
    };
  }

  const [rows]: any = await pool.execute(
    `SELECT * FROM project ${whereClause} ORDER BY project_id`,
    params,
  );

  return rows;
};
