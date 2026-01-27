import * as auditLogService from "./service.ts";
import type { Request, Response } from "express";

export const getAll = async (req: Request, res: Response) => {
  try {
    const logs = await auditLogService.getAllAuditLogs();
    res.json(logs);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getById = async (req: Request, res: Response) => {
  try {
    const log = await auditLogService.getAuditLogById(Number(req.params.id));
    if (!log) throw new Error("Audit log not found");
    res.json(log);
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
};
