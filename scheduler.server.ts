import cron from "node-cron";
import { insert } from "./app/db.server.ts";

export type Job = {
  service: string;
  expression: string;
  url: string;
  okStatusCode: number;
};

export function schedule(job: Job) {
  cron.schedule(job.expression, async () => {
    try {
      console.log(`Checking ${job.service}`);
      const response = await fetch(job.url, {
        signal: AbortSignal.timeout(10000),
      });
      console.log(`Service ${job.service}: ${response.status}`);
      const status = response.status === job.okStatusCode ? "OK" : "ERROR";
      insert({ service: job.service, status });
    } catch (e) {
      console.error("Exception during schedule:", e);
      insert({ service: job.service, status: "ERROR" });
    }
  });
}

export function scheduleFunction(fn: () => void, expression: string) {
  cron.schedule(expression, fn);
}
