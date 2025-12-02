import express from "express"
import { verifyToken } from "../middleware/protectedRoute.middleware.js"
import { authorize } from "../middleware/authorize.middleware.js"
import { createCourse, getAllCourses, instructorVerification, updateCourse} from "../controller/instructorController.js"
import upload from "../middleware/multer.middleware.js"
const instructorRoute = express.Router()

instructorRoute.post("/create-course",verifyToken,authorize("instructor"),createCourse)
instructorRoute.get("/get-all-courses",verifyToken,authorize("instructor"),getAllCourses)
instructorRoute.put("/course-update/:courseId",verifyToken,authorize("instructor"),updateCourse)
instructorRoute.post("/instructor-verification",upload.single("resume"),verifyToken,authorize("instructor"),instructorVerification)
export default instructorRoute