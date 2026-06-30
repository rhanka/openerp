import { buildFoundationWorkerHandlers } from "./handlers/foundation.js";

export function describeWorker() {
  return {
    name: "OpenERP Foundation Worker",
    handlers: buildFoundationWorkerHandlers()
  };
}
