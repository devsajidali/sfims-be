import * as teamLeadService from "./service.ts";
import type { Request, Response } from "express";

export const updateTeamLead = async (req: Request, res: Response) => {
  try {
    const response = await teamLeadService.updateTeamLeadService(req.body);
    res.json(response);
  } catch (error: any) {
    console.error(error);
    res.status(400).json({ error: error.message });
  }
};

export const getTeamMembers = async (req: Request, res: Response) => {
  try {
    const response = await teamLeadService.teamLeadMembers(Number(req.query.id));
    res.json(response);
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
};

export const updateEmployeeTeam = async (req: Request, res: Response) => {
  try {
    const response = await teamLeadService.updateTeam(req.body);
    res.json(response);
  } catch (error: any) {
    console.error(error);
    res.status(400).json({ error: error.message });
  }
};

export const updateEmployeeProjects = async (req: Request, res: Response) => {
  try {
    const response = await teamLeadService.updateProject(req.body);
    res.json(response);
  } catch (error: any) {
    console.error(error);
    res.status(400).json({ error: error.message });
  }
};
