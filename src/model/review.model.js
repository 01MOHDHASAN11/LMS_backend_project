import mongoose from "mongoose";

const courseReviewSchema = mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "userAuth",
    required: true,
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "course",
    required: true,
  },
  rating: { type: Number, min: 1, max: 5, required: true },
  comment: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date },
});

courseReviewSchema.index({ student: 1, course: 1 }, { unique: true });

export const courseReviewModel = mongoose.model(
  "CourseReview",
  courseReviewSchema
);
