import express from "express"
import { verifyToken } from "../middleware/protectedRoute.middleware.js"
import { authorize } from "../middleware/authorize.middleware.js"
import { createCourse, getAllCourses, updateCourse} from "../controller/instructorController.js"
const instructorRoute = express.Router()

instructorRoute.post("/create-course",verifyToken,authorize("instructor"),createCourse)
instructorRoute.get("/get-all-courses",verifyToken,authorize("instructor"),getAllCourses)
instructorRoute.put("/course-update/:courseId",verifyToken,authorize("instructor"),updateCourse)

export default instructorRoute