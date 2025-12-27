import express from "express"
import { verifyToken } from "../middleware/protectedRoute.middleware.js"
import { authorize } from "../middleware/authorize.middleware.js"
import { addCourseModule, createCourseDraft, getAllCourses, instructorVerification, reorderModules, updateCourse, viewInstructorVerificationRequests} from "../controller/instructorController.js"
import upload from "../middleware/uploadResume.middleware.js"
import { isInstructorVerified } from "../middleware/isInstructorVerified.middleware.js"
import { thumbNailUpload } from "../middleware/uploadThumbNail.middleware.js"
import { moduleVideoUpload } from "../middleware/uploadVideo.middleware.js"
import { multerUploadErrorHandler } from "../middleware/multerErrorHandler.middleware.js"
const instructorRoute = express.Router()

instructorRoute.use(verifyToken,authorize("instructor"))

instructorRoute.get("/get-all-courses",getAllCourses)
instructorRoute.put("/course-update/:courseId",updateCourse)
instructorRoute.post("/instructor-verification",upload.single("resume"),multerUploadErrorHandler,instructorVerification)

instructorRoute.get("/verification-request",viewInstructorVerificationRequests)
instructorRoute.post("/draft-course",isInstructorVerified,thumbNailUpload.single("thumbnailUrl"),multerUploadErrorHandler,createCourseDraft)
instructorRoute.post("/course/:draftCourseId/add-module",isInstructorVerified,moduleVideoUpload.array("videos",20),multerUploadErrorHandler,addCourseModule)
instructorRoute.put("/course/:courseId/reorder-module",isInstructorVerified,reorderModules)

export default instructorRoute