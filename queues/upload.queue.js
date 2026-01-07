import { Queue } from "bullmq";

export const uploadQueue = new Queue("upload-queue",{
    connection:{
        host:"localhost",
        port:6379
    }
})