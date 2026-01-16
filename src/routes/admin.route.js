import express from "express";
import { authorize } from "../middleware/authorize.middleware.js";
import {
  blockUserController,
  checkUserRequest,
  getInstructorVerificationRequest,
  getPendingUserRequest,
  getSingleVerificationRequest,
  reviewCourseRequest,
  updateInstructorVerificationRequest,
  updateUserBlockStatus,
} from "../controller/adminController.js";
import { verifyToken } from "../middleware/protectedRoute.middleware.js";
const adminRoute = express.Router();

adminRoute.use(verifyToken, authorize("admin"));
adminRoute.put("/get-user/:userId", blockUserController);
adminRoute.get("/review-unblock/get-users", checkUserRequest);
adminRoute.put("/status/update-user/:requestId", updateUserBlockStatus);
adminRoute.get("/pending-request", getPendingUserRequest);

// Instructor verification request(pending/approved/rejected with filter and pagination)
adminRoute.get("/verification/request", getInstructorVerificationRequest);
adminRoute.get("/verification/request/:id", getSingleVerificationRequest);
adminRoute.patch(
  "/verification/request/:id",
  updateInstructorVerificationRequest
);

adminRoute.patch(
  "/draft-course/review-request/:requestId",
  reviewCourseRequest
);
export default adminRoute;
