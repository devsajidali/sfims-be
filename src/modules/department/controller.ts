import type { Request, Response } from "express";
import * as departmentService from "./service.ts";
import type {
  CreateDepartmentPayload,
  UpdateDepartmentPayload,
  FindAllDepartmentsOptions,
} from "./types.ts";

export const getAll = async (
  req: Request<{}, {}, {}, FindAllDepartmentsOptions>,
  res: Response,
) => {
  try {
    const departments = await departmentService.getAllDepartments(req.query);
    res.json(departments);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getById = async (
  req: Request<{}, {}, {}, { department_id: string }>,
  res: Response,
) => {
  try {
    const department = await departmentService.getDepartmentId(
      Number(req.query.department_id),
    );
    res.json(department);
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
};

export const create = async (
  req: Request<{}, {}, CreateDepartmentPayload>,
  res: Response,
) => {
  try {
    const response = await departmentService.createDepartment(req.body);
    res.status(201).json(response);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const update = async (
  req: Request<{}, {}, UpdateDepartmentPayload>,
  res: Response,
) => {
  try {
    const response = await departmentService.updateDepartment(req.body);
    res.json(response);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const remove = async (
  req: Request<{}, {}, {}, { department_id: string }>,
  res: Response,
) => {
  try {
    await departmentService.deleteDepartment(Number(req.query.department_id));
    res.json({
      status: "success",
      message: "Department deleted successfully",
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};
