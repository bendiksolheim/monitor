import cron from "node-cron";
import { log } from "./log.js";
import events from "~/events";

export type Job = {
  service: string;
  expression: string;
  url: string;
  okStatusCode: number;
};

export function schedule(job: Job) {
  cron.schedule(job.expression, async () => {
    try {
      log(`Checking ${job.service}`);
      const start = Date.now();
      const response = await fetch(job.url, {
        signal: AbortSignal.timeout(10000),
        redirect: "manual",
      });
      log(`Service ${job.service}: ${response.status}`);
      const end = Date.now();
      const status = response.status === job.okStatusCode ? true : false;
      events.create({ service: job.service, ok: status, latency: end - start });
    } catch (e) {
      console.error("Exception during schedule:", e);
      events.create({
        service: job.service,
        ok: false,
        latency: undefined,
      });
    }
  });
}

export function scheduleFunction(fn: () => void, expression: string) {
  cron.schedule(expression, fn);
}
