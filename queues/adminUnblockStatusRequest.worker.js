import { Worker} from "bullmq";
import { sendUnblockStatusEmail } from "../utils/adminUnblockStatusUpdateEmail";

const unblockAdminResponse = new Worker("email-queue",async(jobs)=>{
    const {userEmail,userName,status,message} = jobs.data
    await sendUnblockStatusEmail(userEmail,userName,status,message)
},{
    connection:{
        host:"localhost",
        port:6379
    }
})

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