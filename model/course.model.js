import mongoose from "mongoose";

const videoSchema = mongoose.Schema({
    title:{type:String,required:true},
    videoUrl:{type:String,required:true},
    videoPublicId:{type:String,required:true},
    duration:{type:Number,required:true},
    videoSizeInBytes:{type:Number,required:true},
    order:{type:Number,required:true},
    createdAt:{type:Date,default:Date.now},
    updatedAt:{type:Date}
})

const moduleSchema = mongoose.Schema({
    title:{type:String,required:true},
    videos:[videoSchema],
    moduleDuration:{type:Number},
    order:{type:Number,required:true},
    createdAt:{type:Date,default:Date.now},
    updatedAt:{type:Date}
})


const courseSchema = mongoose.Schema({
    title:{type:String,required:true},
    description:{type:String,required:true},
    price:{type:Number,required:true},
    thumbnailUrl:{type:String,required:true},
    category:{type:String,required:true},
    tags:{type:[String],required:true},
    instructor:{type:mongoose.Schema.Types.ObjectId,ref:"userAuth",required:true,index:true},
    modules:[moduleSchema],
    courseDuration:{type:Number},
    status:{type:String,enum:["draft","review","published","archived"]},
    publishedAt:{type:Date},
    createdAt:{type:Date,default:Date.now},
    updatedAt:{type:Date,default:null},
})

courseSchema.index({title:"text"})
courseSchema.index({category:1})
courseSchema.index({tags:1})
courseSchema.index(
    {instructor:1,status:1},
    {partialFilterExpression:{status:{$in:["draft","review","archived"]}}}
)

const authCourse = mongoose.model("course",courseSchema)

export default authCourse