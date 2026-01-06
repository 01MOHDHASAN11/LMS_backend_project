import { Worker } from "bullmq";
import { resetPasswordEmail } from "../utils/resetPasswordMail.js";
import { emailDLQ } from "./deadDLQ.queue.js";

const forgetPasswordEmailWorker = new Worker("email-queue",
    async(jobs)=>{
        const {toEmail,token,userName} = jobs.data
        await resetPasswordEmail(toEmail,token,userName)
    },
    {
        connection:{
            host:"localhost",
            port:6379
        }
        
    }
)

forgetPasswordEmailWorker.on("completed",(job)=>console.log(`Email job ${job.name} completed`))
forgetPasswordEmailWorker.on("failed",async(job,err)=>{
    console.error(`Email job ${job.name} failed`)
    await emailDLQ.add("email-failed",{
        originalJobId:job.id,
        data:job.data,
        error:err.message
    },{
        removeOnComplete:false
    })
})