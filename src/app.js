import express from "express";
import projectRoutes from "./routes/projectRoutes.js";
import employeeRoutes from "./routes/employeeRoutes.js";
import departmentsRoutes from "./routes/departmentsRoutes.js";
import assetRoutes from "./routes/assetRoutes.js";
import assignmentRoutes from "./routes/assignmentRoutes.js";
import auditLogRoutes from "./routes/auditLogRoutes.js";
import teamLeadRoutes from "./routes/teamLeadRoutes.js";

import chalk from "chalk";

const app = express();
app.use(express.json());

app.use((req, res, next) => {
  const startTime = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - startTime;
    const status = res.statusCode;

    const statusColor =
      status >= 500
        ? chalk.red(status)
        : status >= 400
          ? chalk.yellow(status)
          : chalk.green(status);

    console.log(
      `${chalk.blue(req.method)} ${req.originalUrl} | Status: ${statusColor} | ${chalk.gray(duration + "ms")}`,
    );
  });

  next();
});

app.use("/api/employees", employeeRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/departments", departmentsRoutes);
app.use("/api/assets", assetRoutes);
app.use("/api/assignments", assignmentRoutes);
app.use("/api/team-lead", teamLeadRoutes);

app.use("/api/audit-logs", auditLogRoutes);

export default app;
