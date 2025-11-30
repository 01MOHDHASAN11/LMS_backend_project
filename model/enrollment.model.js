import mongoose from "mongoose";

const courseEnrollmentSchema = mongoose.Schema({
    student:{type:mongoose.Schema.Types.ObjectId,ref:"userAuth",required:true},
    course:{type:mongoose.Schema.Types.ObjectId,ref:"course",required:true},
    enrolledAt:{type:Date, default:Date.now},
    progress:{type:Number,min:0,max:100,default:0},
    isCompleted:{type:Boolean,default:false}
})

courseEnrollmentSchema.index({student:1,course:1},{unique:true})

export const courseEnrollmentModel = mongoose.model("Enrollment",courseEnrollmentSchema)