// Minimal mirror of the foundation queue types so apps/worker stays free of a
// direct workspace dependency on @openerp/api at this stage. Once apps/worker
// gets its first cross-package import, replace these with re-exports.

export interface TenantContext {
  organizationId: string;
  actorUserId: string;
}

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
export type PayloadSummary = Record<string, JsonValue>;

export interface ClaimedJob {
  jobId: string;
  organizationId: string;
  jobType: string;
  payload: PayloadSummary;
  attempts: number;
  scheduledAt: string;
}

export interface JobHandle {
  jobId: string;
  organizationId: string;
  jobType: string;
  status: "queued" | "running" | "succeeded" | "failed" | "cancelled";
  attempts: number;
  scheduledAt: string;
  startedAt: string | null;
  completedAt: string | null;
}
