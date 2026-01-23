// src/server.js
import dotenv from "dotenv";
import app from "./app.js";

dotenv.config();

const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || "http://localhost";
const VERSION = process.env.APP_VERSION || "1.0.0";
const APP_NAME = process.env.APP_Name || "sfims-be";

app.listen(PORT, () => {
  console.log(`
 ${APP_NAME.toUpperCase()} v${VERSION}
──────────────────────────────────
🌐 URL: ${HOST}:${PORT}
🟢 Environment: ${process.env.NODE_ENV || "development"}
──────────────────────────────────
`);
});
