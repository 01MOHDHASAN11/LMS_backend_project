import userAuth from "../model/user.model.js"
import { blockUser, updateUserBlockStatusValidation } from "../validation/blockUser.validation.js"
import { unblockRequestModel } from "../model/unblockRequest.model.js"
import { sendInstructorVerificationEmail, sendUnblockStatusEmail } from "../utils/adminUnblockStatusUpdateEmail.js"
import { verificationRequestModel } from "../model/verificationRequest.model.js"
import updateInstructorVerificationRequestValidation from "../validation/updateInstructorRequest.js"
import mongoose from "mongoose"
import courseReviewRequestModel from "../model/submitCourseReviewRequest.model.js"
import authCourse from "../model/course.model.js"
import { sendCourseReviewEmail } from "../utils/submitCourseReview.utils.js"



// User requests for unblock
export const blockUserController = async(req,res) => {
try {
    const {error} = blockUser.validate(req.body)
    if(error) return res.status(400).json({message:error.details[0].message})
    const userId = req.params.userId
    const {blockDays,reason, blockType} = req.body
    const user = await userAuth.findById(userId)
    if(!user) return res.json({message:"No user found"})
    if(user.role==="admin"){
        res.status(400).json({message:"Can't block this user"})
    }
    if(blockType==="permanent"){
        user.isBlocked=true
        user.blockedUntil=null
        user.blockReason=reason
        user.blockType=blockType
        await user.save()
        return res.status(200).json({message:"User blocked successfully",userData:user})
    }
    const blockUntil = new Date(Date.now()+blockDays*24*60*60*1000)
    user.isBlocked=true
    user.blockedUntil=blockUntil
    user.blockReason=reason
    user.blockType=blockType
    await user.save()
    res.status(200).json({message:"User blocked successfully",userData:user})    
} catch (error) {
    res.status(500).json({message:"Internal server error: ",error})
}
}

export const checkUserRequest = async(req,res) => {
    try {
        const page = (req.query.page) || 1
        const limit = (req.query.limit) || 20
        const skip = (page-1)*limit
        const requestedUser = await unblockRequestModel
                              .find()
                              .skip(skip).limit(limit)
                              .populate("user","name email role blockedUntil")
                              .sort({sentAt:1})
        res.status(200).json({requestedUser})
    } catch (error) {
        res.status(500).json({error})
    }

}

export const updateUserBlockStatus = async(req,res) => {
    try {
        const requestId = req.params.requestId
        // console.log(requestId)
        const {status,adminMessage} = req.body
        // console.log(status,adminMessage)
        const {error}=updateUserBlockStatusValidation.validate(req.body)
        if(error) return res.status(400).json({message:error.details[0].message})
        const blockedUser = await unblockRequestModel.findById(requestId).populate("user","name email isBlocked")
        // console.log(blockedUser)
        if(!blockedUser){
            return res.status(404).json({message:"User not found"})
        }
        // console.log(blockedUser.user._id)
        const user = await userAuth.findById(blockedUser.user._id)
        // console.log("user",user)
        if(!user){
            return res.status(404).json({message:"User not found"})
        }

        if(status==="approved"){
            blockedUser.status="approved",
            blockedUser.message=adminMessage || "User account has been approved",
            blockedUser.reviewedAt=Date.now()
            await blockedUser.save()
            user.isBlocked=false,
            user.blockUntil=null,
            await user.save()
        }
        if(status==="rejected"){
            blockedUser.status="rejected",
            user.isBlocked=true,
            await user.save()
            blockedUser.message=adminMessage || "User account has been rejected",
            blockedUser.reviewedAt=Date.now()
            await blockedUser.save()
        }
        sendUnblockStatusEmail(user.email,user.name,status,adminMessage).catch(error=>console.log("Email sending failed",error))
        if(status==="approved") return res.status(200).json({message:"User unblocked successfully"})
        if(status==="rejected") return res.status(200).json({message:"User unblock request rejected"})        
    } catch (error) {
        console.log(error)
        res.status(500).json({message:"Internal server error",error})
    }

}

export const getPendingUserRequest = async(req,res) => {
try {
    const {page=1,limit=10} = req.query
    const skip = (page-1)*limit
    const pendingUser = await unblockRequestModel.find({status:"pending"}).limit(limit).skip(skip)
    if(!pendingUser) return res.status(404).json({message:"No user request found"})
    res.status(200).json({pendingUser})
} catch (error) {
    res.status(500).json({message:"Internal server error",error})
}

}


// Instructor verification controller
export const getInstructorVerificationRequest = async(req,res) => {
    try {
        const limit = parseInt(req.query.limit) || 20
        const page = parseInt(req.query.page) || 1
        const sort = req.query.sort
        const status = req.query.status
        const sortOrder = (sort==="desc") ? -1 : 1
        const skip = (page-1)*limit
        let filter = {}
        if(status){
            filter.status=status
        }
    
        const allRequests = await verificationRequestModel
        .find(filter)
        .sort({createdAt:sortOrder})
        .skip(skip)
        .limit(limit)
        .populate("user","name email")

        const totalDocuments = await verificationRequestModel.countDocuments()
        res.status(200).json({
            page,
            limit,
            totalDocuments,
            pages:Math.ceil(totalDocuments/limit),
            allRequests
        })

    } catch (error) {
        res.status(500).json({message:"Internal server error",error})
    }
}

export const getSingleVerificationRequest = async(req,res) => {
    try {
        const {id} = req.params
        const requestData = await verificationRequestModel.findById(id).populate("user","name resumeUrl email")
        if(!requestData) return res.status(400).json({message:"Request data not found"})
        res.status(200).json({requestData})
    
    } catch (error) {
        res.status(500).json({message:"Internal server error",error})
    }
}

export const updateInstructorVerificationRequest = async(req,res) => {
    try {
        const {id} = req.params
        const {status,adminMessage=""} = req.body
        const {error} = updateInstructorVerificationRequestValidation.validate(req.body)
        if(error) return res.status(400).json({message:error.details[0].message})
        const updateRequest = await verificationRequestModel.findByIdAndUpdate(id,{status,adminMessage,reviewedAt:Date.now()},{new:true}).populate("user","name email")
        if(!updateRequest) return res.status(404).json({message:"No request found"})
        const instructorVerifiedBoolean = status==="approved" ? true : false
        const instructor = await userAuth.findByIdAndUpdate(updateRequest.user,{instructorVerified:instructorVerifiedBoolean},{new:true})
        if(!instructor) return res.status(404).json({message:"Instructor not found"})
        sendInstructorVerificationEmail(updateRequest.user.email,updateRequest.user.name,updateRequest.status,updateRequest.adminMessage)
        .then(()=>console.log("Email send to the instructor")).catch(err=>console.log(err))
        res.status(200).json({
            message:"Status updated successfully",
            updateRequest
        })
    } catch (error) {
        res.status(500).json({message:"Internal server error",error})
    }
}


export const reviewCourseRequest = async (req,res) => {
    const adminId = req.user._id
    const {requestId} = req.params
    const {feedback, action} = req.body
    if(!["rejected","approved"].includes(action.trim())){
        return res.status(400).json({success:false,message:"Invalid action"})
    }
    if(!mongoose.Types.ObjectId.isValid(requestId)){
        return res.status(400).json({success:false,message:"Invalid requestId"})
    }
    const session = await mongoose.startSession()
    try {
        session.startTransaction()
        const request = await courseReviewRequestModel.findById({
            _id:requestId
        }).session(session)

        if(!request || request.status!=="pending"){
            await session.abortTransaction()
            return res.status(404).json({
                success:false,
                message:"Invalid or already processed request"
            })
        }
        const existingCourse = await authCourse.findById({_id:request.course}).session(session)
        if(!existingCourse || existingCourse.status!=="review"){
            await session.abortTransaction()
            return res.status(400).json({success:false,message:"Invalid course id or course not in review state"})
        }
        if(action==="approved"){
            request.status="approved"
            existingCourse.status="published"
            existingCourse.publishedAt=new Date()
            existingCourse.reviewResponse.decision="approved"
        }
        else{
            request.status = "rejected"
            existingCourse.status="draft"
            existingCourse.reviewResponse.decision="rejected"
        }

        existingCourse.feedback=feedback
        existingCourse.reviewer = adminId
        existingCourse.reviewedAt=new Date()
        request.feedback = feedback
        request.reviewer=adminId

        await request.save({session})
        await existingCourse.save({session})
        await session.commitTransaction()

        res.status(200).json({success:true,message:"Request review successful"})


        setImmediate(() => {
        sendCourseReviewEmail({
            toEmail: request.instructorEmail,
            instructorName: request.instructorName,
            courseTitle: request.courseTitle,
            status: action,
            feedback,
        }).catch(err => {
            console.error("Email sending failed:", err);
        });
        });


    } catch (error) {
        console.error(error)
        await session.abortTransaction()
        return res.status(500).json({success:false,message:"Internal server error"})
    }
    finally{
        session.endSession()
    }
}