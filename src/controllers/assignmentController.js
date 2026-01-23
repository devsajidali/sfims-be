import * as assignmentService from "../services/assignmentService.js";

export const create = async (req, res) => {
  try {
    const assignment = await assignmentService.createAssignment(req.body);
    res.status(201).json(assignment);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const getAll = async (req, res) => {
  try {
    const assignments = await assignmentService.getAllAssignments();
    res.json(assignments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getById = async (req, res) => {
  try {
    const assignment = await assignmentService.getAssignmentById(req.params.id);
    res.json(assignment);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
};

export const update = async (req, res) => {
  try {
    const assignment = await assignmentService.updateAssignment(
      req.params.id,
      req.body
    );
    res.json(assignment);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const remove = async (req, res) => {
  try {
    await assignmentService.deleteAssignment(req.params.id);
    res.status(204).send();
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Get assignment approval status
export const getApprovalStatus = async (req, res) => {
  try {
    const status = await assignmentService.getApprovalStatus(req.params.id);
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Approve or reject an assignment
export const approveAssignment = async (req, res) => {
  try {
    const result = await assignmentService.approveAssignment(req.body);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
export const getPendingApprovals = async (req, res) => {
  try {
    const approvals = await assignmentService.getPendingApprovals(
      req.query.approverId
    );
    res.json(approvals);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
