import { parentPort, workerData } from "worker_threads";
import services from "../../app/lib/services.server";
import notifications from "../../app/lib/notifications.server";
import { logger } from "../log";
import { formatNotificationMessage } from "../../app/lib/format-notification-message";

interface WorkerData {
  topic: string;
  minutesBetween: number;
}

const { topic, minutesBetween } = workerData as WorkerData;

(async () => {
  try {
    const latestStatus = await services.status();
    const message = formatNotificationMessage(latestStatus);

    if (message === null) {
      logger.info("Ntfy: no services down");
      if (parentPort) parentPort.postMessage("done");
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
      logger.info(`Ntfy: sending message [${message}]`);
      await notifications.create({ message });

      await fetch(`https://ntfy.sh/${topic}`, {
        method: "POST",
        body: message,
        headers: {
          Title: "Service down",
          Tags: "warning",
        },
      });
    } else {
      logger.info(
        `Ntfy: ${minutesSinceLastNotification} minutes since last notification, waiting until ${minutesBetween}`,
      );
    }

    if (parentPort) parentPort.postMessage("done");
  } catch (error) {
    logger.error(`Ntfy error: ${error}`);
    if (parentPort) parentPort.postMessage("error");
  }
})();
