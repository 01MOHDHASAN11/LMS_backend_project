import { getAllCourses } from "../controller/student.controller.js";
import { authorize } from "../middleware/authorize.middleware.js";
import express from "express"
import { verifyToken } from "../middleware/protectedRoute.middleware.js";
const studentRoutes = express.Router()

studentRoutes.use(verifyToken,authorize("student"))

studentRoutes.get("/courses/filter",getAllCourses)

export default studentRoutes