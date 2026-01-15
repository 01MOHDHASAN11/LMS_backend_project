import express from "express";
import { verifyToken } from "../middleware/protectedRoute.middleware.js";
import { authorize } from "../middleware/authorize.middleware.js";
import {
  addCourseModule,
  addVideo,
  createCourseDraft,
  deleteDraftedCourse,
  deleteModule,
  deleteVideo,
  getAllCourses,
  getCourseAnalytics,
  getInstructorCourseReview,
  getSignature,
  instructorVerification,
  reorderModules,
  reorderVideos,
  submitCourseReview,
  updateCourse,
  viewInstructorVerificationRequests,
} from "../controller/instructorController.js";
import { isInstructorVerified } from "../middleware/isInstructorVerified.middleware.js";
const instructorRoute = express.Router();

instructorRoute.use(verifyToken, authorize("instructor"));

instructorRoute.get("/get-all-courses", getAllCourses);
instructorRoute.put("/course-update/:courseId", updateCourse);
instructorRoute.post("/instructor-verification", instructorVerification);

instructorRoute.get("/get-signature", getSignature);
// After above route hit this below route with file, signature,api_key,folder:resumes,timestamp in post request and add these data in form-data
// https://api.cloudinary.com/v1_1/<cloud_name>/<upload-type>/upload

// Upload type could be: image | raw | video
instructorRoute.get(
  "/verification-request",
  viewInstructorVerificationRequests
);
instructorRoute.post("/draft-course", isInstructorVerified, createCourseDraft);
instructorRoute.get(
  "/analytics/course/:courseId",
  isInstructorVerified,
  getCourseAnalytics
);
instructorRoute.post(
  "/course/:draftCourseId/add-module",
  isInstructorVerified,
  addCourseModule
);
instructorRoute.put(
  "/course/:courseId/reorder-module",
  isInstructorVerified,
  reorderModules
);
instructorRoute.put(
  "/course/:courseId/module/:moduleId/reorder-videos",
  isInstructorVerified,
  reorderVideos
);
instructorRoute.delete(
  "/delete-module/course/:courseId/module/:moduleId",
  isInstructorVerified,
  deleteModule
);
instructorRoute.delete(
  "/delete-video/course/:courseId/module/:moduleId/video/:videoId",
  isInstructorVerified,
  deleteVideo
);
instructorRoute.delete(
  "/delete-course/:courseId",
  isInstructorVerified,
  deleteDraftedCourse
);
instructorRoute.post(
  "/add-video/course/:courseId/module/:moduleId",
  isInstructorVerified,
  addVideo
);
instructorRoute.post(
  "/course/:courseId/review-request",
  isInstructorVerified,
  submitCourseReview
);

instructorRoute.get("/course-review/:courseId",isInstructorVerified,getInstructorCourseReview)

export default instructorRoute;
