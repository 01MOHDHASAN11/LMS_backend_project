import { Queue } from "bullmq";

export const emailDLQ = new Queue("email-dlq", {
  connection: {
    host: "localhost",
    port: 6379,
  },
});
