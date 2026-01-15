import mongoose from "mongoose";

const userSchema = mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: {
    type: String,
    enum: ["instructor", "student", "admin"],
    default: "student",
  },
  isVerified: { type: Boolean, default: false },
  instructorVerified: { type: Boolean, default: false },
  isBlocked: { type: Boolean, default: false },
  blockType: { type: String, enum: ["permanent", "temporary"] },
  blockedUntil: { type: Date, default: null },
  blockReason: { type: String },
  createdAt: { type: Date, default: Date.now },
});

userSchema.index({ email: 1 });

const userAuth = mongoose.model("userAuth", userSchema);
export default userAuth;
