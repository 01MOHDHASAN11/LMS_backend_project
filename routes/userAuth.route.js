import express from "express"
import { changePassword, forgetPassword, logout, refreshToken, resetPassword, signin, signup, verifyEmail } from "../controller/auth.controller.js"
import { verifyToken } from "../middleware/protectedRoute.middleware.js"
import {authLimiter} from "../middleware/authRateLimit.middleware.js"
import { isUserBlocked } from "../middleware/isUserBlocked.middleware.js"

const auth = express.Router()
auth.post("/signup",authLimiter({keyPrefix:"signup",maxEmail:5,maxIP:10,windowInSeconds:3600}),signup)
auth.post("/signin",authLimiter({keyPrefix:"signin",maxEmail:5,maxIP:10,windowInSeconds:900}),isUserBlocked,signin)
auth.post("/refresh-token",refreshToken)

auth.get("/profile",verifyToken,(req,res)=>{
    res.json({user:req.user})
})

auth.get("/verify/:token",verifyEmail)
auth.get("/forget-password",authLimiter({keyPrefix:"forgetPwd",maxEmail:5,maxIP:20,windowInSeconds:3600}),forgetPassword)
auth.post("/logout",logout)
auth.put("/reset-password/:token",resetPassword)
auth.put("/change-password",verifyToken,changePassword)

export default auth