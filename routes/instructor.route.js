import express from "express"
import { verifyToken } from "../middleware/protectedRoute.middleware.js"
import { authorize } from "../middleware/authorize.middleware.js"
import { addCourseModule, addVideo, createCourseDraft, deleteModule, deleteVideo, getAllCourses, getResumeSignature, getThumbnailSignature, instructorVerification, reorderModules, reorderVideos, submitCourseReview, updateCourse, viewInstructorVerificationRequests} from "../controller/instructorController.js"
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

instructorRoute.get("/cloudinary-signature",getResumeSignature)
instructorRoute.get("/thumbnail-signature",getThumbnailSignature)
// After above route hit this below route with file, signature,api_key,folder:resumes,timestamp in post request and add these data in form-data
// https://api.cloudinary.com/v1_1/<cloud_name>/auto/upload
instructorRoute.get("/verification-request",viewInstructorVerificationRequests)
instructorRoute.post("/draft-course",isInstructorVerified,thumbNailUpload.single("thumbnailUrl"),multerUploadErrorHandler,createCourseDraft)
instructorRoute.post("/course/:draftCourseId/add-module",isInstructorVerified,moduleVideoUpload.array("videos",20),multerUploadErrorHandler,addCourseModule)
instructorRoute.put("/course/:courseId/reorder-module",isInstructorVerified,reorderModules)
instructorRoute.put("/course/:courseId/module/:moduleId/reorder-videos",isInstructorVerified,reorderVideos)
instructorRoute.delete("/delete-module/course/:courseId/module/:moduleId",isInstructorVerified,deleteModule)
instructorRoute.delete("/delete-video/course/:courseId/module/:moduleId/video/:videoId",isInstructorVerified,deleteVideo)
instructorRoute.post("/add-video/course/:courseId/module/:moduleId",isInstructorVerified,moduleVideoUpload.single("videoFile"),multerUploadErrorHandler,addVideo)
instructorRoute.post("/course/:courseId/review-request",isInstructorVerified,submitCourseReview)


export default instructorRoute