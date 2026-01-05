import express from "express"
import dotenv from "dotenv"
import helmet from "helmet"
import cookieParser from "cookie-parser"
import {xss} from "express-xss-sanitizer"
import hpp from "hpp"
import cors from "cors"
import mongoSanitize from "express-mongo-sanitize"
import {RateLimiterMemory} from "rate-limiter-flexible"
import connectDB from "./config/db.js"
import auth from "./routes/userAuth.route.js"
import adminRoute from "./routes/admin.route.js"
import commonRoutes from "./routes/common.route.js"
import instructorRoute from "./routes/instructor.route.js"
import morgan from "morgan"
import studentRoutes from "./routes/student.route.js"
dotenv.config();
const port = process.env.PORT
connectDB()

const app = express()

const rateLimiter = new RateLimiterMemory({
  points: 100, // Higher limit for general API usage
  duration: 900, // 15 minutes
});

const globalLimiter = async (req, res, next) => {
  try {
    const clientIP = req.ip || req.connection.remoteAddress;
    await rateLimiter.consume(clientIP);
    next();
  } catch (error) {
    res.status(429).json({
      message: "Too many requests from this IP. Please try again after 15 minutes"
    });
  }
};

app.use(helmet())
app.use(express.json())
app.use(mongoSanitize({replaceWith:'_'}))
app.use(cookieParser())
app.use(xss())
app.use(hpp())
app.use(cors())
app.use(globalLimiter)
app.use(morgan("dev"))

app.use("/api/auth",auth)
app.use("/admin",adminRoute)
app.use("/instructor",instructorRoute)
app.use("/student",studentRoutes)
app.use("/common",commonRoutes)


app.use((err,req,res,next)=>{
  console.log("Global error middleware: ",err)
  res.status(500).json({
    success:false,
    message:"Internal server error"
  })
})

app.listen(port,()=>{
    console.log(`Server is running on port ${port}`)
})