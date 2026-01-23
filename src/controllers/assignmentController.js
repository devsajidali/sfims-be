import * as assignmentService from "../services/assignmentService.js";

export const create = async (req, res) => {
  try {
    const assignment = await assignmentService.createAsset(req.body);
    res.status(201).json(assignment);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const updateStatusRequest = async (req, res) => {
  try {
    const assignments = await assignmentService.updateRequest(req.body);
    res.json(assignments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const approveAssetRequest = async (req, res) => {
  try {
    const assignment = await assignmentService.approveAsset(req.params.id);
    res.json(assignment);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
};

export const getPendingApprovals = async (req, res) => {
  try {
    const approvals = await assignmentService.getPending(
      req.query.approverId,
    );
    res.json(approvals);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getAllRequests = async (req, res) => {
  try {
    const approvals = await assignmentService.allRequests(
      req.query.approverId,
    );
    res.json(approvals);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getEmployeeAssets = async (req, res) => {
  try {
    const approvals = await assignmentService.employeeAssets(
      req.query.approverId,
    );
    res.json(approvals);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


