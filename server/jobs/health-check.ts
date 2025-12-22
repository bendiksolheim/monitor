import { parentPort, workerData } from "worker_threads";
import events from "../../app/lib/events.server.ts";
import { logger } from "../log.ts";

interface WorkerData {
  service: string;
  url: string;
  okStatusCode: number;
}

const { service, url, okStatusCode } = workerData as WorkerData;

(async () => {
  try {
    logger.info(`Checking service: ${service}`);
    const start = Date.now();

    const response = await fetch(url, {
      signal: AbortSignal.timeout(10000),
      redirect: "manual",
    });

    const end = Date.now();
    const status = response.status === okStatusCode;

    await events.create({
      service,
      ok: status,
      latency: end - start,
    });

    if (parentPort) parentPort.postMessage("done");
  } catch (error) {
    logger.error(`Error checking ${service}: ${error}`);

    await events.create({
      service,
      ok: false,
      latency: undefined,
    });

    if (parentPort) parentPort.postMessage("error");
  }
})();
