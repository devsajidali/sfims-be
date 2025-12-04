import * as AuditLog from '../models/auditLogModel.js';

export const getAllAuditLogs = async () => await AuditLog.findAll();
export const getAuditLogById = async (id) => await AuditLog.findById(id);
