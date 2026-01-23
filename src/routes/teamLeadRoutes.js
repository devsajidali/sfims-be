import express from "express";
import * as teamLeadController from "../controllers/teamLeadController.js";

const router = express.Router();

router.put("/assign", teamLeadController.updateTeamLead);

export default router;
