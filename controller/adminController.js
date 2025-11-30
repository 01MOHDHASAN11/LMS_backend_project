import userAuth from "../model/user.model.js"
import { blockUser, updateUserBlockStatusValidation } from "../validation/blockUser.validation.js"
import { unblockRequestModel } from "../model/unblockRequest.model.js"
import { sendUnblockStatusEmail } from "../utils/adminUnblockStatusUpdateEmail.js"
export const adminDashBoard = (req,res) => {
    res.json({message:`Welcome admin ${req.user.name}`})
}

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