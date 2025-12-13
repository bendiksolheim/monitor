import events from "~/events";
import { Config, Heartbeat, Ntfy, Service } from "./config";
import { log } from "./log";
import notifications from "~/notifications";
import { Job, Scheduler } from "./scheduler";
import { formatNotificationMessage } from "./format-notification-message";
import services from "~/services.server";

export function scheduleJobs(config: Config): Scheduler {
  const serviceJobs = config.services.map(createJob);
  const heartbeat = [healthCheck(config.heartbeat)];
  const notify = ntfy(config.notify);

  return new Scheduler([serviceJobs, heartbeat, notify].flat());
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

function healthCheck(heartbeat?: Heartbeat): Job {
  if (heartbeat) {
    const uuid = heartbeat.uuid;

    return {
      name: "healthcheck",
      schedule: heartbeat.schedule,
      fn: async () => {
        const latestStatus = await services.status();
        const everythingOk = latestStatus.every((e: any) => e.ok);
        if (everythingOk) {
          log("Everything OK, pinging healthcheck");
          fetch(`https://hc-ping.com/${uuid}`);
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

function ntfy(notify?: Array<Ntfy>): Array<Job> {
  if (notify) {
    return notify.map((notify) => {
      const topic = notify.topic;
      const minutesBetween = notify.minutesBetween;
      return {
        name: "ntfy",
        schedule: notify.schedule,
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
              `Ntfy: ${minutesSinceLastNotification} minutes since last notification, waiting until ${minutesBetween}`,
            );
          }
        },
      };
    });
  } else {
    return [
      {
        name: "ntfy",
        schedule: "every 1 hour",
        fn: () => {},
      },
    ];
  }
}
