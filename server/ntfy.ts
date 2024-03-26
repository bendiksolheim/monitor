import { scheduleFunction } from "./scheduler.server";
import { getConfig } from "./config";
import { log } from "./log";
import {
  getLatestNotification,
  getLatestStatus,
  insertNotification,
} from "~/db.server";

export function configureNtfy() {
  const config = getConfig();

  if (config.ntfy) {
    const topic = config.ntfy.topic;
    const expression = config.ntfy.expression;
    const minutesBetween = config.ntfy.minutesBetween;
    log(`├─ Ntfy.sh activated (${expression})`);
    scheduleFunction(async () => {
      const latestStatus = await getLatestStatus();
      const numberDown = latestStatus.filter((e) => e.status !== "OK").length;
      if (numberDown === 0) {
        log("Ntfy: no services down");
        return;
      }

      const latestNotification = await getLatestNotification();
      const minutesSinceLastNotification =
        (latestNotification?.timestamp ?? new Date(0)).getTime() / (1000 * 60);
      if (minutesSinceLastNotification < minutesBetween) {
        const message = `${numberDown} service${
          numberDown > 1 ? "s" : ""
        } down`;
        log(`Ntfy: sending message [${message}]`);
        insertNotification({ message });

        fetch(`https://ntfy.sh/${topic}`, {
          method: "POST",
          body: message,
          headers: {
            Title: "Service down",
            Tags: "warning",
          },
        });
      } else {
        log("Ntfy: too short since last notification, skipping");
      }
    }, expression);
  }
}
