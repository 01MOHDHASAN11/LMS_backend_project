import Joi from "joi";

const unblockRequestValidation = Joi.object({
    email:Joi.string().email().lowercase().required().trim(),
    password:Joi.string().required(),
    message:Joi.string().custom((value,helpers)=>{
        let wordCount = value.trim().split(/\s+/).length
        if(wordCount<5){
            return helpers.message("Message must be at least 5 words long")
        }
        return value
    }).required()
}).options({stripUnknown:true})

export default unblockRequestValidation