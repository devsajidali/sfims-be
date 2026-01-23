import * as Employee from "../models/employeeModel.js";

export const getAllEmployees = async ({ page, limit }) =>
  await Employee.findAll({ page, limit });
export const getEmployeeById = async (id) => await Employee.findById(id);
export const allTeamMembers = async (id) =>
  await Employee.findAllTeamMembers(id);

export const postProcessBulkFile = async (id) =>
  await Employee.processBulkFile(id);

export const createEmployee = async (data) => await Employee.create(data);
export const updateEmployee = async (data) => await Employee.update(data);
export const deleteEmployee = async (id) => await Employee.remove(id);
