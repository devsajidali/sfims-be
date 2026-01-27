import type { Request, Response } from "express";

import * as projectService from "./service.ts";

import type {
  CreateProjectPayload,
  UpdateProjectPayload,
  FindAllProjectsOptions,
} from "./types.ts";

export const create = async (
  req: Request<{}, {}, CreateProjectPayload>,
  res: Response,
) => {
  try {
    const project = await projectService.createProject(req.body);
    res.status(201).json(project);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const getAll = async (
  req: Request<{}, {}, {}, FindAllProjectsOptions>,
  res: Response,
) => {
  try {
    const projects = await projectService.getAllProjects(req.query);
    res.json(projects);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getById = async (
  req: Request<{}, {}, {}, { id: string }>,
  res: Response,
) => {
  try {
    const project = await projectService.getProjectById(Number(req.query.id));
    res.json(project);
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
};

export const update = async (
  req: Request<{}, {}, UpdateProjectPayload>,
  res: Response,
) => {
  try {
    const project = await projectService.updateProject(req.body);
    res.json(project);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const remove = async (
  req: Request<{}, {}, {}, { project_id: string }>,
  res: Response,
) => {
  try {
    await projectService.deleteProject(Number(req.query.project_id));
    res.status(204).send();
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};
