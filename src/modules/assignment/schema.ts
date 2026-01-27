import Joi from "joi";

export const createAssignmentRequestSchema = Joi.object({
  requester_id: Joi.number().integer().positive().required(),
  asset_id: Joi.number().integer().positive().required(),
  request_type: Joi.string().valid("Employee", "Management").required(),
});

export const approveAssignmentRequestSchema = Joi.object({
  request_id: Joi.number().integer().positive().required(),
  approver_id: Joi.number().integer().positive().required(),
  approval_level: Joi.string().valid("TeamLead", "IT").required(),
  approval_status: Joi.string().valid("Approved", "Rejected").required(),
  remarks: Joi.string().allow("", null),
});

export const getPendingApprovalsSchema = Joi.object({
  approver_id: Joi.number().integer().positive().required(),
});
