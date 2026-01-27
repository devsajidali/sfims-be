import type { Request, Response } from "express";
import * as assignmentService from "./service.ts";
import type {
  CreateAssignmentPayload,
  UpdateApprovalPayload,
} from "./types.ts";

export const create = async (
  req: Request<{}, {}, CreateAssignmentPayload>,
  res: Response,
) => {
  try {
    const assignment = await assignmentService.createAssignment(req.body);
    res.status(201).json(assignment);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const updateStatusRequest = async (
  req: Request<{}, {}, UpdateApprovalPayload>,
  res: Response,
) => {
  try {
    const result = await assignmentService.updateRequest(req.body);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const approveAssetRequest = async (
  req: Request<{ id: string }>,
  res: Response,
) => {
  try {
    const result = await assignmentService.approveAssetRequest(
      Number(req.params.id),
    );
    res.json(result);
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
};

export const getPendingApprovals = async (
  req: Request<{}, {}, {}, { approverId: string }>,
  res: Response,
) => {
  try {
    const approvals = await assignmentService.getPending(
      Number(req.query.approverId),
    );
    res.json(approvals);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getAllRequests = async (
  req: Request,
  res: Response,
) => {
  try {
    const approvals = await assignmentService.allRequests(req.query as any);
    res.json(approvals);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getEmployeeAssets = async (
  req: Request<{}, {}, {}, { employee_id: string; status?: string }>,
  res: Response,
) => {
  try {
    const assets = await assignmentService.employeeAssets(
      Number(req.query.employee_id),
      req.query.status,
    );
    res.json(assets);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
