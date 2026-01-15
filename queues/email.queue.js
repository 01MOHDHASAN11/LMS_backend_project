import { Queue } from "bullmq";
import dotenv from "dotenv"
import { bullRedisConfig } from "../config/bullmqRedis.js";
dotenv.config()
export const emailQueue = new Queue("email-queue", {
  connection:bullRedisConfig
});
