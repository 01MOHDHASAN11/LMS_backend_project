import "./server.js";

// start worker AFTER server boots
setTimeout(() => {
  import("./queues/email.worker.js");
}, 5000);
