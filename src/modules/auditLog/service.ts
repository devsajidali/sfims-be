import * as AuditLogModel from "./model.ts";
import type { AuditLog } from "./types.ts";

export const getAllAuditLogs = async (): Promise<AuditLog[]> => {
  return await AuditLogModel.findAll();
};

export const getAuditLogById = async (id: number): Promise<AuditLog | null> => {
  return await AuditLogModel.findById(id);
};
