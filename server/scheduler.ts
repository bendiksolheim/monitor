import later from "@breejs/later";
import { log } from "./log";

export type Job = {
  name: string;
  fn: () => void;
  schedule: string;
};

export class Scheduler {
  jobs: Array<Job>;
  timers: Map<string, later.Timer>;

  constructor(jobs: Array<Job>) {
    this.jobs = Array.from(jobs); // Create a copy of the array
    this.timers = new Map();
  }

  start() {
    this.jobs.forEach((job) => {
      const schedule = later.parse.text(job.schedule);
      if (schedule.error >= 0) {
        log(`Error scheduling: ${job.schedule} - ${schedule.error}`);
      }
      const timer = later.setInterval(job.fn, schedule);
      this.timers.set(job.name, timer);
    });
    Array.from(this.timers.keys()).map((name) => {
      log(`Started service ${name}`);
    });
  }
}
