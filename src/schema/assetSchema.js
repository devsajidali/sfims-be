import Joi from "joi";

// CREATE
export const createAssetSchema = Joi.object({
  asset_type: Joi.string().min(2).max(50).required(),
  brand: Joi.string().max(50).optional().allow(null),
  model: Joi.string().max(50).optional().allow(null),
  specifications: Joi.string().max(200).optional().allow(null),
  serial_number: Joi.string().max(100).required(),
  purchase_date: Joi.date().optional().allow(null),
  vendor: Joi.string().max(50).optional().allow(null),
  warranty_expiry: Joi.date().optional().allow(null),
  status: Joi.string()
    .valid("Available", "Requested", "Assigned", "Repair", "Retired")
    .optional(),
  quantity: Joi.number().integer().min(1).optional(),
});

// UPDATE
export const updateAssetSchema = Joi.object({
  asset_id: Joi.number().integer().required(),
  asset_type: Joi.string().min(2).max(50),
  brand: Joi.string().max(50).optional().allow(null),
  model: Joi.string().max(50).optional().allow(null),
  specifications: Joi.string().max(200).optional().allow(null),
  serial_number: Joi.string().max(100),
  purchase_date: Joi.date().optional().allow(null),
  vendor: Joi.string().max(50).optional().allow(null),
  warranty_expiry: Joi.date().optional().allow(null),
  status: Joi.string()
    .valid("Available", "Requested", "Assigned", "Repair", "Retired")
    .optional(),
  quantity: Joi.number().integer().min(1).optional(),
});

// DELETE
export const deleteAssetSchema = Joi.object({
  asset_id: Joi.number().integer().required(),
});

// FIND ALL OPTIONS
export const findAllOptionsSchema = Joi.object({
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).optional(),
  search: Joi.string().trim().min(3).allow("").optional(),
  employee_id: Joi.number().integer().min(1).optional(),
});
