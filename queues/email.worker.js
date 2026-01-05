import { Worker } from "bullmq";
import { sendVerificationEmail } from "../utils/signupEmailVerify";

const emailWorker = new Worker("email-queue",
    async(jobs)=>{
        const {toEmail,token,userName} = jobs.data
        await sendVerificationEmail(toEmail,token,userName)
    },
    {
        connection:{
            host:"localhost",
            port:6379
        }
    }
)

emailWorker.on("completed",(job)=>console.log(`Email job ${job._id} completed`))
emailWorker.on("failed",(job,err)=>console.log(`Email job ${job._id} failed`,err))