import * as departmentsService from "../services/departmentsService.js";

export const create = async (req, res) => {
  try {
    const asset = await departmentsService.createDepartment(req.body);
    res.status(201).json(asset);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const getAll = async (req, res) => {
  try {
    const assets = await departmentsService.getAllDepartments(req.body);
    res.json(assets);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getById = async (req, res) => {
  try {
    const asset = await departmentsService.getDepartmentId(req.params.id);
    res.json(asset);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
};

export const update = async (req, res) => {
  try {
    const asset = await departmentsService.updateDepartment(req.params.id, req.body);
    res.json(asset);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const remove = async (req, res) => {
  try {
    await departmentsService.deleteDepartment(req.params.id);
    res.status(204).send();
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
