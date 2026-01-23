import Joi from "joi";

// Assign a team lead to a team
export const assignTeamLeadSchema = Joi.object({
  employee_id: Joi.number().integer().required(),
  team_id: Joi.number().integer().required(),
});

// Update employee team
export const updateEmployeeTeamSchema = Joi.object({
  employee_id: Joi.number().integer().required(),
  team_id: Joi.number().integer().required(),
});

// Join projects for an employee
export const joinProjectsSchema = Joi.object({
  employee_id: Joi.number().integer().required(),
  project_ids: Joi.array().items(Joi.number().integer()).min(1).required(),
});

// Options for listing employees
export const findAllEmployeeOptionsSchema = Joi.object({
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).optional(),
  search: Joi.string().trim().min(3).allow("").optional(),
});

export const getTeamMembersSchema = Joi.object({
  teamLeadId: Joi.number().integer().positive().required().messages({
    "number.base": "Team Lead ID must be a number",
    "number.integer": "Team Lead ID must be an integer",
    "number.positive": "Team Lead ID must be a positive number",
    "any.required": "Team Lead ID is required",
  }),
});