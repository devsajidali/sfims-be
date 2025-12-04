import * as departmentService from "../services/departmentsService.js";

export const getAll = async (req, res) => {
  try {
    const assets = await departmentService.getAllDepartments(req.query);
    res.json(assets);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getById = async (req, res) => {
  try {
    const response = await departmentService.getDepartmentId(
      req.query.department_id
    );
    res.json(response);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
};

export const create = async (req, res) => {
  try {
    const response = await departmentService.createDepartment(req.body);
    res.status(201).json(response);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const update = async (req, res) => {
  try {
    const response = await departmentService.updateDepartment(req.body);
    res.json(response);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const remove = async (req, res) => {
  try {
    await departmentService.deleteDepartment(req.query.department_id, res);
    res.status(200).json({
      status: "success",
      message: "Department deleted successfully",
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
