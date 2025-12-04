import * as auditLogService from "../services/auditLogService.js";

export const getAll = async (req, res) => {
  try {
    const logs = await auditLogService.getAllAuditLogs();
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getById = async (req, res) => {
  try {
    const log = await auditLogService.getAuditLogById(req.params.id);
    res.json(log);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
};
