import express, { type Express } from "express";
import path from "path";
import { fileURLToPath } from "url";
import type { Server } from "http";
import logger from "./logger.ts";
import routes from "./routes.ts";
import adminRoutes from "./routes/admin.ts";
import db from "./db.ts";
import { migrateJsonToDatabase } from "./scripts/init-db.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app: Express = express();
const port = 3000;

// Run database migration on startup
migrateJsonToDatabase();

// Set up EJS
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "../views"));

// Serve static files
app.use(express.static(path.join(__dirname, "../public")));

// Parse JSON and URL-encoded bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Set up routes
app.use("/", routes(logger));
app.use("/admin", adminRoutes(logger));

const server: Server = app.listen(port, () => {
  logger.info(`X-ercise app listening at http://localhost:${port}`);
});

server.on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "EADDRINUSE") {
    logger.error(
      `Port ${port} is already in use. Another instance may be running.`,
    );
    logger.error(
      `Run "lsof -i :${port}" to find the process, or "pkill -f 'node src/app.js'" to kill it.`,
    );
    process.exit(1);
  } else {
    logger.error("Server error:", err);
    process.exit(1);
  }
});

const shutdown = (): void => {
  logger.info("Shutting down server...");
  server.close(() => {
    logger.info("Server shut down.");
    db.close();
    logger.info("Database connection closed.");
    process.exit(0);
  });
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

export { app, server };
