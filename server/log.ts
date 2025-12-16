// Force colors in worker threads by setting environment variable if not already set
// Worker threads don't have TTY, but we still want colors in logs
// MUST be set before importing picocolors since it reads env vars at import time
if (typeof process.env.FORCE_COLOR === "undefined") {
  process.env.FORCE_COLOR = "1";
}

import pc from "picocolors";

type LogLevel = "debug" | "info" | "warn" | "error";

const levelColors = {
  debug: pc.cyan,
  info: pc.green,
  warn: pc.yellow,
  error: pc.red,
} as const;

function serializeArg(arg: any): string {
  if (typeof arg === "string") return arg;
  if (typeof arg === "number" || typeof arg === "boolean") return String(arg);
  if (arg === null) return "null";
  if (arg === undefined) return "undefined";
  try {
    return JSON.stringify(arg);
  } catch (err) {
    // Handle circular references or other JSON.stringify errors
    return String(arg);
  }
}

export function log(level: LogLevel, ...args: any[]) {
  const now = new Date();
  const serialized = args.map(serializeArg).join(", ");
  const colorize = levelColors[level];
  const message = `${colorize(
    `[${now.toISOString()}] [${level.toUpperCase()}]`,
  )} ${serialized}\n`;
  if (level === "error") {
    process.stderr.write(message);
  } else {
    process.stdout.write(message);
  }
}

export const logger = {
  debug: (message: string, ...args: any[]) => log("debug", message, ...args),
  info: (message: string, ...args: any[]) => log("info", message, ...args),
  warn: (message: string, ...args: any[]) => log("warn", message, ...args),
  error: (message: string, ...args: any[]) => log("error", message, ...args),
};
