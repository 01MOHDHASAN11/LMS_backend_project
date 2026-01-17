import { Worker } from "bullmq";
import { sendVerificationEmail } from "../utils/signupEmailVerify.js";
import { resetPasswordEmail } from "../utils/resetPasswordMail.js";
import {
  sendInstructorVerificationEmail,
  sendUnblockStatusEmail,
} from "../utils/adminUnblockStatusUpdateEmail.js";
import { sendCourseReviewEmail } from "../utils/submitCourseReview.utils.js";
import { emailDLQ } from "./deadDLQ.queue.js";
import { bullRedisConfig } from "../config/bullmqRedis.js";

 const workers = new Worker(
  "email-queue",
  async (job) => {
    switch (job.name) {
      case "signup-verification":
        return sendVerificationEmail(
          job.data.toEmail,
          job.data.token,
          job.data.userName
        );

      case "forget-password":
        return resetPasswordEmail(
          job.data.toEmail,
          job.data.token,
          job.data.userName
        );

      case "admin-unblock-response":
        return sendUnblockStatusEmail(
          job.data.userEmail,
          job.data.userName,
          job.data.status,
          job.data.message
        );

      case "course-review-response":
        return sendCourseReviewEmail(
          job.data.toEmail,
          job.data.instructorName,
          job.data.courseTitle,
          job.data.status,
          job.data.feedback
        );

      case "instructor-verification-response":
        return sendInstructorVerificationEmail(
          job.data.toEmail,
          job.data.toName,
          job.data.status,
          job.data.message
        );

      case "forget-password-email":
        return resetPasswordEmail(
          job.data.toEmail,
          job.data.token,
          job.data.userName
        );

      default:
        throw new Error(`Unknown email job: ${job.name}`);
    }
  },
  {
    connection: bullRedisConfig,
  }
);

workers.on("failed", async (job, err) => {
  await emailDLQ.add(
    job.name,
    {
      originalJobId: job.id,
      queue: job.queueName,
      jobName: job.name,
      data: job.data,
      error: {
        message: err.message,
        stack: err.stack,
      },
      failedAt: new Date().toISOString(),
    },
    {
      removeOnComplete: false,
      removeOnFail: false,
    }
  );
  console.error(`Email job failed and moved to DLQ ${job.id} ${job.name}`);
});

export default workers