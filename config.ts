import yaml from "js-yaml";
import fs from "fs";
import path from "path";
import { Job } from "./scheduler.server";

const isDev = process.env.NODE_ENV === "development";

type Healthcheck = {
  url: string;
  expression: string;
};

export type Config = {
  services: Array<Job>;
  healthcheck?: Healthcheck;
};

function getConfig(): Config {
  try {
    const cwd = path.resolve();
    const config = isDev
      ? path.join(cwd, "config", "config.yml")
      : path.join("/config", "config.yml");
    const doc: Config = yaml.load(fs.readFileSync(config, "utf-8")) as Config;
    return doc;
  } catch (e) {
    console.error("Error parsing config file", e);
    process.exit(1);
  }
}

export { getConfig };
