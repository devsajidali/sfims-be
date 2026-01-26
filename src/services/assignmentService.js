import * as Assignment from "../models/assignmentModel.js";

export const createAsset = async (data) => await Assignment.create(data);

export const updateRequest = async (data) =>
  await Assignment.updateStatus(data);

export const approveAsset = async (data) => await Assignment.issueAsset(data);

export const getPending = async (approverId) =>
  await Assignment.getPendingApprovals(approverId);

export const allRequests = async (approverId) =>
  await Assignment.getAllRequests(approverId);

export const employeeAssets = async (employee_id, status) =>
  await Assignment.getEmployeeAssets(employee_id, status);
