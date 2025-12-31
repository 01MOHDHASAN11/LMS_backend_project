import mongoose from "mongoose";

const courseReviewRequestSchema = mongoose.Schema({
    course:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"course",
        required:true
    },
    submittedAt:{type:Date,default:Date.now},
    instructor:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"userAuth",
        required:true
    },

    instructorName:{
        type:String,
        required:true,
        trim:true
    },
    instructorEmail:{
        type:String,
        required:true,
        lowercase:true,
        trim:true
    },
    courseTitle:{
        type:String,
        required:true,
        trim:true
    },

    reviewer:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"userAuth"
    },
    status:{
        type:String,
        enum:["pending","approved","rejected"],
        default:"pending",
        index:true
    },
    reviewedAt:{type:Date},
    version:{type:Number,required:true},
    feedback:{type:String}

},{timestamps:true})

courseReviewRequestSchema.index(
  { course: 1, instructor: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: "pending" } }
);

const courseReviewRequestModel = mongoose.model("submitCourseForReview",courseReviewRequestSchema)

export default courseReviewRequestModel