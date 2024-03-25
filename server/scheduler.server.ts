import cron from "node-cron";
import { insert } from "../app/db.server.ts";
import { log } from "./log.js";

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
      const status = response.status === job.okStatusCode ? "OK" : "ERROR";
      insert({ service: job.service, status, latency: end - start });
    } catch (e) {
      console.error("Exception during schedule:", e);
      insert({ service: job.service, status: "ERROR", latency: null });
    }
  });
}

export function scheduleFunction(fn: () => void, expression: string) {
  cron.schedule(expression, fn);
}
