import pool from "../../config/db.ts";
import type {
  AssignTeamLeadPayload,
  UpdateEmployeeTeamPayload,
  UpdateEmployeeProjectsPayload,
  TeamLeadMembersResponse,
  MessageResponse,
  TeamMember,
} from "./types.ts";
import { formatJoiError } from "../../utils/helpers.ts";
import {
  assignTeamLeadSchema,
  updateEmployeeTeamSchema,
  joinProjectsSchema,
  getTeamMembersSchema,
} from "./schema.ts";
import type { RowDataPacket, OkPacket } from "mysql2/promise";

// Update Team Lead
export const updateTeamLead = async (
  data: AssignTeamLeadPayload,
): Promise<MessageResponse> => {
  const { error } = assignTeamLeadSchema.validate(data);
  if (error) throw new Error(formatJoiError(error));

  const { employee_id, team_id } = data;
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    // Employee exists
    const [employeeRows] = await conn.execute<RowDataPacket[]>(
      "SELECT employee_id FROM employee WHERE employee_id = ?",
      [employee_id],
    );
    if (!employeeRows.length) throw new Error("Employee not found");

    // Team exists
    const [teamRows] = await conn.execute<RowDataPacket[]>(
      "SELECT team_id, department_id FROM team WHERE team_id = ?",
      [team_id],
    );
    if (!teamRows.length) throw new Error("Team not found");
    const teamDeptId = teamRows[0].department_id;

    // Management department
    const [managementDept] = await conn.execute<RowDataPacket[]>(
      "SELECT department_id FROM department WHERE department_name = 'Management'",
    );
    if (!managementDept.length)
      throw new Error("Management department not found");
    const managementDeptId = managementDept[0].department_id;

    // Current active team lead
    const [currentLeadRows] = await conn.execute<RowDataPacket[]>(
      "SELECT employee_id FROM team_lead WHERE team_id = ? AND status = 'Active'",
      [team_id],
    );
    const previousLeadId = currentLeadRows.length
      ? currentLeadRows[0].employee_id
      : null;

    // Move new lead to Management + TeamLead
    await conn.execute<OkPacket>(
      "UPDATE employee SET department_id = ?, role = 'TeamLead' WHERE employee_id = ?",
      [managementDeptId, employee_id],
    );

    // Ensure employee-team mapping
    const [empTeam] = await conn.execute<RowDataPacket[]>(
      "SELECT 1 FROM employee_team WHERE employee_id = ? AND team_id = ?",
      [employee_id, team_id],
    );
    if (!empTeam.length) {
      await conn.execute<OkPacket>(
        "INSERT INTO employee_team (employee_id, team_id) VALUES (?, ?)",
        [employee_id, team_id],
      );
    }

    // Deactivate existing lead
    await conn.execute<OkPacket>(
      "UPDATE team_lead SET status = 'Inactive' WHERE team_id = ?",
      [team_id],
    );

    // Activate new lead
    const [leadRow] = await conn.execute<RowDataPacket[]>(
      "SELECT team_lead_id FROM team_lead WHERE team_id = ? AND employee_id = ?",
      [team_id, employee_id],
    );
    if (leadRow.length) {
      await conn.execute<OkPacket>(
        "UPDATE team_lead SET status = 'Active' WHERE team_id = ? AND employee_id = ?",
        [team_id, employee_id],
      );
    } else {
      await conn.execute<OkPacket>(
        "INSERT INTO team_lead (employee_id, team_id, status) VALUES (?, ?, 'Active')",
        [employee_id, team_id],
      );
    }

    // Revert previous lead if different
    if (previousLeadId && previousLeadId !== employee_id) {
      await conn.execute<OkPacket>(
        "UPDATE employee SET role = 'Employee', department_id = ? WHERE employee_id = ?",
        [teamDeptId, previousLeadId],
      );
    }

    await conn.commit();
    return {
      message:
        "Team lead updated. New lead moved to Management, previous lead reverted to Employee.",
    };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

// Get team members by lead
export const getTeamMembersByLead = async (
  teamLeadId: number,
): Promise<TeamLeadMembersResponse> => {
  const { error } = getTeamMembersSchema.validate({ teamLeadId });
  if (error) throw new Error(formatJoiError(error));

  const [teamLeadRows] = await pool.execute<RowDataPacket[]>(
    `SELECT tl.team_id, t.team_name, e.employee_id, e.full_name, e.designation
     FROM team_lead tl
     JOIN team t ON tl.team_id = t.team_id
     JOIN employee e ON tl.employee_id = e.employee_id
     WHERE tl.employee_id = ? AND tl.status = 'Active'`,
    [teamLeadId],
  );
  if (!teamLeadRows.length) throw new Error("Active TeamLead not found");
  const teamInfo = teamLeadRows[0];

  const [members] = await pool.execute<RowDataPacket[]>(
    `SELECT e.employee_id, e.full_name, e.designation
     FROM employee_team et
     JOIN employee e ON et.employee_id = e.employee_id
     WHERE et.team_id = ? AND e.employee_id != ?`,
    [teamInfo.team_id, teamLeadId],
  );

  // Type cast to TeamMember[]
  const teamMembers: TeamMember[] = members.map((m) => ({
    employee_id: m.employee_id,
    full_name: m.full_name,
    designation: m.designation,
  }));

  return {
    team: { team_id: teamInfo.team_id, team_name: teamInfo.team_name },
    team_lead: {
      employee_id: teamInfo.employee_id,
      full_name: teamInfo.full_name,
      designation: teamInfo.designation,
    },
    members: teamMembers,
  };
};

// Update employee team
export const updateEmployeeTeam = async (
  data: UpdateEmployeeTeamPayload,
): Promise<MessageResponse> => {
  const { error } = updateEmployeeTeamSchema.validate(data);
  if (error) throw new Error(formatJoiError(error));

  const { employee_id, team_id } = data;

  const [employeeRows] = await pool.execute<RowDataPacket[]>(
    "SELECT * FROM employee WHERE employee_id = ?",
    [employee_id],
  );
  if (!employeeRows.length) throw new Error("Employee not found");

  const [teamRows] = await pool.execute<RowDataPacket[]>(
    "SELECT * FROM team WHERE team_id = ?",
    [team_id],
  );
  if (!teamRows.length) throw new Error("Team not found");

  const [existing] = await pool.execute<RowDataPacket[]>(
    "SELECT * FROM employee_team WHERE employee_id = ?",
    [employee_id],
  );
  if (existing.length) {
    await pool.execute<OkPacket>(
      "UPDATE employee_team SET team_id = ? WHERE employee_id = ?",
      [team_id, employee_id],
    );
  } else {
    await pool.execute<OkPacket>(
      "INSERT INTO employee_team (employee_id, team_id) VALUES (?, ?)",
      [employee_id, team_id],
    );
  }

  return { message: "Employee team updated successfully" };
};

// Update employee projects
export const updateEmployeeProjects = async (
  data: UpdateEmployeeProjectsPayload,
): Promise<MessageResponse> => {
  const { error } = joinProjectsSchema.validate(data);
  if (error) throw new Error(formatJoiError(error));

  const { employee_id, project_ids } = data;

  const [employeeRows] = await pool.execute<RowDataPacket[]>(
    "SELECT employee_id FROM employee WHERE employee_id = ?",
    [employee_id],
  );
  if (!employeeRows.length) throw new Error("Employee not found");

  const [validProjects] = await pool.execute<RowDataPacket[]>(
    `SELECT project_id FROM project WHERE project_id IN (${project_ids
      .map(() => "?")
      .join(",")})`,
    project_ids,
  );
  if (validProjects.length !== project_ids.length)
    throw new Error("One or more project IDs are invalid");

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.execute<OkPacket>(
      "DELETE FROM employee_project WHERE employee_id = ?",
      [employee_id],
    );
    for (const project_id of project_ids) {
      await conn.execute<OkPacket>(
        "INSERT INTO employee_project (employee_id, project_id) VALUES (?, ?)",
        [employee_id, project_id],
      );
    }
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }

  return { message: "Employee projects updated successfully" };
};
