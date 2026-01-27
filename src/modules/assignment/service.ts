import * as Assignment from "./model.ts";
import type {
  CreateAssignmentPayload,
  UpdateApprovalPayload,
  CreateAssignmentResponse,
  MessageResponse,
  AssetRequestRow,
  PendingApprovalRow,
  EmployeeAssetRow,
  GetAllRequestsFilter,
} from "./types.ts";

export const createAssignment = async (
  data: CreateAssignmentPayload,
): Promise<CreateAssignmentResponse> => {
  return await Assignment.create(data);
};

export const updateRequest = async (
  data: UpdateApprovalPayload,
): Promise<MessageResponse> => {
  return await Assignment.updateStatus(data);
};

export const approveAssetRequest = async (
  requestId: number,
): Promise<MessageResponse> => {
  return await Assignment.issueAsset(requestId);
};

export const getPending = async (
  approverId: number,
): Promise<PendingApprovalRow[]> => {
  return await Assignment.getPendingApprovals(approverId);
};

export const allRequests = async (
  filters?: GetAllRequestsFilter,
): Promise<AssetRequestRow[]> => {
  return await Assignment.getAllRequests(filters);
};

export const employeeAssets = async (
  employee_id: number,
  status?: string,
): Promise<EmployeeAssetRow[]> => {
  return await Assignment.getEmployeeAssets(employee_id, status);
};
