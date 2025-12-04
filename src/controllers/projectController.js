import * as projectService from "../services/projectService.js";

export const create = async (req, res) => {
  try {
    const project = await projectService.createProject(req.body);
    res.status(201).json(project);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const getAll = async (req, res) => {
  debugger;
  try {
    const projects = await projectService.getAllProjects(req.query);
    res.json(projects);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getById = async (req, res) => {
  try {
    const project = await projectService.getProjectById(req.query.id);
    res.json(project);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
};

export const update = async (req, res) => {
  try {
    const project = await projectService.updateProject(req.body);
    res.json(project);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const remove = async (req, res) => {
  try {
    await projectService.deleteProject(req.query.project_id, res);
    res.status(204).send();
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
