import events from "~/events";
import cron from "node-cron";
import { Config, Service } from "./config";
import { log } from "./log";
import { oneDayAgo } from "~/util/dates";
import notifications from "~/notifications";

export type Job = {
  service: string;
  expression: string;
  url: string;
  okStatusCode: number;
};

export function scheduleJobs(config: Config) {
  const jobs = config.services
    .map((service) => ({
      expression: service.expression,
      job: createJobFunction(service),
    }))
    .concat(cleanupJob(), healthCheck(config), ntfy(config));
  _scheduleJobs(jobs);
}

function _scheduleJobs(jobs: Array<{ expression: string; job: () => void }>) {
  jobs.forEach((job) => cron.schedule(job.expression, job.job));
}

function createJobFunction(job: Job): () => void {
  return async () => {
    try {
      log(`Checking ${job.service}`);
      const start = Date.now();
      const response = await fetch(job.url, {
        signal: AbortSignal.timeout(10000),
        redirect: "manual",
      });
      log(`Service ${job.service}: ${response.status}`);
      const end = Date.now();
      const status = response.status === job.okStatusCode ? true : false;
      events.create({ service: job.service, ok: status, latency: end - start });
    } catch (e) {
      console.error("Exception during schedule:", e);
      events.create({
        service: job.service,
        ok: false,
        latency: undefined,
      });
    }
  };
}

function cleanupJob(): { expression: string; job: () => void } {
  return {
    expression: "*/10 * * * *",
    job: () => {
      events.remove({
        where: {
          created: {
            lt: oneDayAgo(),
          },
        },
      });
    },
  };
}

function healthCheck(config: Config): { expression: string; job: () => void } {
  if (config.healthcheck) {
    const url = config.healthcheck.url;
    return {
      expression: config.healthcheck.expression,
      job: async () => {
        const latestStatus = await events.latestStatus();
        const everythingOk = latestStatus.every((e) => e.ok);
        if (everythingOk) {
          log("Everything OK, pinging healthcheck");
          fetch(url);
        } else {
          log("Some service is down, postponing healthcheck ping");
        }
      },
    };
  } else {
    return {
      expression: "* * * * *",
      job: () => {},
    };
  }
}

function ntfy(config: Config): { expression: string; job: () => void } {
  if (config.ntfy) {
    const topic = config.ntfy.topic;
    const expression = config.ntfy.expression;
    const minutesBetween = config.ntfy.minutesBetween;
    return {
      expression: config.ntfy.expression,
      job: async () => {
        const latestStatus = await events.latestStatus();
        const numberDown = latestStatus.filter((e) => !e.ok).length;
        if (numberDown === 0) {
          log("Ntfy: no services down");
          return;
        }

        const latestNotification = await notifications.single({
          orderBy: { timestamp: "desc" },
        });
        const latestNotificationTimestamp = (
          latestNotification?.timestamp ?? new Date(0)
        ).getTime();
        const minutesSinceLastNotification =
          (Date.now() - latestNotificationTimestamp) / (1000 * 60);
        if (minutesSinceLastNotification > minutesBetween) {
          const message = `${numberDown} service${
            numberDown > 1 ? "s" : ""
          } down`;
          log(`Ntfy: sending message [${message}]`);
          await notifications.create({ message });

          fetch(`https://ntfy.sh/${topic}`, {
            method: "POST",
            body: message,
            headers: {
              Title: "Service down",
              Tags: "warning",
            },
          });
        } else {
          log(
            `Ntfy: ${minutesSinceLastNotification} minutes since last notification, waiting until ${minutesBetween}`
          );
        }
      },
    };
  } else {
    return {
      expression: "* * * * *",
      job: () => {},
    };
  }
}
