import Joi  from "joi";

const instructionVerificationValidateFields = Joi.object({
    highestQualification:Joi.string().required().valid("graduate","postgraduate","phd"),
    experienceYears:Joi.number().min(0).default(0),
    resumeUrl:Joi.string().required(),
    portfolioLink:Joi.array().items(Joi.string()),
    status:Joi.string().valid("pending").default("pending")
}).options({stripUnknown:true})

export default instructionVerificationValidateFields