const Joi = require('joi');

const registrationSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(30).required(),
  email: Joi.string().email().required(),
  password: Joi.string().optional(), // Password is now auto-generated (Truda123) on backend
  firstName: Joi.string().required(),
  lastName: Joi.string().required(),
  role: Joi.string().valid('ADMIN', 'User').required(),
  branch: Joi.string().required(),
  // assignedCostCodes can be: array of strings (specific codes), or null (group-level access)
  assignedCostCodes: Joi.alternatives().try(
    Joi.array().items(Joi.string()),
    Joi.valid(null)
  ).optional(),
  assignedGroups: Joi.array().items(Joi.string()).optional(),
  userType: Joi.string().optional()
});

const loginSchema = Joi.object({
  username: Joi.string().required(),
  password: Joi.string().required()
});

const validate = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, { abortEarly: true });
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }
    next();
  };
};

module.exports = { registrationSchema, loginSchema, validate };
