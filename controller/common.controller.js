import bcrypt from "bcryptjs"
import unblockRequestValidation from "../validation/unblockRequest.validation.js"
import userAuth from "../model/user.model.js"
import { unblockRequestModel } from "../model/unblockRequest.model.js"

export const unBlockUserRequest = async(req,res) => {
    try {
        const {email,password,message}=req.body
        const {error}=unblockRequestValidation.validate(req.body)
        if(error){
            return res.status(400).json({message:error.details[0].message})
        }
        const user = await userAuth.findOne({email})
        const validPassword = await bcrypt.compare(password,user.password)
        if(!user || !validPassword){
            return res.status(400).json({message:"Invalid credentials"})
        }
        if(!user.isBlocked){
            return res.status(400).json({message:"Your account is not blocked"})
        }
        const existingUserRequest = await unblockRequestModel.findOne({user:user._id,status:"pending"})
        if(existingUserRequest){
            return res.status(400).json({message:"Unblock request already pending"})
        }
        const newUnblockRequest = new unblockRequestModel({
            user:user._id,
            message
        })
        await newUnblockRequest.save()
        res.status(201).json({message:"We received your unblock request. We will get back to you through mail"})
    } catch (error) {
        res.status(500).json({message:"Internal server error",error})
    }
}