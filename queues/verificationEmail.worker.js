import { Worker } from "bullmq";
import { sendVerificationEmail } from "../utils/signupEmailVerify.js";
import { emailDLQ } from "./deadDLQ.queue.js";


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

emailWorker.on("completed",(job)=>console.log(`Email job ${job.id} completed`))
emailWorker.on("failed",async(job,err)=>{
    console.error(`Job ${job.id} failed after retries`)

    await emailDLQ.add("email-failed",{
        originalJobId:job.id,
        data:job.data,
        error:err.message
    },
    {
        removeOnComplete:false
    }
)
})

console.log("📨 Email Worker running...");
