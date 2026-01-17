import {
  addCourseReview,
  enrollInCourse,
  getAllCourses,
  getCourseDetails,
  getCourseReview,
  getMyEnrolledCourses,
  playVideo,
  saveVideoProgress,
} from "../controller/student.controller.js";
import { authorize } from "../middleware/authorize.middleware.js";
import express from "express";
import { verifyToken } from "../middleware/protectedRoute.middleware.js";
const studentRoutes = express.Router();

studentRoutes.use(verifyToken, authorize("student"));

studentRoutes.get("/courses/filter", getAllCourses);
studentRoutes.get("/course/course-detail/:courseId", getCourseDetails);
studentRoutes.post("/course/enrollInCourse/:courseId", enrollInCourse);
studentRoutes.get("/course/getEnrolledCourses", getMyEnrolledCourses);
studentRoutes.get("/play-video/course/:courseId/module/:moduleId/video/:videoId",playVideo)
studentRoutes.patch("/student/course/:courseId/module/:moduleId/video/:videoId/progress",saveVideoProgress)
studentRoutes.post("/course/addReview/:courseId", addCourseReview);
studentRoutes.get("/course/get-course-review/:courseId", getCourseReview);

export default studentRoutes;
