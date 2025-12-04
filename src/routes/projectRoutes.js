import express from "express";
import * as projectController from "../controllers/projectController.js";

const router = express.Router();

router.get("/", projectController.getAll);
router.get("/project", projectController.getById);
router.post("/project", projectController.create);
router.put("/project", projectController.update);
router.delete("/project", projectController.remove);

export default router;
