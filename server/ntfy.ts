import { scheduleFunction } from "./scheduler.server";
import { getConfig } from "./config";
import { log } from "./log";
import events from "~/events";
import notifications from "~/notifications";

export function configureNtfy() {
  const config = getConfig();

  if (config.ntfy) {
    const topic = config.ntfy.topic;
    const expression = config.ntfy.expression;
    const minutesBetween = config.ntfy.minutesBetween;
    log(`├─ Ntfy.sh activated (${expression})`);
    scheduleFunction(async () => {
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
    }, expression);
  }
}
