import Bree from "bree";
import path from "path";
import { logger } from "./log";
import type { Config } from "./config";
import { tsPlugin } from "./ts-worker";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

Bree.extend(tsPlugin);

const isDev = process.env.NODE_ENV !== "production";

// In development: use TypeScript files with tsx
// In production: use compiled JavaScript files
const jobsDir = isDev
  ? path.join(process.cwd(), "server", "jobs")
  : path.join(__dirname, "jobs");

export function createScheduler(config: Config): Bree {
  const jobs = [];

  // Health check jobs for each service
  for (const service of config.services) {
    jobs.push({
      name: `health-${service.service}`,
      interval: service.schedule, // "every 5 minutes" works directly!
      path: path.join(jobsDir, `health-check.ts`),
      worker: {
        workerData: {
          service: service.service,
          url: service.url,
          okStatusCode: service.okStatusCode,
        },
      },
    });
  }

  // Healthchecks.io heartbeat
  if (config.heartbeat) {
    jobs.push({
      name: "heartbeat",
      interval: config.heartbeat.schedule,
      path: path.join(jobsDir, `heartbeat.ts`),
      worker: {
        workerData: {
          uuid: config.heartbeat.uuid,
        },
      },
    });
  }

  // Ntfy notifications
  if (config.notify) {
    for (const notify of config.notify) {
      jobs.push({
        name: `ntfy-${notify.topic}`,
        interval: notify.schedule,
        path: path.join(jobsDir, `ntfy.ts`),
        worker: {
          workerData: {
            topic: notify.topic,
            minutesBetween: notify.minutesBetween,
          },
        },
      });
    }
  }

  const bree = new Bree({
    jobs,
    logger: logger,
    root: false, // We provide absolute paths
    errorHandler: (error, workerMetadata) => {
      logger.error(`Job error in ${workerMetadata.name}: ${error.message}`);
    },
  });

  bree.on("worker created", (name) => {
    logger.info(`Started job: ${name}`);
  });

  return bree;
}
