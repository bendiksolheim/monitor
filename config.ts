import fs from "fs";
import { ZodError, z } from "zod";
import path from "path";
import { fromZodError } from "zod-validation-error";

const isDev = process.env.NODE_ENV === "development";

const service = z.object({
  service: z.string(),
  expression: z.string(),
  url: z.string().url(),
  okStatusCode: z.number().int().positive().lte(599),
});

const healthcheck = z.object({
  url: z.string().url(),
  expression: z.string(),
});

const schema = z.object({
  services: z.array(service),
  healthcheck: healthcheck.optional(),
});

export type Config = z.infer<typeof schema>; // {

function getConfig(): Config {
  try {
    const cwd = path.resolve();
    const config = isDev
      ? path.join(cwd, "config", "config.json")
      : path.join("/config", "config.json");
    const json = JSON.parse(fs.readFileSync(config, "utf-8"));
    const doc = schema.parse(json);
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
