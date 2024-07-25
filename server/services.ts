import events from "~/events";
import { Config, Service } from "./config";
import { log } from "./log";
import notifications from "~/notifications";
import { Job, Scheduler } from "./scheduler";
import { formatNotificationMessage } from "./healthchecks/format-notification-message";
import services from "~/services.server";

export function scheduleJobs(config: Config): Scheduler {
  const jobs: Array<Job> = config.services
    .map(createJob)
    .concat(healthCheck(config), ntfy(config));

  return new Scheduler(jobs);
}

function createJob(service: Service): Job {
  const fn = async () => {
    try {
      log(`Checking ${service.service}`);
      const start = Date.now();
      const response = await fetch(service.url, {
        signal: AbortSignal.timeout(10000),
        redirect: "manual",
      });
      const end = Date.now();
      const status = response.status === service.okStatusCode ? true : false;
      const ev = {
        service: service.service,
        ok: status,
        latency: end - start,
      };
      events.create(ev);
    } catch (e) {
      const ev = {
        service: service.service,
        ok: false,
        latency: undefined,
      };
      events.create(ev);
    }
  };

  return {
    name: service.service,
    fn: fn,
    schedule: service.schedule,
  };
}

function healthCheck(config: Config): Job {
  if (config.healthcheck) {
    const url = config.healthcheck.url;
    return {
      name: "healthcheck",
      schedule: config.healthcheck.schedule,
      fn: async () => {
        const latestStatus = await services.status();
        const everythingOk = latestStatus.every((e: any) => e.ok);
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
      name: "healthcheck",
      schedule: "every 10 minutes",
      fn: () => {
        log("Note: healthcheck is disabled");
      },
    };
  }
}

function ntfy(config: Config): Job {
  if (config.ntfy) {
    const topic = config.ntfy.topic;
    const minutesBetween = config.ntfy.minutesBetween;
    return {
      name: "ntfy",
      schedule: config.ntfy.schedule,
      fn: async () => {
        const latestStatus = await services.status();
        const message = formatNotificationMessage(latestStatus);
        if (message === null) {
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
      name: "ntfy",
      schedule: "every 1 hour",
      fn: () => {},
    };
  }
}
