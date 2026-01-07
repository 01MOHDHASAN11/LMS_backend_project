import { Worker } from "bullmq";
import { verificationRequestModel } from "../model/verificationRequest.model.js";

const instructorVerificationWorker = new Worker("upload-queue",async(job)=>{
    const {user,highestQualification,experienceYears,portfolioLink,status,resumeUrl,resumePublicId} = job.data

        const pendingRequest = await verificationRequestModel.findOne({
          user,
          status: "pending",
        });
        if (pendingRequest)
          return {skipped:true, reason:"Pending request exists"}

    const verificationRequest = await verificationRequestModel.create({
      user,
      highestQualification,
      experienceYears,
      portfolioLink,
      status,
      resumeUrl,
      resumePublicId,
    });
    
    return {skipped:false,verificationRequestId:verificationRequest._id}
},{
    connection:{
        host:"localhost",
        port:6379
    }
})

instructorVerificationWorker.on("completed",(job,result)=>console.log(`Job ${job.id} ${job.name} is completed`,result))
instructorVerificationWorker.on("failed",(job,err)=>console.error(`Resume upload job ${job.id} ${job.name} failed`,err))