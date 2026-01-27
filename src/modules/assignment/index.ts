import express from "express";
import * as assignmentController from "./controller.ts";

const router = express.Router();

router.post("/create", assignmentController.create);
router.put("/update-status", assignmentController.updateStatusRequest);
router.put("/issue-assets", assignmentController.approveAssetRequest);
router.get("/pending", assignmentController.getPendingApprovals);

router.get("/all-requests", assignmentController.getAllRequests);
router.get("/all-pending-approvals", assignmentController.getPendingApprovals);
router.get("/all-employee-assets", assignmentController.getEmployeeAssets);

export default router;
