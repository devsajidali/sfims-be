import Joi from "joi";

export const createEmployeeSchema = Joi.object({
  first_name: Joi.string().min(1).max(50).required(),
  last_name: Joi.string().min(1).max(50).required(),
  designation: Joi.string().max(50).optional().allow(null, ""),
  email: Joi.string().email().required(),
  contact_number: Joi.string().pattern(/^\d+$/).min(7).max(15).optional(),
  group: Joi.array()
    .items(Joi.string().min(1).max(50))
    .required(), // department + team are required
});
