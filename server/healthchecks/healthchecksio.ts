import { Job } from "server/scheduler";
import { z } from "zod";
import services from "~/services.server";
import { log } from "../log";

const healthchecksio = z.object({
  type: z.literal("healthcheaks.io"),
  uuid: z.string().uuid(),
  schedule: z.string(),
});

function healthchecksioJob(config: z.infer<typeof healthchecksio>): Job {
  return {
    name: "healthcheck",
    schedule: config.schedule,
    fn: async () => {
      const latestStatus = await services.status();
      const everythingOk = latestStatus.every((e) => e.ok);
      if (everythingOk) {
        log("Everything OK, pinging Healthchecks.io");
        fetch(`https://hc-ping.com/${config.uuid}`);
      } else {
        log("Some service down, notifying Healthchecks.io");
        fetch(`https://hc-ping.com/${config.uuid}/fail`);
      }
    },
  };
}

export { healthchecksio, healthchecksioJob };
