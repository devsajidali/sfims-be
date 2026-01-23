import express from "express";
import * as employeeController from "../controllers/employeeController.js";
import { upload } from "../middlewares/authMiddleware.js";

const router = express.Router();

// All employees
router.get("/", employeeController.getAll);
// Single employee
router.get("/employee", employeeController.getById);
// Team lead team members
router.get("/team-members", employeeController.getTeamLeadMembersById);

// Employee bulk upload
router.post(
  "/bulk-upload",
  upload.single("file"),
  employeeController.bulkUpload
);

router.post("/", employeeController.create);
router.put("/", employeeController.update);
router.delete("/:id", employeeController.remove);

export default router;
