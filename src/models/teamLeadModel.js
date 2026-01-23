import pool from "../config/db.js";
import {
  assignTeamLeadSchema,
  updateEmployeeTeamSchema,
  joinProjectsSchema,
  findAllEmployeeOptionsSchema,
  getTeamMembersSchema,
} from "../schema/teamLeadSchema.js";
import { formatJoiError } from "../utils/helpers.js";

// Assign a team lead to a team
export const update = async (data) => {
  const { error } = assignTeamLeadSchema.validate(data);
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

  // Check if team already has a lead
  const [existingLead] = await pool.execute(
    "SELECT * FROM team_lead WHERE team_id = ?",
    [team_id],
  );

  if (existingLead.length) {
    await pool.execute(
      "UPDATE team_lead SET employee_id = ?, status='Active' WHERE team_id = ?",
      [employee_id, team_id],
    );
  } else {
    await pool.execute(
      "INSERT INTO team_lead (employee_id, team_id, status) VALUES (?, ?, 'Active')",
      [employee_id, team_id],
    );
  }

  return { message: "Team lead assigned successfully" };
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
    [teamLeadId]
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
    [teamInfo.team_id, teamLeadId]
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
export const joinProjects = async (data) => {
  const { error } = joinProjectsSchema.validate(data);
  if (error) throw new Error(formatJoiError(error));

  const { employee_id, project_ids } = data;

  // Check if employee exists
  const [employeeRows] = await pool.execute(
    "SELECT * FROM employee WHERE employee_id = ?",
    [employee_id],
  );
  if (!employeeRows.length) throw new Error("Employee not found");

  for (let project_id of project_ids) {
    await pool.execute(
      "INSERT IGNORE INTO employee_project (employee_id, project_id) VALUES (?, ?)",
      [employee_id, project_id],
    );
  }

  return { message: "Employee added to projects successfully" };
};

// Get employee's team
export const getEmployeeTeam = async (employee_id) => {
  if (!employee_id || isNaN(employee_id))
    throw new Error("Employee ID must be a valid number");

  const [rows] = await pool.execute(
    `SELECT t.team_id, t.team_name, d.department_name
     FROM employee_team et
     JOIN team t ON et.team_id = t.team_id
     JOIN department d ON t.department_id = d.department_id
     WHERE et.employee_id = ?`,
    [employee_id],
  );

  return rows[0] || null;
};

// Get all employees with team & department
export const getAllEmployeesWithTeamDept = async (options = {}) => {
  const { error } = findAllEmployeeOptionsSchema.validate(options);
  if (error) throw new Error(formatJoiError(error));

  const { page, limit, search } = options;
  const hasSearch = typeof search === "string" && search.trim().length >= 3;
  const hasPagination = page != null && limit != null;

  let whereClause = "";
  const params = [];

  if (hasSearch) {
    whereClause = " WHERE e.full_name LIKE ?";
    params.push(`%${search.trim()}%`);
  }

  if (hasPagination) {
    const countSql = `
      SELECT COUNT(*) as cnt
      FROM employee e
      LEFT JOIN employee_team et ON e.employee_id = et.employee_id
      LEFT JOIN team t ON et.team_id = t.team_id
      LEFT JOIN department d ON t.department_id = d.department_id
      ${whereClause}
    `;
    const [countRows] = await pool.execute(countSql, params);
    const total = countRows[0].cnt;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const dataSql = `
      SELECT e.employee_id, e.full_name, e.designation, e.role,
             t.team_name, d.department_name
      FROM employee e
      LEFT JOIN employee_team et ON e.employee_id = et.employee_id
      LEFT JOIN team t ON et.team_id = t.team_id
      LEFT JOIN department d ON t.department_id = d.department_id
      ${whereClause}
      ORDER BY e.employee_id
      LIMIT ? OFFSET ?
    `;
    const dataParams = params.concat([parseInt(limit), offset]);
    const [rows] = await pool.execute(dataSql, dataParams);

    return {
      total_records: total,
      page: parseInt(page),
      limit: parseInt(limit),
      records: rows,
    };
  } else {
    const dataSql = `
      SELECT e.employee_id, e.full_name, e.designation, e.role,
             t.team_name, d.department_name
      FROM employee e
      LEFT JOIN employee_team et ON e.employee_id = et.employee_id
      LEFT JOIN team t ON et.team_id = t.team_id
      LEFT JOIN department d ON t.department_id = d.department_id
      ${whereClause}
      ORDER BY e.employee_id
    `;
    const [rows] = await pool.execute(dataSql, params);
    return rows;
  }
};
