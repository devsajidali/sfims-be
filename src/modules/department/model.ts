import pool from "../../config/db.ts";
import {
  createDepartmentSchema,
  deleteDepartmentSchema,
  findAllOptionsSchema,
  updateDepartmentSchema,
} from "./schema.ts";
import { formatJoiError } from "../../utils/helpers.ts";

import type {
  Department,
  CreateDepartmentPayload,
  UpdateDepartmentPayload,
  FindAllDepartmentsOptions,
  PaginatedDepartments,
} from "./types.ts";


// FIND BY ID
export const findById = async (id: number): Promise<Department> => {
  const [rows]: any = await pool.execute(
    "SELECT * FROM department WHERE department_id = ?",
    [id],
  );

  if (!rows?.length) {
    throw new Error(`Department with id ${id} not found`);
  }

  return rows[0];
};


// EXISTS BY NAME
export const existsByName = async (
  department_name: string,
  excludeId?: number | null,
): Promise<boolean> => {
  let query = "SELECT * FROM department WHERE department_name = ?";
  const params: any[] = [department_name];

  if (excludeId) {
    query += " AND department_id != ?";
    params.push(excludeId);
  }

  const [rows]: any = await pool.execute(query, params);
  return rows.length > 0;
};


// CREATE
export const create = async (
  data: CreateDepartmentPayload,
): Promise<Department> => {
  const { error } = createDepartmentSchema.validate(data);
  if (error) throw new Error(formatJoiError(error));

  const duplicate = await existsByName(data.department_name);
  if (duplicate) throw new Error("Department name already exists");

  const [result]: any = await pool.execute(
    "INSERT INTO department (department_name) VALUES (?)",
    [data.department_name],
  );

  return {
    department_id: result.insertId,
    department_name: data.department_name,
  };
};


// UPDATE
export const update = async (
  data: UpdateDepartmentPayload,
): Promise<Department> => {
  const { error } = updateDepartmentSchema.validate(data);
  if (error) throw new Error(formatJoiError(error));

  await findById(data.department_id);

  const duplicate = await existsByName(
    data.department_name,
    data.department_id,
  );
  if (duplicate) throw new Error("Department name already exists");

  const [result]: any = await pool.execute(
    "UPDATE department SET department_name = ? WHERE department_id = ?",
    [data.department_name, data.department_id],
  );

  if (result.affectedRows < 1) {
    throw new Error(
      `Failed to update — department with id ${data.department_id} not found`,
    );
  }

  return {
    department_id: data.department_id,
    department_name: data.department_name,
  };
};


// REMOVE
export const remove = async (departmentId: number): Promise<boolean> => {
  const { error } = deleteDepartmentSchema.validate({
    department_id: departmentId,
  });
  if (error) throw new Error(formatJoiError(error));

  await findById(departmentId);

  const [result]: any = await pool.execute(
    "DELETE FROM department WHERE department_id = ?",
    [departmentId],
  );

  if (result.affectedRows < 1) {
    throw new Error(
      `Department with id ${departmentId} could not be deleted`,
    );
  }

  return true;
};


// FIND ALL
export const findAll = async (
  options: FindAllDepartmentsOptions = {},
): Promise<Department[] | PaginatedDepartments> => {
  const { error } = findAllOptionsSchema.validate(options);
  if (error) throw new Error(formatJoiError(error));

  const { page, limit, search } = options;
  const hasSearch = typeof search === "string" && search.trim().length >= 3;
  const hasPagination = page != null && limit != null;

  let whereClause = "";
  const params: any[] = [];

  if (hasSearch) {
    whereClause = " WHERE department_name LIKE ?";
    params.push(`%${search.trim()}%`);
  }

  if (hasPagination) {
    const countSql = `SELECT COUNT(*) as cnt FROM department${whereClause}`;
    const [countRows]: any = await pool.execute(countSql, params);
    const total = countRows[0].cnt;

    const pageNum = parseInt(page!, 10);
    const limitNum = parseInt(limit!, 10);
    const offset = (pageNum - 1) * limitNum;

    const dataSql = `
      SELECT * FROM department
      ${whereClause}
      ORDER BY department_id
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
    `SELECT * FROM department ${whereClause} ORDER BY department_id`,
    params,
  );

  return rows;
};
