import { Queue } from "bullmq";
import { bullRedisConfig } from "../config/bullmqRedis.js";

console.log('Email worker starting')
export const emailQueue = new Queue("email-queue", {
  connection:bullRedisConfig
});
