import { parentPort, workerData } from "worker_threads";
import services from "../../app/lib/services.server.ts";
import { logger } from "../log.ts";

interface WorkerData {
  uuid: string;
}

const { uuid } = workerData as WorkerData;

(async () => {
  try {
    const latestStatus = await services.status();
    const everythingOk = latestStatus.every((e: any) => e.ok);

    if (everythingOk) {
      logger.info("Everything OK, pinging healthcheck");
      await fetch(`https://hc-ping.com/${uuid}`);
    } else {
      logger.info("Some service is down, postponing healthcheck ping");
    }

    if (parentPort) parentPort.postMessage("done");
  } catch (error) {
    logger.error(`Heartbeat error: ${error}`);
    if (parentPort) parentPort.postMessage("error");
  }
})();
