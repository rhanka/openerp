import { buildFoundationWorkerHandlers } from "./handlers/foundation";

export function describeWorker() {
  return {
    name: "OpenERP Foundation Worker",
    handlers: buildFoundationWorkerHandlers()
  };
}
