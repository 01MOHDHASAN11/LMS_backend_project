import mongoose from "mongoose";

// const messageSchema = mongoose.Schema({
//     sender:{type:mongoose.Schema.Types.ObjectId,required:true,ref:"userAuth"},
//     sentAt:{type:Date,default:Date.now}
// })

const unblockRequestSchema = mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "userAuth",
    required: true,
  },
  message: { type: String, required: true },
  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending",
  },
  sentAt: { type: Date, default: Date.now },
  reviewedAt: { type: Date, default: null },
});

unblockRequestSchema.index(
  { user: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: "pending" } }
);
export const unblockRequestModel = mongoose.model(
  "UnblockRequest",
  unblockRequestSchema
);
