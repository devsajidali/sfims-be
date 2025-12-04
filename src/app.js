import express from "express";
import projectRoutes from "./routes/projectRoutes.js";
import employeeRoutes from "./routes/employeeRoutes.js";
import departmentsRoutes from "./routes/departmentsRoutes.js";
import assetRoutes from "./routes/assetRoutes.js";
import assignmentRoutes from "./routes/assignmentRoutes.js";
import auditLogRoutes from "./routes/auditLogRoutes.js";

const app = express();

app.use(express.json());
app.use("/api/employees", employeeRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/departments", departmentsRoutes);

app.use("/api/assets", assetRoutes);
app.use("/api/assignments", assignmentRoutes);
app.use("/api/audit-logs", auditLogRoutes);

export default app;
