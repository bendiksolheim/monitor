import fs from "fs";
import { ZodError, z } from "zod";
import path from "path";
import { fromZodError } from "zod-validation-error";

const isDev = process.env.NODE_ENV === "development";

const service = z.object({
  service: z.string(),
  schedule: z.string(),
  url: z.string().url(),
  okStatusCode: z.number().int().positive().lte(599),
});

const healthchecksio = z.object({
  type: z.literal("healthcheaks.io"),
  uuid: z.string().uuid(),
  schedule: z.string(),
});

const heartbeats = z.discriminatedUnion("type", [healthchecksio]);

const ntfy = z.object({
  topic: z.string(),
  schedule: z.string(),
  minutesBetween: z.number(),
});

const config = z.object({
  services: z.array(service),
  heartbeat: heartbeats.optional(),
  notify: z.array(ntfy).optional(),
  nodes: z.array(z.string()).optional(),
});

export type Config = z.infer<typeof config>;
export type Service = z.infer<typeof service>;
export type Heartbeat = z.infer<typeof heartbeats>;
export type Ntfy = z.infer<typeof ntfy>;
export type Healthchecksio = z.infer<typeof healthchecksio>

function getConfig(): Config {
  try {
    const cwd = path.resolve();
    const configFile = isDev
      ? path.join(cwd, "config", "config.json")
      : path.join("/config", "config.json");
    const json = JSON.parse(fs.readFileSync(configFile, "utf-8"));
    const doc = config.parse(json);
    return doc;
  } catch (e) {
    if (e instanceof ZodError) {
      const readableError = fromZodError(e);
      console.error(readableError);
    } else {
      console.error("Error parsing config file", e);
    }
    process.exit(1);
  }
}

export { getConfig };
