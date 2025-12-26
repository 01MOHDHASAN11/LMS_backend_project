import authCourse from "../model/course.model.js"
import redisClient from "../config/redis.js"
import cloudinary from "../config/cloudinary.js"
import upload from "../middleware/uploadResume.middleware.js"
import fs from "fs"
import { verificationRequestModel } from "../model/verificationRequest.model.js"
import { draftCourseValidation } from "../validation/draftCourse.js"
import mongoose from "mongoose"





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
        const result = await cloudinary.uploader.upload(req.file.path,
        {
            resource_type:"auto",
            folder:"resumes",
            access_mode:"public"
        })
        fs.unlinkSync(req.file.path)
        const verificationRequest = new verificationRequestModel({user,highestQualification,experienceYears,portfolioLink,status:"pending",resumeUrl:result.secure_url,resumePublicId:result.public_id})
        await verificationRequest.save()
        res.status(201).json({message:"Verification request created"})
    } catch (error) {
        console.log(error)
        res.status(500).json({message:"Internal server error",error})
    }
}



export const viewInstructorVerificationRequests = async(req,res) => {
    try {
        const limit = req.query.limit || 20
        const page = req.query.page || 1
        const skip = (page-1)*limit
        const status = req.query.status
        let filter = {user:req.user._id}
        if(status){
            filter.status=status
        }
        const existingUser = await verificationRequestModel.find(filter).skip(skip).limit(limit).populate("user","name email status")
        const totalDocuments = await verificationRequestModel.find(filter).countDocuments()
        // if(existingUser.length) return res.status(404).json({message:"No request"})
        res.json({
            page,
            totalPages:Math.ceil(totalDocuments/limit),
            limit,
            existingUser
        })
    } catch (error) {
        res.status(500).json({message:"Internal server error"})
    }
}

const MAX_DRAFT_COURSES = 20
export const createCourseDraft = async(req,res) =>{
    const session = await mongoose.startSession()
    let uploadResult=null
    try {
        let parsedTags
        try {
            parsedTags = JSON.parse(req.body.tags)
        } catch (error) {
            return res.status(400).json({message:"Invalid tags format"})
        }
        const instructorId = req.user._id               
        const {price,description,title,category} = req.body
        const thumbnailUrl = req.file
        if(!thumbnailUrl){
            return res.status(400).json({message:"Thumbnail is required"})
        }
        const {error} = draftCourseValidation.validate({...req.body,tags:parsedTags})
        if(error){
            return res.status(400).json({message:error.details[0].message})
        }
        uploadResult = await cloudinary.uploader.upload(req.file.path,{
        folder:"thumbnail",
        resource_type:"auto",
        access_mode:"public"
        })
        await session.withTransaction(async()=>{
            const limitDraft = await authCourse.findOne(
                {
                    instructor:instructorId,
                    status:{$in:["draft","review","archived"]}
                }
            ).skip(MAX_DRAFT_COURSES).select({_id:1}).session(session)

            if(limitDraft){
                throw new Error("DRAFT_LIMIT_EXCEEDED")
            }

        await authCourse.create(
            [{
            instructor:instructorId,
            thumbnailUrl:uploadResult.secure_url,
            tags:parsedTags,
            thumbnailUrlPublicId:uploadResult.public_id,
            price,
            description,
            title,
            category,
            modules:[],
            courseDuration:0,
            status:"draft",
            publishedAt:null,
            createdAt:Date.now()
        }],{session}
        )
        })
    res.status(201).json({message:"Course draft created successfully"})
    } catch (error) {
        if(error.message==="DRAFT_LIMIT_EXCEEDED"){
            res.status(409).json({message:"Too many draft or review courses. Please publish existing courses first."})
        }
        if(uploadResult?.public_id){
            await cloudinary.uploader.destroy(uploadResult.public_id)
        }
        console.log(error)
        res.status(500).json({message:"Internal server error",error})
    }
    finally{
        if(req.file?.path){
            fs.unlink(req.file.path,()=>{})
        }
        session.endSession()
    }
}

export const addCourseModule = async(req,res) => {
    const instructor = req.user._id
    const {draftCourseId} = req.params
    const {title,videoTitles} = req.body
    const files = req.files
    let uploadedVideos

    if(!mongoose.Types.ObjectId.isValid(draftCourseId)){
        return res.status(400).json({message:"Invalid course id"})
    }
    if(!title || typeof title !=="string" || title.trim().length===0){
        return res.status(400).json({message:"Title is required and its type must be string"})
    }
    if(!videoTitles){
        return res.status(400).json({message:"videoTitles are required"})
    }
    const parsedVideoTitles = JSON.parse(videoTitles)
    const normalizedVideoTitles = Array.isArray(parsedVideoTitles) ? parsedVideoTitles : [parsedVideoTitles]
    if(normalizedVideoTitles.length !== files.length){
        return res.status(400).json({
            message: "Number of video titles must match number of uploaded videos"
        })
    }

    const course = await authCourse.findOne({
        instructor,
        status:"draft",
        _id:draftCourseId
    })
    if(!files || files.length===0){
        return res.status(400).json({message:"At least one video is required"})
    }
    const moduleTitle = title.trim()
    if(!moduleTitle){
        return res.status(400).json({message:"Module title is required"})
    }
    if(!course){
        return res.status(404).json({message:"Draft course not found"})
    }
    const moduleOrder = course.modules.length+1

    try {
    uploadedVideos = await Promise.all(
        files.map((file,index)=>(
            cloudinary.uploader.upload(file.path,{
                folder:"videos",
                resource_type:"video"
            }).then(result=>({
                title:normalizedVideoTitles[index].trim(),
                videoUrl:result.secure_url,
                videoPublicId:result.public_id,
                videoSizeInBytes:result.bytes,
                order:index+1,
                duration:result.duration,
                createdAt:Date.now(),
                updatedAt:Date.now()
            }))
        ))
    )
    const newModule = {
            title:moduleTitle,
            videos:uploadedVideos,
            moduleDuration:uploadedVideos.reduce((seconds,video)=>seconds+(video.duration || 0),0),
            order:moduleOrder,
            createdAt:Date.now(),
            updatedAt:Date.now()
        }
        course.modules.push(newModule)
        course.courseDuration=course.modules.reduce((total,module)=>total+(module.moduleDuration || 0),0)
        await course.save()
        res.status(201).json({message:"Module created successfully"})
    } catch (error) {
        if(uploadedVideos?.length){
            await Promise.all(
                uploadedVideos.map((videos)=>{
                return cloudinary.uploader.destroy(videos.videoPublicId,{resource_type:"video"})
            })
            )
            
        }
        console.log(error)
        res.status(500).json({message:"Internal server error",error})
    }
    finally{
        files.forEach((file)=>{
            fs.unlink(file.path,()=>{})
        })
    }
}

