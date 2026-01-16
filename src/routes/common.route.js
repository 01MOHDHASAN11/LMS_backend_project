import express from "express";
import { authorize } from "../middleware/authorize.middleware.js";
import { unBlockUserRequest } from "../controller/common.controller.js";
const commonRoutes = express.Router();

commonRoutes.post("/unblock-request", unBlockUserRequest);

export default commonRoutes;
