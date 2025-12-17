export const runtime = 'nodejs';

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { logger } = await import("./server/log.ts");

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
