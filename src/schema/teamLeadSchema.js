import Joi from "joi";

export const assignTeamLeadSchema = Joi.object({
  employee_id: Joi.number().integer().required().messages({
    "number.base": "Employee ID must be a number",
    "number.integer": "Employee ID must be an integer",
    "any.required": "Employee ID is required",
  }),
  team_id: Joi.number().integer().required().messages({
    "number.base": "Team ID must be a number",
    "number.integer": "Team ID must be an integer",
    "any.required": "Team ID is required",
  }),
});
