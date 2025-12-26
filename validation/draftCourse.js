import Joi from "joi";

const moduleValidation = Joi.object({
    title:Joi.string().trim().required(),
    videoUrl:Joi.string().trim().required(),
    videoPublicId:Joi.string().trim().optional(),
    videoSizeBytes:Joi.number().optional(),
    moduleDuration:Joi.number().optional(),
})

export const draftCourseValidation = Joi.object({
    title:Joi.string().custom((value,helper)=>{
        const wordCount = value.trim().split(/\s+/).length
        if(wordCount<3){
            return helper.message("Course title must be three words long")
        }
        return value
    }).required(),
    description:Joi.string().trim().custom((value,helper)=>{
        const wordCount = value.trim().split(/\s+/).length
        if(wordCount<30){
            return helper.message("Course description must contain at least 30 words")
        }
        return value
    }).required(),
    price:Joi.number().required().default(0),
    category:Joi.string().required(),
    tags:Joi.array().items(Joi.string()).required()
})