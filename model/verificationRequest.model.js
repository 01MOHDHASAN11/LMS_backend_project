import mongoose from "mongoose";

const verificationRequestSchema = mongoose.Schema({
    user:{type:mongoose.Schema.Types.ObjectId,ref:"userAuth",index:true},
    education:{type:String,required:true},
    experienceYears:{type:Number,default:0},
    portfolioLink:[String],
    resumeUrl:String,
    status:{type:String,enum:["pending","approved","rejected"],default:"pending"},
    adminMessage:{type:String},
    createdAt:{type:Date, default:Date.now},
    reviewedAt:{type:Date}
})

export const verificationRequestModel = mongoose.model("instructorVerificationRequest",verificationRequestSchema)
