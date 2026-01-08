import { Worker } from "bullmq";
import dotenv from "dotenv"
dotenv.config()
import { verificationRequestModel } from "../model/verificationRequest.model.js";
import connectDB from "../config/db.js";
import { emailDLQ } from "./deadDLQ.queue.js";

await connectDB()

const instructorVerificationWorker = new Worker(
  "upload-queue",
  async (job) => {
    try {
      const {
        user,
        highestQualification,
        experienceYears,
        portfolioLink,
        status,
        resumeUrl,
        resumePublicId
      } = job.data;

      if (!resumeUrl || !resumePublicId) {
        throw new Error("Missing resume data");
      }

      const pendingRequest = await verificationRequestModel.findOne({
        user,
        status: "pending",
      });

      if (pendingRequest) {
        return { skipped: true, reason: "Pending request exists" };
      }

      const verificationRequest = await verificationRequestModel.create({
        user,
        highestQualification,
        experienceYears,
        portfolioLink,
        status,
        resumeUrl,
        resumePublicId,
      });

      return { skipped: false, id: verificationRequest._id };
    } catch (err) {
      console.error("Worker error:", err);
      throw err; // important for retries
    }
  },
  {
    connection: { host: "localhost", port: 6379 },
  }
);

instructorVerificationWorker.on("completed",(job)=>console.log(`Resume ${job.name} uploaded successfully`))
instructorVerificationWorker.on("failed",async(job,err)=>{
  console.log(`Resume upload job ${job.name} failed`,err)
  await emailDLQ.add("resume-job",{
    jobId:job.id,
    jobName:job.name
  },{
    attempts:3,
    backoff:{type:"exponential",delay:5000},
    removeOnComplete:false
  })
})