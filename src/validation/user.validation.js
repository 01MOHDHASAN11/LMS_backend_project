import Joi from "joi";

export const signupValidation = Joi.object({
  name: Joi.string().min(3).max(50).required().trim(),
  email: Joi.string().email().required().lowercase(),
  password: Joi.string()
    .min(8)
    .max(30)
    .pattern(new RegExp("^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[@$!%*?&])"))
    .message(
      "Password must include upper, lower, number, and special character"
    )
    .required()
    .trim(),
  role: Joi.string().valid("student", "instructor").default("student"),
}).options({ stripUnknown: true });

export const signinValidation = Joi.object({
  email: Joi.string().email().required().trim(),
  password: Joi.string().required().trim(),
}).options({ stripUnknown: true });
