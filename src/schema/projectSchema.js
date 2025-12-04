import Joi from "joi";

export const createProjectSchema = Joi.object({
  project_name: Joi.string().min(3).max(50).required(),
});

export const updateProjectSchema = Joi.object({
  project_id: Joi.number().integer().required(),
  project_name: Joi.string().min(3).max(50).required(),
});

export const deleteProjectSchema = Joi.object({
  project_id: Joi.number().integer().required(),
});

export const findAllOptionsSchema = Joi.object({
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).optional(),
  search: Joi.string().trim().min(3).allow("").optional(),
});
