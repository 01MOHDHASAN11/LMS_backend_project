import authCourse from "../model/course.model.js"
import redisClient from "../config/redis.js"
import cloudinary from "../config/cloudinary.js"
import upload from "../middleware/multer.middleware.js"
import fs from "fs"
import { verificationRequestModel } from "../model/verificationRequest.model.js"


export const createCourse = async(req,res) => {
    try {
    const instructorId = req.user._id
    redisClient.del(`instructor:${instructorId}`)
    const course = await authCourse.create({
        title:req.body.title,
        description:req.body.description,
        instructor:instructorId
    })
    return res.status(200).json({
        message:"New course created successfully",
        course
    })
    } catch (error) {
        res.status(500).json(error)
    }
}

export const getAllCourses = async(req,res) =>{
    try {
        let cacheKey = `instructor:${req.user._id}`
        let cacheData = await redisClient.get(cacheKey)
        if(cacheData){
            return res.status(200).json({
                source:"cache",
                data:JSON.parse(cacheData)
            })
        }
        const instructorId = req.user._id
        const instructorCourses = await authCourse.find({instructor:instructorId}).populate("instructor","name email")
        await redisClient.set(cacheKey,JSON.stringify(instructorCourses),{EX:120})
        res.status(200).json(instructorCourses)
    } catch (error) {
        res.status(500).json(error)
    }
}

export const updateCourse = async(req,res) => {
    try {
        const instructorId = req.user._id
        redisClient.del(`instructor:${instructorId}`)
        const {title,description} = req.body
        const {courseId} = req.params
        const course = await authCourse.findById(courseId)
        if(!course) return res.status(404).json({message:"NO course found by this ID"})
        if(course.instructor.toString()!==instructorId.toString()){
            return res.status(403).json({message:"You are not allowed to update this course"})
        }
        course.title=title ?? course.title
        course.description=description ?? course.description

        await course.save()
        res.status(200).json({message:"Course updated",course})
    } catch (error) {
        res.status(500).json(error)
    }
}

export const instructorVerification = async(req,res) => {
    try {
        const {highestQualification, experienceYears, portfolioLink} = req.body
        const resumeFile = req.file
        if(!resumeFile) return res.status(400).json({message:"Resume is required"})
        const user = req.user._id
        if(!user) return res.status(400).json({message:"User id not found"})
        if(!highestQualification) return res.status(400).json({message:"Highest qualification field is required"})
        const pendingRequest = await verificationRequestModel.findOne({user,status:"pending"})
        if(pendingRequest) return res.status(400).json({message:"Your verification request is in pending state"})
        const result = await cloudinary.uploader.upload(req.file.path)
        fs.unlinkSync(req.file.path)
        const verificationRequest = new verificationRequestModel({user,highestQualification,experienceYears,portfolioLink,status:"pending",resumeUrl:result.url,resumePublicId:result.public_id})
        verificationRequest.save()
        res.status(201).json({message:"Verification request created"})
    } catch (error) {
        console.log(error)
        res.status(500).json({message:"Internal server error",error})
    }
}