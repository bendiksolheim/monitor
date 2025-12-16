import { logger } from "./server/log.ts";

export function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Patch console methods to use custom logger
    // This will catch Next.js internal logging
    console.error = (msg, ...args) => {
      const message = typeof msg === "string" ? msg : String(msg);
      logger.error(message, ...args);
    };
    console.warn = (msg, ...args) => {
      const message = typeof msg === "string" ? msg : String(msg);
      logger.warn(message, ...args);
    };
    console.info = (msg, ...args) => {
      const message = typeof msg === "string" ? msg : String(msg);
      logger.info(message, ...args);
    };
    console.log = (msg, ...args) => {
      const message = typeof msg === "string" ? msg : String(msg);
      logger.info(message, ...args);
    };
    console.debug = (msg, ...args) => {
      const message = typeof msg === "string" ? msg : String(msg);
      logger.debug(message, ...args);
    };
  }
}
