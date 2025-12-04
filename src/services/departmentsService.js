import * as Department from "../models/departmentsModel.js";

export const getAllDepartments = async (data) => await Department.findAll(data);
export const getDepartmentId = async (id) => await Department.findById(id);
export const createDepartment = async (data) => await Department.create(data);

export const updateDepartment = async (data) => await Department.update(data);
export const deleteDepartment = async (id, res) =>
  await Department.remove(id, res);
