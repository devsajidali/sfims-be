import * as Project from "../models/projectModel.js";

export const createProject = async (data) => await Project.create(data);
export const getAllProjects = async (options) => await Project.findAll(options);
export const getProjectById = async (id) => await Project.findById(id);
export const updateProject = async (data) => await Project.update(data);
export const deleteProject = async (id, res) => await Project.remove(id, res);
