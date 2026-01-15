import Joi from "joi";

const updateInstructorVerificationRequestValidation = Joi.object({
  status: Joi.string().valid("rejected", "approved").required().trim(),
  adminMessage: Joi.string().custom((value, helpers) => {
    const message = value.trim().split(/\s+/).length;
    if (message < 5) {
      return helpers.message("Message should be at least five words");
    }
    return value;
  }),
}).options({ stripUnknown: true });
export default updateInstructorVerificationRequestValidation;
