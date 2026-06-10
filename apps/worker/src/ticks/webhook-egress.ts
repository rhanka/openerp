// Per-tenant adapter for the webhook-egress run service (AUTOMATION-RUNTIME A0-2).
//
// Import strategy: the runDueWebhookDeliveries function is injected as a dep to avoid
// cross-package rootDir violations at tsc lint time. In production the caller
// passes the real function from @sentropic/openerp-api; in tests a vi.fn() mock.

import type { Queryable, WorkerTenantContext } from "./scheduled-delivery.js";

export type { Queryable, WorkerTenantContext };

export interface WebhookEgressPort {
  send(req: {
    url: string;
    body: string;
    headers: Record<string, string>;
    timeoutMs: number;
  }): Promise<
    | { ok: true; httpStatus: number; durationMs: number }
    | { ok: false; kind: string; httpStatus: number | null; message: string; durationMs: number }
  >;
}

export interface RunDueWebhookDeliveriesResult {
  processed: number;
  succeeded: number;
  failed: number;
  skipped: number;
  asOf: Date;
}

export interface RunDueWebhookDeliveriesDeps {
  port?: WebhookEgressPort;
  timeoutMs?: number;
}

export interface WebhookEgressTickContext {
  db: Queryable;
  organizationId: string;
  actorUserId: string;
  asOf?: Date;
  /** Optional egress port forwarded into deps.port. */
  egressPort?: WebhookEgressPort;
  /** Optional timeout override forwarded into deps.timeoutMs. */
  timeoutMs?: number;
  /** Injected service. Pass runDueWebhookDeliveries from @sentropic/openerp-api in production. */
  runDue: (
    db: Queryable,
    tenant: WorkerTenantContext,
    asOf?: Date,
    deps?: RunDueWebhookDeliveriesDeps
  ) => Promise<RunDueWebhookDeliveriesResult>;
}

async function applyScope(db: Queryable, organizationId: string): Promise<void> {
  await db.query("select set_config('app.current_organization_id', $1, true)", [organizationId]);
}

async function releaseScope(db: Queryable): Promise<void> {
  await db.query("select set_config('app.current_organization_id', '', false)", []);
}

/**
 * Per-tenant adapter for the webhook-egress run service.
 * Applies RLS scope, delegates to runDue, releases scope in finally.
 */
export async function tickWebhookEgress(
  ctx: WebhookEgressTickContext
): Promise<RunDueWebhookDeliveriesResult> {
  const tenant: WorkerTenantContext = {
    organizationId: ctx.organizationId,
    actorUserId: ctx.actorUserId
  };
  const deps: RunDueWebhookDeliveriesDeps = {};
  if (ctx.egressPort !== undefined) deps.port = ctx.egressPort;
  if (ctx.timeoutMs !== undefined) deps.timeoutMs = ctx.timeoutMs;

  await applyScope(ctx.db, ctx.organizationId);
  try {
    return await ctx.runDue(ctx.db, tenant, ctx.asOf, deps);
  } finally {
    await releaseScope(ctx.db);
  }
}
