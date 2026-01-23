import Joi from "joi";

// Department creation schema
export const createDepartmentSchema = Joi.object({
  department_name: Joi.string().min(2).max(50).required(),
});

// Department update schema
export const updateDepartmentSchema = Joi.object({
  department_id: Joi.number().integer().required(),
  department_name: Joi.string().min(2).max(50).required(),
});

// Department delete schema
export const deleteDepartmentSchema = Joi.object({
  department_id: Joi.number().integer().required(),
});

// Search and pagination options schema for departments
export const findAllOptionsSchema = Joi.object({
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).optional(),
  search: Joi.string().trim().min(3).allow("").optional(),
});
