import * as employeeService from "../services/employeeService.js";

export const getAll = async (req, res) => {
  try {
    const page = req.query.page ? parseInt(req.query.page, 10) : null;
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : null;

    const employees = await employeeService.getAllEmployees({ page, limit });
    res.json(employees);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getById = async (req, res) => {
  try {
    const employee = await employeeService.getEmployeeById(req.query.id);
    res.json(employee);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
};

export const getTeamLeadMembersById = async (req, res) => {
  try {
    if (!req.query.id) {
      return res.status(400).json({ error: "Team lead ID is required." });
    }
    const employee = await employeeService.allTeamMembers(req.query.id);
    res.json(employee);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
};

export const bulkUpload = async (req, res) => {
  try {
    // Ensure FE sent required fields
    const { department_id, project_id } = req.body;

    if (!req.file)
      return res
        .status(400)
        .json({ error: "Please upload a CSV, XLS or XLS file" });

    const fileName = req.file.originalname.toLowerCase();

    const validExtensions = [".csv", ".xls", ".xlsx"];
    const isValid = validExtensions.some((ext) => fileName.endsWith(ext));

    if (!isValid) {
      return res.status(400).json({
        error: "Invalid file format. Allowed: CSV, XLS, XLSX",
      });
    }

    if (!department_id || !project_id)
      return res
        .status(400)
        .json({ error: "department_id and project_id are required" });

    // Process file + insert employees
    const result = await employeeService.postProcessBulkFile(
      req.file,
      department_id,
      project_id
    );

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong" });
  }
};

export const create = async (req, res) => {
  try {
    const employee = await employeeService.createEmployee(req.body);
    res.status(201).json(employee);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const update = async (req, res) => {
  try {
    const employee = await employeeService.updateEmployee(
      req.params.id,
      req.body
    );
    res.json(employee);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const remove = async (req, res) => {
  try {
    await employeeService.deleteEmployee(req.params.id);
    res.status(204).send();
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
