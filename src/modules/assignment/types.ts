// ENUMS
export type Role = "Employee" | "TeamLead" | "Manager" | "ED" | "CEO";

export type RequestType = "Employee" | "Management";

export type RequestStatus = "Pending" | "Approved" | "Rejected" | "Issued";

export type ApprovalLevel = "TeamLead" | "IT";

export type ApprovalStatus = "Pending" | "Approved" | "Rejected";

export type AssetStatus =
  | "Available"
  | "Requested"
  | "Assigned"
  | "Repair"
  | "Retired";

export type AuditAction = "Request" | "Approve" | "Reject" | "Issue";

// REQUEST PAYLOADS
export interface CreateAssignmentPayload {
  requester_id: number;
  asset_id: number;
  request_type: RequestType;
}

export interface UpdateApprovalPayload {
  request_id: number;
  approver_id: number;
  approval_level: ApprovalLevel;
  approval_status: ApprovalStatus;
  remarks?: string;
}

// SERVICE RETURNS
export interface CreateAssignmentResponse {
  message: string;
  request_id: number;
}

export interface MessageResponse {
  message: string;
}

// QUERY / FILTER TYPES
export interface GetAllRequestsFilter {
  status?: RequestStatus;
  requester_id?: number;
}

// DB RESULT SHAPES
export interface AssetRequestRow {
  request_id: number;
  requester_id: number;
  asset_id: number;
  request_type: RequestType;
  request_status: RequestStatus;
  request_date: string;
}

export interface PendingApprovalRow extends AssetRequestRow {
  requester_name: string;
  asset_type: string;
  brand: string | null;
  model: string | null;
  serial_number: string;
  approval_level: ApprovalLevel;
}

export interface EmployeeAssetRow extends AssetRequestRow {
  asset_type: string;
  brand: string | null;
  model: string | null;
  serial_number: string;
}
