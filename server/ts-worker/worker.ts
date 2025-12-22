import { workerData } from "worker_threads";
import(workerData.path);

/**
 * More or less a copy of https://github.com/breejs/ts-worker but rewritten to module syntax
 */
