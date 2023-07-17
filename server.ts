import { createRequestHandler } from "@remix-run/express";
import { installGlobals } from "@remix-run/node";
import compression from "compression";
import express from "express";
import { getConfig } from "./config.js";
import { schedule, scheduleFunction } from "./scheduler.server.js";
import { removeOld } from "./app/db.server.js";
import { configureHealthcheck } from "./healthcheck.js";

const build: any = await import("./build/index.js");

installGlobals();

const config = getConfig();

console.log("┌─────Services─────");
config.services.forEach((service) => {
  console.log(`├─ ${service.service} (${service.expression})`);
  schedule(service);
});

console.log("│");

// Remove old events every 10 minutes
scheduleFunction(removeOld, "*/10 * * * *");

configureHealthcheck();

console.log("└──────────────────");

const app = express();

app.use(compression());

// http://expressjs.com/en/advanced/best-practice-security.html#at-a-minimum-disable-x-powered-by-header
app.disable("x-powered-by");

// Remix fingerprints its assets so we can cache forever.
app.use(
  "/build",
  express.static("public/build", { immutable: true, maxAge: "1y" })
);

// Everything else (like favicon.ico) is cached for an hour. You may want to be
// more aggressive with this caching.
app.use(express.static("public", { maxAge: "1h" }));

const MODE = process.env.NODE_ENV;

app.all("*", createRequestHandler({ build, mode: MODE }));

const port = process.env.PORT || 3000;

app.listen(port, async () => {
  console.log(`\n✅ App ready: http://localhost:${port}`);

  if (process.env.NODE_ENV === "development") {
    const { broadcastDevReady } = await import("@remix-run/node");
    broadcastDevReady(build);
  }
});
