import Joi from "joi";

// Create assignment schema
export const createAssignmentSchema = Joi.object({
  employee_id: Joi.number().integer().required(),
  asset_id: Joi.number().integer().required(),
  assignment_date: Joi.date().required(),
  return_date: Joi.date().optional().allow(null),
  remarks: Joi.string().max(255).optional().allow(""),
  status: Joi.string()
    .valid("assigned", "team_lead", "hr", "it")
    .optional()
    .default("assigned"),
});

// Update assignment schema
export const updateAssignmentSchema = Joi.object({
  assignment_id: Joi.number().integer().required(),
  employee_id: Joi.number().integer().required(),
  asset_id: Joi.number().integer().required(),
  assignment_date: Joi.date().required(),
  return_date: Joi.date().optional().allow(null),
  remarks: Joi.string().max(255).optional().allow(""),
  status: Joi.string().valid("assigned", "team_lead", "hr", "it").optional(),
});

// Delete assignment schema
export const deleteAssignmentSchema = Joi.object({
  assignment_id: Joi.number().integer().required(),
});

// Find assignments with options (pagination & search)
export const findAllAssignmentsSchema = Joi.object({
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).optional(),
  search: Joi.string().trim().min(3).allow("").optional(),
  employee_id: Joi.number().integer().optional(), // for filtering by employee
});

// Update assignment status schema
export const updateAssignmentStatusSchema = Joi.object({
  assignment_id: Joi.number().integer().required(),
  status: Joi.string().valid("assigned", "team_lead", "hr", "it").required(),
});
