import * as Department from "./model.ts";
import type {
  CreateDepartmentPayload,
  UpdateDepartmentPayload,
  FindAllDepartmentsOptions,
  Department as DepartmentType,
  PaginatedDepartments,
} from "./types.ts";

export const getAllDepartments = async (
  options: FindAllDepartmentsOptions,
): Promise<DepartmentType[] | PaginatedDepartments> => {
  return Department.findAll(options);
};

export const getDepartmentId = async (id: number): Promise<DepartmentType> => {
  return Department.findById(id);
};

export const createDepartment = async (
  data: CreateDepartmentPayload,
): Promise<DepartmentType> => {
  return Department.create(data);
};

export const updateDepartment = async (
  data: UpdateDepartmentPayload,
): Promise<DepartmentType> => {
  return Department.update(data);
};

export const deleteDepartment = async (id: number): Promise<boolean> => {
  return Department.remove(id);
};
