import express from "express";
import * as departmentController from "./controller.ts";

const router = express.Router();

router.get("/", departmentController.getAll);
router.get("/department", departmentController.getById);
router.post("/", departmentController.create);
router.put("/department", departmentController.update);
router.delete("/department", departmentController.remove);

export default router;
