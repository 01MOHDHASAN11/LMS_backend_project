import mongoose from "mongoose";

const verificationRequestSchema = mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "userAuth" },
  highestQualification: { type: String, required: true },
  experienceYears: { type: Number, default: 0, min: 0 },
  portfolioLink: [String],
  resumeUrl: { type: String, required: true },
  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending",
  },
  adminMessage: { type: String },
  resumePublicId: { type: String },
  createdAt: { type: Date, default: Date.now },
  reviewedAt: { type: Date },
});
verificationRequestSchema.index(
  { user: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: "pending" } }
);
export const verificationRequestModel = mongoose.model(
  "instructorVerificationRequest",
  verificationRequestSchema
);
