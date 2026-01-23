import * as teamLeadService from "../services/teamLeadService.js";

export const updateTeamLead = async (req, res) => {
  try {
    const response = await teamLeadService.updateTeamLeadService(req.body);
    res.json(response);
  } catch (error) {
    console.log(error);
    res.status(400).json({ error: error.message });
  }
};

export const getTeamMembers = async (req, res) => {
  try {
    const response = await teamLeadService.teamLeadMembers(req.query.id);
    res.json(response);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
};
