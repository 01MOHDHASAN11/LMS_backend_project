import { createBullBoard } from "@bull-board/api";
import { ExpressAdapter } from "@bull-board/express";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { emailQueue } from "../email.queue.js";
import { emailDLQ } from "../deadDLQ.queue.js";

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath("/admin/queues");

createBullBoard({
  queues: [new BullMQAdapter(emailQueue), new BullMQAdapter(emailDLQ)],
  serverAdapter,
});

export { serverAdapter };
