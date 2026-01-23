import pool from "../config/db.js";
import { assignTeamLeadSchema } from "../schema/teamLeadSchema.js";
import { formatJoiError } from "../utils/helpers.js";

export const update = async (data) => {
  // Validate input
  const { error } = assignTeamLeadSchema.validate(data);
  if (error) throw new Error(formatJoiError(error));

  const { employee_id, team_id } = data;

  // Optional: Check if employee exists
  const [employeeRows] = await pool.execute(
    "SELECT * FROM employee WHERE employee_id = ?",
    [employee_id]
  );
  if (!employeeRows.length) throw new Error("Employee not found");

  // Optional: Check if team exists
  const [teamRows] = await pool.execute(
    "SELECT * FROM team WHERE team_id = ?",
    [team_id]
  );
  if (!teamRows.length) throw new Error("Team not found");

  // Check if team already has a lead
  const [existingLead] = await pool.execute(
    "SELECT * FROM team_lead WHERE team_id = ?",
    [team_id]
  );

  if (existingLead.length) {
    // Update existing lead
    await pool.execute(
      "UPDATE team_lead SET employee_id = ?, status='Active' WHERE team_id = ?",
      [employee_id, team_id]
    );
  } else {
    // Insert new lead
    await pool.execute(
      "INSERT INTO team_lead (employee_id, team_id, status) VALUES (?, ?, 'Active')",
      [employee_id, team_id]
    );
  }

  return { message: "Team lead assigned successfully" };
};
