import express from "express"
import { verifyToken } from "../middleware/protectedRoute.middleware.js"
import { authorize } from "../middleware/authorize.middleware.js"
import { createCourse, getAllCourses, instructorVerification, updateCourse, viewInstructorVerificationRequests} from "../controller/instructorController.js"
import upload from "../middleware/uploadResume.middleware.js"
import { getInstructorVerificationRequest } from "../controller/adminController.js"
const instructorRoute = express.Router()

instructorRoute.use(verifyToken,authorize("instructor"))

instructorRoute.post("/create-course",createCourse)
instructorRoute.get("/get-all-courses",getAllCourses)
instructorRoute.put("/course-update/:courseId",updateCourse)
instructorRoute.post("/instructor-verification",upload.single("resume"),instructorVerification)


instructorRoute.get("/verification-request",viewInstructorVerificationRequests)


export default instructorRoute