import { parentPort, workerData } from "worker_threads";
import services from "../../app/lib/services.server.ts";
import { logger } from "../log.ts";
import type { Heartbeat } from "../config.ts";

interface WorkerData {
  heartbeat: Heartbeat;
}

const { heartbeat } = workerData as WorkerData;

(async () => {
  try {
    const latestStatus = await services.status();
    const everythingOk = latestStatus.every((e: any) => e.ok);

    if (everythingOk) {
      logger.info(`Everything OK, pinging heartbeat (${heartbeat.type})`);

      if (heartbeat.type === "healthchecks.io") {
        await fetch(`https://hc-ping.com/${heartbeat.uuid}`);
      } else if (heartbeat.type === "httpbin") {
        await fetch(`https://httpbin.org/get`);
      }
    } else {
      logger.info("Some service is down, postponing heartbeat ping");
    }

    if (parentPort) parentPort.postMessage("done");
  } catch (error) {
    logger.error(`Heartbeat error: ${error}`);
    if (parentPort) parentPort.postMessage("error");
  }
})();
