import { Queue } from "bullmq";
import { bullRedisConfig } from "../config/bullmqRedis.js";

export const emailDLQ = new Queue("email-dlq", {
  connection: bullRedisConfig
});
