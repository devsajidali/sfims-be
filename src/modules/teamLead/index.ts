import express from "express";
import * as teamLeadController from "./controller.ts";

const router = express.Router();

router.put("/assign", teamLeadController.updateTeamLead);
router.get("/team-members", teamLeadController.getTeamMembers);
router.put("/update-employee-team", teamLeadController.updateEmployeeTeam);
router.put(
  "/update-employee-project",
  teamLeadController.updateEmployeeProjects,
);

export default router;
