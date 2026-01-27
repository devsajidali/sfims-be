import * as EmployeeModel from "./model.ts";
import type { Employee, Pagination, BulkUploadResult, File, ServiceResponse } from "./types.ts";

export const getAllEmployees = async (pagination: Pagination): Promise<ServiceResponse<Employee>> =>
  await EmployeeModel.findAll(pagination);

export const getEmployeeById = async (id: number): Promise<Employee> =>
  await EmployeeModel.findById(id);

export const allTeamMembers = async (id: number): Promise<Employee[]> =>
  await EmployeeModel.findAllTeamMembers(id);

export const postProcessBulkFile = async (
  file: File,
  department_id: number,
  project_ids: number[]
): Promise<BulkUploadResult> =>
  await EmployeeModel.processBulkFile(file, department_id, project_ids);

export const createEmployee = async (data: Employee): Promise<Employee> =>
  await EmployeeModel.create(data);

export const updateEmployee = async (data: Employee): Promise<ServiceResponse> =>
  await EmployeeModel.update(data);

export const deleteEmployee = async (id: number): Promise<void> =>
  await EmployeeModel.remove(id);
