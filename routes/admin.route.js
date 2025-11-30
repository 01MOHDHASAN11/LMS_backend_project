import express from "express"
import { authorize } from "../middleware/authorize.middleware.js"
import { blockUserController,checkUserRequest, getPendingUserRequest, updateUserBlockStatus } from "../controller/adminController.js"
import { verifyToken } from "../middleware/protectedRoute.middleware.js"
const adminRoute = express.Router()

adminRoute.put("/get-user/:userId",verifyToken,authorize("admin"),blockUserController)
adminRoute.get("/review-unblock/get-users",verifyToken,authorize("admin"),checkUserRequest)
adminRoute.put("/status/update-user/:requestId",verifyToken,authorize("admin"),updateUserBlockStatus)
adminRoute.get("/pending-request",verifyToken,authorize("admin"),getPendingUserRequest)

export default adminRoute