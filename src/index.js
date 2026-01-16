import "./server.js";

// start worker AFTER server boots
setTimeout(() => {
    console.log("Starting email worker")
  import("./queues/email.worker.js");
}, 5000);
