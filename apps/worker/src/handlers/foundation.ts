export type WorkerRunState = "queued" | "running" | "succeeded" | "failed_retryable" | "failed_final";

export interface FoundationWorkerHandler {
  eventType: "notification.sent" | "audit.exported" | "system.update_preflight_requested";
  sideEffect: "notification_delivery" | "export_file_generation" | "update_preflight";
  audited: boolean;
}

export function buildFoundationWorkerHandlers(): FoundationWorkerHandler[] {
  return [
    { eventType: "notification.sent", sideEffect: "notification_delivery", audited: false },
    { eventType: "audit.exported", sideEffect: "export_file_generation", audited: true },
    { eventType: "system.update_preflight_requested", sideEffect: "update_preflight", audited: true }
  ];
}

export function shouldRetryWorkerRun(state: WorkerRunState): boolean {
  return state === "failed_retryable";
}
