import express from "express";
import * as teamLeadController from "../controllers/teamLeadController.js";

const router = express.Router();

router.put("/assign", teamLeadController.updateTeamLead);
router.get("/team-members", teamLeadController.getTeamMembers);

export default router;
