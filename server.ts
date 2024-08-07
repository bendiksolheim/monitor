import { createRequestHandler } from "@remix-run/express";
import express from "express";
import { getConfig } from "server/config.js";
import { scheduleJobs } from "server/services.js";
import { log } from "./server/log";

const config = getConfig();
const scheduler = scheduleJobs(config);
scheduler.start();

const viteDevServer =
  process.env.NODE_ENV === "production"
    ? null
    : await import("vite").then((vite) =>
        vite.createServer({ server: { middlewareMode: true } })
      );

const app = express();
if (viteDevServer) {
  app.use(viteDevServer.middlewares);
} else {
  app.use("/assets", express.static("build/client/assets"));
}
app.use(express.static("build/client"));

const build = viteDevServer
  ? () => viteDevServer.ssrLoadModule("virtual:remix/server-build")
  : await import("./build/server/index.js");

//@ts-ignore Not sure why this typecheck fails, but it does. Ignoring it for now
app.all("*", createRequestHandler({ build }));

app.listen(3000, () => {
  log("App listening on http://localhost:3000");
});
