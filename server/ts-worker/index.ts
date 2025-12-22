import path from "path";
import { Worker } from "worker_threads";
import type Bree from "bree";
import { fileURLToPath } from "url";

/**
 * More or less a copy of https://github.com/breejs/ts-worker but rewritten to module syntax
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function tsPlugin<T = unknown>(opts: T, bree: typeof Bree) {
  //@ts-ignore
  opts = opts || {};

  //@ts-ignore
  const oldInit = bree.prototype.init;

  // define accepted extensions
  //@ts-ignore
  bree.prototype.init = async function () {
    if (!this.config.acceptedExtensions.includes(".ts"))
      this.config.acceptedExtensions.push(".ts");

    return oldInit.call(this);
  };

  const oldCreateWorker = bree.prototype.createWorker;

  bree.prototype.createWorker = function (filename, options) {
    if (filename.endsWith(".ts")) {
      //@ts-ignore
      options.workerData.path = filename;

      return new Worker(path.resolve(__dirname, "worker.ts"), options);
    }

    return oldCreateWorker(filename, options);
  };
}
