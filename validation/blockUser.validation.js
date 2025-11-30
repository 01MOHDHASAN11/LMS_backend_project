import Joi from "joi";

export const blockUser = Joi.object({
    blockDays:Joi.number().valid(1,3,7,15,30,90,180,360),
    blockType:Joi.string().valid("permanent","temporary"),
    reason:Joi.string().required()
})

export const updateUserBlockStatusValidation = Joi.object({
    status:Joi.string().valid("approved","rejected").required(),
    adminMessage:Joi.string().custom((value,helpers)=>{
        const wordCount = value.trim().split(/\s+/).length
        if(wordCount<5){
            return helpers.message("Message must be 5 words long")
        }
        return value
    })
})