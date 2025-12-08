import express from "express";
import * as assignmentController from "../controllers/assignmentController.js";

const router = express.Router();

router.get("/", assignmentController.getAll);
router.post("/assign", assignmentController.create);

router.get("/:id", assignmentController.getById);
router.put("/:id", assignmentController.update);
router.delete("/:id", assignmentController.remove);

export default router;
