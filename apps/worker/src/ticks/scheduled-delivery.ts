// Per-tenant adapter for the scheduled-delivery run service (AUTOMATION-RUNTIME A0-2).
//
// Import strategy: the runDueDeliveries function is injected as a dep to avoid
// cross-package rootDir violations at tsc lint time. In production the caller
// passes the real function from @sentropic/openerp-api; in tests a vi.fn() mock.

/** Minimal queryable surface required by this adapter. */
export interface Queryable {
  query<T = unknown>(text: string, values?: unknown[]): Promise<{ rows: T[] }>;
}

/** Minimal tenant context required by the runDue* services. */
export interface WorkerTenantContext {
  organizationId: string;
  actorUserId: string;
}

export interface RunDueDeliveriesResult {
  processed: number;
  results: Array<{
    scheduledDeliveryId: string;
    deliveryRunId: string;
    status: "completed" | "failed" | "skipped";
  }>;
}

export interface ScheduledDeliveryTickContext {
  db: Queryable;
  organizationId: string;
  actorUserId: string;
  asOf?: Date;
  /** Injected service. Pass runDueDeliveries from @sentropic/openerp-api in production. */
  runDue: (db: Queryable, tenant: WorkerTenantContext, asOf?: Date) => Promise<RunDueDeliveriesResult>;
}

/** Apply RLS scope, run due deliveries, release scope. */
async function applyScope(db: Queryable, organizationId: string): Promise<void> {
  await db.query("select set_config('app.current_organization_id', $1, true)", [organizationId]);
}

async function releaseScope(db: Queryable): Promise<void> {
  await db.query("select set_config('app.current_organization_id', '', false)", []);
}

/**
 * Per-tenant adapter for the scheduled-delivery run service.
 * Applies RLS scope, delegates to runDue, releases scope in finally.
 */
export async function tickScheduledDelivery(
  ctx: ScheduledDeliveryTickContext
): Promise<RunDueDeliveriesResult> {
  const tenant: WorkerTenantContext = {
    organizationId: ctx.organizationId,
    actorUserId: ctx.actorUserId
  };
  await applyScope(ctx.db, ctx.organizationId);
  try {
    return await ctx.runDue(ctx.db, tenant, ctx.asOf);
  } finally {
    await releaseScope(ctx.db);
  }
}
