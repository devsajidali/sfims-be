import * as TeamLead from "../models/teamLeadModel.js";

export const updateTeamLeadService = async (data) =>
  await TeamLead.update(data);


export const teamLeadMembers = async (id) =>
  await TeamLead.getTeamMembersByLead(id);
