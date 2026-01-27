export interface AssignTeamLeadPayload {
  employee_id: number;
  team_id: number;
}

export interface UpdateEmployeeTeamPayload {
  employee_id: number;
  team_id: number;
}

export interface UpdateEmployeeProjectsPayload {
  employee_id: number;
  project_ids: number[];
}

export interface TeamMember {
  employee_id: number;
  full_name: string;
  designation: string;
}

export interface TeamLeadMembersResponse {
  team: { team_id: number; team_name: string };
  team_lead: { employee_id: number; full_name: string; designation: string };
  members: TeamMember[];
}

export interface MessageResponse {
  message: string;
}
