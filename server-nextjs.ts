import { createServer } from "http";
import { parse } from "url";
import nextLib from "next";
import { getConfig } from "./server/config";
import { createScheduler } from "./server/scheduler-bree";
import { logger } from "./server/log";

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = 3000;

const app = nextLib({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(async () => {
  // Initialize configuration
  const config = getConfig();

  // Create and start Bree scheduler
  const scheduler = createScheduler(config);
  await scheduler.start();

  logger.info("Background jobs started");

  // Graceful shutdown handler
  const gracefulShutdown = async () => {
    logger.info("Shutting down gracefully...");
    await scheduler.stop();
    process.exit(0);
  };

  process.on("SIGTERM", gracefulShutdown);
  process.on("SIGINT", gracefulShutdown);

  // Create HTTP server
  createServer(async (req, res) => {
    const startTime = Date.now();
    const method = req.method;
    const url = req.url;

    // Log after response finishes
    res.on("finish", () => {
      const duration = Date.now() - startTime;
      const statusCode = res.statusCode;

      // Format: "GET /path 200 in 123ms"
      const logMessage = `${method} ${url} ${statusCode} in ${duration}ms`;

      // Log 404s and 500s as warnings/errors, others as info
      if (statusCode >= 500) {
        logger.error(logMessage);
      } else if (statusCode === 404) {
        logger.warn(logMessage);
      } else {
        logger.info(logMessage);
      }
    });

    try {
      const parsedUrl = parse(req.url!, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error("Error handling request:", err);
      res.statusCode = 500;
      res.end("Internal Server Error");
    }
  }).listen(port, () => {
    logger.info(`Server listening on http://${hostname}:${port}`);
  });
});
