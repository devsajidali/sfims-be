import * as Project from "./model.ts";
import type {
  CreateProjectPayload,
  UpdateProjectPayload,
  FindAllProjectsOptions,
  Project as ProjectType,
  PaginatedProjects,
} from "./types.ts";

export const createProject = async (
  data: CreateProjectPayload,
): Promise<ProjectType> => {
  return Project.create(data);
};

export const getAllProjects = async (
  options: FindAllProjectsOptions,
): Promise<ProjectType[] | PaginatedProjects> => {
  return Project.findAll(options);
};

export const getProjectById = async (id: number): Promise<ProjectType> => {
  return Project.findById(id);
};

export const updateProject = async (
  data: UpdateProjectPayload,
): Promise<ProjectType> => {
  return Project.update(data);
};

export const deleteProject = async (id: number): Promise<boolean> => {
  return Project.remove(id);
};
