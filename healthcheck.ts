import { scheduleFunction } from "./scheduler.server.js";
import { getConfig } from "./config.js";
import { getLatestStatus } from "./app/db.server.js";

export function configureHealthcheck() {
  const config = getConfig();

  if (config.healthcheck) {
    const url = config.healthcheck.url;
    const expression = config.healthcheck.expression;
    console.log(`├─ Healthcheck activated (${expression})`);
    // Ping healthcheck every N minutes
    scheduleFunction(async () => {
      const latestStatus = await getLatestStatus();
      const everythingOk = latestStatus.every((e) => e.status === "OK");
      if (everythingOk) {
        console.log("Everything OK, pinging healthcheck");
        fetch(url);
      } else {
        console.log("Some service is down, postponing healthcheck ping");
      }
    }, expression);
  }
}
