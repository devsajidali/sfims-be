import pool from "../config/db.js";
import {
  assignTeamLeadSchema,
  updateEmployeeTeamSchema,
  joinProjectsSchema,
  findAllEmployeeOptionsSchema,
  getTeamMembersSchema,
} from "../schema/teamLeadSchema.js";
import { formatJoiError } from "../utils/helpers.js";

export const update = async (data) => {
  const { error } = assignTeamLeadSchema.validate(data);
  if (error) throw new Error(formatJoiError(error));

  const { employee_id, team_id } = data;
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    // 1️⃣ Employee exists
    const [employeeRows] = await conn.execute(
      "SELECT employee_id FROM employee WHERE employee_id = ?",
      [employee_id],
    );
    if (!employeeRows.length) throw new Error("Employee not found");

    // 2️⃣ Team exists + department
    const [teamRows] = await conn.execute(
      "SELECT team_id, department_id FROM team WHERE team_id = ?",
      [team_id],
    );
    if (!teamRows.length) throw new Error("Team not found");

    const teamDeptId = teamRows[0].department_id;

    // 3️⃣ Get Management department
    const [managementDept] = await conn.execute(
      "SELECT department_id FROM department WHERE department_name = 'Management'",
    );
    if (!managementDept.length)
      throw new Error("Management department not found");

    const managementDeptId = managementDept[0].department_id;

    // 4️⃣ Get current active team lead
    const [currentLeadRows] = await conn.execute(
      "SELECT employee_id FROM team_lead WHERE team_id = ? AND status = 'Active'",
      [team_id],
    );

    const previousLeadId = currentLeadRows.length
      ? currentLeadRows[0].employee_id
      : null;

    // 5️⃣ Move NEW lead to Management + TeamLead role
    await conn.execute(
      "UPDATE employee SET department_id = ?, role = 'TeamLead' WHERE employee_id = ?",
      [managementDeptId, employee_id],
    );

    // 6️⃣ Ensure employee-team mapping
    const [empTeam] = await conn.execute(
      "SELECT 1 FROM employee_team WHERE employee_id = ? AND team_id = ?",
      [employee_id, team_id],
    );

    if (!empTeam.length) {
      await conn.execute(
        "INSERT INTO employee_team (employee_id, team_id) VALUES (?, ?)",
        [employee_id, team_id],
      );
    }

    // 7️⃣ Deactivate existing team lead
    await conn.execute(
      "UPDATE team_lead SET status = 'Inactive' WHERE team_id = ?",
      [team_id],
    );

    // 8️⃣ Assign / Activate new team lead (UPDATE if exists, else INSERT)
    const [leadRow] = await conn.execute(
      "SELECT team_lead_id FROM team_lead WHERE team_id = ? AND employee_id = ?",
      [team_id, employee_id],
    );

    if (leadRow.length) {
      await conn.execute(
        "UPDATE team_lead SET status = 'Active' WHERE team_id = ? AND employee_id = ?",
        [team_id, employee_id],
      );
    } else {
      await conn.execute(
        "INSERT INTO team_lead (employee_id, team_id, status) VALUES (?, ?, 'Active')",
        [employee_id, team_id],
      );
    }

    // 9️⃣ Revert PREVIOUS team lead (if different)
    if (previousLeadId && previousLeadId !== employee_id) {
      await conn.execute(
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

// Get team members by team lead
export const getTeamMembersByLead = async (teamLeadId) => {
  // Validate input
  const { error } = getTeamMembersSchema.validate({ teamLeadId });
  if (error) throw new Error(formatJoiError(error));

  // Get team + team lead info
  const [teamLeadRows] = await pool.execute(
    `SELECT 
        tl.team_id,
        t.team_name,
        e.employee_id,
        e.full_name,
        e.designation
     FROM team_lead tl
     JOIN team t ON tl.team_id = t.team_id
     JOIN employee e ON tl.employee_id = e.employee_id
     WHERE tl.employee_id = ? AND tl.status = 'Active'`,
    [teamLeadId],
  );

  if (!teamLeadRows.length) {
    throw new Error("Active TeamLead not found");
  }

  const teamInfo = teamLeadRows[0];

  // Get team members (excluding team lead to avoid duplicate)
  const [members] = await pool.execute(
    `SELECT e.employee_id, e.full_name, e.designation
     FROM employee_team et
     JOIN employee e ON et.employee_id = e.employee_id
     WHERE et.team_id = ?
       AND e.employee_id != ?`,
    [teamInfo.team_id, teamLeadId],
  );

  return {
    team: {
      team_id: teamInfo.team_id,
      team_name: teamInfo.team_name,
    },
    team_lead: {
      employee_id: teamInfo.employee_id,
      full_name: teamInfo.full_name,
      designation: teamInfo.designation,
    },
    members,
  };
};

// Update employee team
export const updateEmployeeTeam = async (data) => {
  const { error } = updateEmployeeTeamSchema.validate(data);
  if (error) throw new Error(formatJoiError(error));

  const { employee_id, team_id } = data;

  // Check if employee exists
  const [employeeRows] = await pool.execute(
    "SELECT * FROM employee WHERE employee_id = ?",
    [employee_id],
  );
  if (!employeeRows.length) throw new Error("Employee not found");

  // Check if team exists
  const [teamRows] = await pool.execute(
    "SELECT * FROM team WHERE team_id = ?",
    [team_id],
  );
  if (!teamRows.length) throw new Error("Team not found");

  // Update or insert mapping
  const [existing] = await pool.execute(
    "SELECT * FROM employee_team WHERE employee_id = ?",
    [employee_id],
  );

  if (existing.length) {
    await pool.execute(
      "UPDATE employee_team SET team_id = ? WHERE employee_id = ?",
      [team_id, employee_id],
    );
  } else {
    await pool.execute(
      "INSERT INTO employee_team (employee_id, team_id) VALUES (?, ?)",
      [employee_id, team_id],
    );
  }

  return { message: "Employee team updated successfully" };
};

// Join employee to projects
export const updateEmployeeProjects = async (data) => {
  const { error } = joinProjectsSchema.validate(data);
  if (error) throw new Error(formatJoiError(error));

  const { employee_id, project_ids } = data;

  //  Check if employee exists
  const [employeeRows] = await pool.execute(
    "SELECT employee_id FROM employee WHERE employee_id = ?",
    [employee_id],
  );
  if (!employeeRows.length) throw new Error("Employee not found");

  //  Validate project IDs exist
  const [validProjects] = await pool.execute(
    `SELECT project_id FROM project WHERE project_id IN (${project_ids
      .map(() => "?")
      .join(",")})`,
    project_ids,
  );

  if (validProjects.length !== project_ids.length) {
    throw new Error("One or more project IDs are invalid");
  }

  //  Transaction (IMPORTANT)
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Remove existing mappings
    await connection.execute(
      "DELETE FROM employee_project WHERE employee_id = ?",
      [employee_id],
    );

    // Insert new mappings
    for (const project_id of project_ids) {
      await connection.execute(
        "INSERT INTO employee_project (employee_id, project_id) VALUES (?, ?)",
        [employee_id, project_id],
      );
    }

    await connection.commit();
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }

  return {
    message: "Employee projects updated successfully",
  };
};
