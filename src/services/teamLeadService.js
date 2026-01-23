import * as TeamLead from "../models/teamLeadModel.js";

export const updateTeamLeadService = async (data) =>
  await TeamLead.update(data);
