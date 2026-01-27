import express from "express";
import * as auditLogController from "./controller.ts";

const router = express.Router();

router.get("/", auditLogController.getAll);
router.get("/:id", auditLogController.getById);

export default router;
