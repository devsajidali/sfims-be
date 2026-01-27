import * as employeeService from "./service.ts";
import type { Employee, File } from "./types.ts";
import type { Request, Response } from "express";

export const getAll = async (req: Request, res: Response) => {
  try {
    const page = req.query.page ? parseInt(req.query.page as string, 10) : null;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : null;

    const employees = await employeeService.getAllEmployees({ page, limit });
    res.json(employees);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getById = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.query.id as string, 10);
    const employee = await employeeService.getEmployeeById(id);
    res.json(employee);
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
};

export const getTeamLeadMembersById = async (req: Request, res: Response) => {
  try {
    if (!req.query.id) {
      return res.status(400).json({ error: "Team lead ID is required." });
    }
    const id = parseInt(req.query.id as string, 10);
    const employees = await employeeService.allTeamMembers(id);
    res.json(employees);
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
};

export const bulkUpload = async (req: any, res: Response) => {
  try {
    const { department_id, project_id } = req.body;

    if (!req.file)
      return res.status(400).json({ error: "Please upload a CSV, XLS or XLSX file" });

    const file: File = req.file as unknown as any;

    const result = await employeeService.postProcessBulkFile(
      file,
      parseInt(department_id, 10),
      Array.isArray(project_id) ? project_id.map(Number) : [Number(project_id)]
    );

    res.json(result);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong" });
  }
};

export const create = async (req: Request, res: Response) => {
  try {
    const employee: Employee = req.body;
    const created = await employeeService.createEmployee(employee);
    res.status(201).json(created);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const update = async (req: Request, res: Response) => {
  try {
    const employee: Employee = req.body;
    const updated = await employeeService.updateEmployee(employee);
    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const remove = async (req: any, res: Response) => {
  try {
    await employeeService.deleteEmployee(parseInt(req.params.id));
    res.status(204).send();
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};
