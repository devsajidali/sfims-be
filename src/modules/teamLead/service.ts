import * as TeamLeadModel from "./model.ts";
import type {
  AssignTeamLeadPayload,
  UpdateEmployeeTeamPayload,
  UpdateEmployeeProjectsPayload,
  TeamLeadMembersResponse,
  MessageResponse,
} from "./types.ts";

export const updateTeamLeadService = async (
  data: AssignTeamLeadPayload,
): Promise<MessageResponse> => await TeamLeadModel.updateTeamLead(data);

export const teamLeadMembers = async (
  id: number,
): Promise<TeamLeadMembersResponse> =>
  await TeamLeadModel.getTeamMembersByLead(id);

export const updateTeam = async (
  data: UpdateEmployeeTeamPayload,
): Promise<MessageResponse> => await TeamLeadModel.updateEmployeeTeam(data);

export const updateProject = async (
  data: UpdateEmployeeProjectsPayload,
): Promise<MessageResponse> => await TeamLeadModel.updateEmployeeProjects(data);
