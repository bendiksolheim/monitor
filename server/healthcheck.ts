import { scheduleFunction } from "./scheduler.server.js";
import { getConfig } from "./config.js";
import events from "~/events";
import { log } from "./log.js";

export function configureHealthcheck() {
  const config = getConfig();

  if (config.healthcheck) {
    const url = config.healthcheck.url;
    const expression = config.healthcheck.expression;
    log(`├─ Healthcheck activated (${expression})`);
    // Ping healthcheck every N minutes
    scheduleFunction(async () => {
      const latestStatus = await events.latestStatus();
      const everythingOk = latestStatus.every((e) => e.ok);
      if (everythingOk) {
        log("Everything OK, pinging healthcheck");
        fetch(url);
      } else {
        log("Some service is down, postponing healthcheck ping");
      }
    }, expression);
  }
}
