/// <reference types="node" />
/**
 * OpenERP Worker — entrypoint with graceful shutdown (AUTOMATION-RUNTIME A0-3).
 *
 * Two surfaces:
 *   - `runOpenERPWorker(opts)` — fully DI-driven; testable without env or real DB.
 *   - `main()` — reads env, wires real implementations, calls runOpenERPWorker.
 */

import { runTickLoop } from "./tick-scheduler.js";
import {
  tickScheduledDelivery,
  type Queryable
} from "./ticks/scheduled-delivery.js";
import { tickRecurringBilling } from "./ticks/recurring-billing.js";
import { tickWebhookEgress } from "./ticks/webhook-egress.js";

// ---------------------------------------------------------------------------
// Re-export Queryable so callers of this module don't need to chase down the
// original definition.
// ---------------------------------------------------------------------------
export type { Queryable };

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A tickFor-shaped function for scheduled-delivery. */
export type ScheduledDeliveryTick = (opts: {
  db: Queryable;
  organizationId: string;
  actorUserId: string;
}) => Promise<unknown>;

/** A tickFor-shaped function for recurring-billing. */
export type RecurringBillingTick = (opts: {
  db: Queryable;
  organizationId: string;
  actorUserId: string;
}) => Promise<unknown>;

/** A tickFor-shaped function for webhook-egress. */
export type WebhookEgressTick = (opts: {
  db: Queryable;
  organizationId: string;
  actorUserId: string;
}) => Promise<unknown>;

export interface WorkerTicks {
  scheduledDelivery: ScheduledDeliveryTick;
  recurringBilling: RecurringBillingTick;
  webhookEgress: WebhookEgressTick;
}

export interface WorkerIntervals {
  scheduledDeliveryMs: number;
  recurringBillingMs: number;
  webhookEgressMs: number;
}

/** Minimal pool surface required by runOpenERPWorker. */
export interface PoolHandle {
  /** Close the pool. */
  end(): Promise<void>;
}

export interface WorkerOptions {
  /** Pool used for DB queries (also passed as `db` to each tick). */
  pool: Queryable & PoolHandle;
  /**
   * Function that returns all active organization ids.
   * Default (wired by main()): listActiveOrganizationIds.
   */
  listOrgs: (db: Queryable) => Promise<string[]>;
  /** Per-domain tick adapters. */
  ticks: WorkerTicks;
  /** Loop intervals per domain (ms). */
  intervals: WorkerIntervals;
  /** Abort signal: when fired every loop completes its current iteration then returns. */
  signal: AbortSignal;
  /** Override sleep for tests. */
  sleep?: (ms: number, signal?: AbortSignal) => Promise<void>;
  /** Custom error sink forwarded to each runTickLoop. */
  onError?: (err: unknown, name: string) => void;
}

// ---------------------------------------------------------------------------
// Default system actor used for RLS-scoped queries inside each tick.
// No real user is involved — this is the automation actor id.
// ---------------------------------------------------------------------------
const SYSTEM_ACTOR_ID = "00000000-0000-0000-0000-000000000000";

// ---------------------------------------------------------------------------
// runOpenERPWorker — DI-driven, testable
// ---------------------------------------------------------------------------

/**
 * Launch all domain loops and return once the signal aborts and all loops
 * have completed their in-flight iteration.
 *
 * All loops run concurrently (Promise.all). Each loop iterates tenants
 * serially within a single cycle.
 */
export async function runOpenERPWorker(opts: WorkerOptions): Promise<void> {
  const { pool, listOrgs, ticks, intervals, signal } = opts;

  // Per-tenant error handler: forwards to opts.onError (if any) then continues.
  // A single tenant failure must not abort the remaining tenants in the cycle.
  const handleTenantError = opts.onError
    ? (err: unknown, domain: string) => {
        try {
          opts.onError!(err, domain);
        } catch {
          // never let the error handler kill the loop
        }
      }
    : (err: unknown, domain: string): void => {
        const msg = err instanceof Error ? err.message : String(err);
        // eslint-disable-next-line no-console
        console.error(`[${domain}] tenant tick error: ${msg}`);
      };

  // Build per-loop options: only include optional keys when they are defined
  // to satisfy exactOptionalPropertyTypes.
  function makeLoopBase(
    name: string,
    intervalMs: number,
    runOnce: () => Promise<void>
  ) {
    type LoopBase = {
      name: string;
      intervalMs: number;
      signal: AbortSignal;
      runOnce: () => Promise<void>;
      sleep?: (ms: number, signal?: AbortSignal) => Promise<void>;
      onError?: (err: unknown, name: string) => void;
    };
    const base: LoopBase = { name, intervalMs, signal, runOnce };
    if (opts.sleep !== undefined) base.sleep = opts.sleep;
    if (opts.onError !== undefined) base.onError = opts.onError;
    return base;
  }

  const scheduledDeliveryLoop = runTickLoop(
    makeLoopBase("scheduled-delivery", intervals.scheduledDeliveryMs, async () => {
      const orgIds = await listOrgs(pool);
      // eslint-disable-next-line no-console
      console.info(`[scheduled-delivery] processing ${orgIds.length} tenant(s)`);
      for (const organizationId of orgIds) {
        try {
          await ticks.scheduledDelivery({ db: pool, organizationId, actorUserId: SYSTEM_ACTOR_ID });
        } catch (err) {
          handleTenantError(err, "scheduled-delivery");
        }
      }
    })
  );

  const recurringBillingLoop = runTickLoop(
    makeLoopBase("recurring-billing", intervals.recurringBillingMs, async () => {
      const orgIds = await listOrgs(pool);
      // eslint-disable-next-line no-console
      console.info(`[recurring-billing] processing ${orgIds.length} tenant(s)`);
      for (const organizationId of orgIds) {
        try {
          await ticks.recurringBilling({ db: pool, organizationId, actorUserId: SYSTEM_ACTOR_ID });
        } catch (err) {
          handleTenantError(err, "recurring-billing");
        }
      }
    })
  );

  const webhookEgressLoop = runTickLoop(
    makeLoopBase("webhook-egress", intervals.webhookEgressMs, async () => {
      const orgIds = await listOrgs(pool);
      // eslint-disable-next-line no-console
      console.info(`[webhook-egress] processing ${orgIds.length} tenant(s)`);
      for (const organizationId of orgIds) {
        try {
          await ticks.webhookEgress({ db: pool, organizationId, actorUserId: SYSTEM_ACTOR_ID });
        } catch (err) {
          handleTenantError(err, "webhook-egress");
        }
      }
    })
  );

  await Promise.all([scheduledDeliveryLoop, recurringBillingLoop, webhookEgressLoop]);
}

// ---------------------------------------------------------------------------
// main() — env-reading thin wrapper
// ---------------------------------------------------------------------------

/**
 * Read environment, wire real implementations, run worker until SIGTERM/SIGINT.
 * Throws if OPENERP_DATABASE_URL is not set.
 */
export async function main(): Promise<void> {
  const databaseUrl = process.env["OPENERP_DATABASE_URL"];
  if (!databaseUrl) {
    throw new Error(
      "OPENERP_DATABASE_URL is required but not set. Set it to a valid PostgreSQL connection string."
    );
  }

  const intervals: WorkerIntervals = {
    scheduledDeliveryMs: Number(
      process.env["OPENERP_WORKER_INTERVAL_MS_SCHEDULED_DELIVERY"] ?? 60_000
    ),
    recurringBillingMs: Number(
      process.env["OPENERP_WORKER_INTERVAL_MS_RECURRING_BILLING"] ?? 300_000
    ),
    webhookEgressMs: Number(
      process.env["OPENERP_WORKER_INTERVAL_MS_WEBHOOK_EGRESS"] ?? 10_000
    )
  };

  // Lazy imports keep startup fast and avoid build-time cross-package type
  // conflicts (the tsc rootDir constraint). In production these resolve from
  // the compiled dist of @sentropic/openerp-api.
  const { createPgPool } = await import(
    // @ts-expect-error dynamic cross-package import in the compiled dist
    "@sentropic/openerp-api/dist/db/pg-client.js"
  );
  const { listActiveOrganizationIds } = await import(
    // @ts-expect-error dynamic cross-package import
    "@sentropic/openerp-api/dist/foundation/tenant-enumeration.js"
  );

  const pool = createPgPool({ connectionString: databaseUrl }) as Queryable & PoolHandle;

  const controller = new AbortController();

  const shutdown = (): void => {
    controller.abort();
    pool.end().catch(() => {});
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);

  // Build minimal DI-compatible tick wrappers that delegate to the real adapters
  // but accept the simplified { db, organizationId, actorUserId } signature used
  // by runOpenERPWorker. Each real tickFor function expects a context with an
  // injected `runDue`; here we use stub runDue that is a no-op placeholder.
  // NOTE: Full production wiring of runDue will be done in a later sub-slice
  // (A0-4/A0-5). For now the adapters are wired with identity stubs so the
  // process boots and logs correctly without a real DB.
  const ticks: WorkerTicks = {
    scheduledDelivery: async ({ db, organizationId, actorUserId }) => {
      return tickScheduledDelivery({
        db,
        organizationId,
        actorUserId,
        runDue: async () => ({ processed: 0, results: [] })
      });
    },
    recurringBilling: async ({ db, organizationId, actorUserId }) => {
      return tickRecurringBilling({
        db,
        organizationId,
        actorUserId,
        runDue: async () => ({ generated: 0, invoiceIds: [] })
      });
    },
    webhookEgress: async ({ db, organizationId, actorUserId }) => {
      return tickWebhookEgress({
        db,
        organizationId,
        actorUserId,
        runDue: async () => ({
          processed: 0,
          succeeded: 0,
          failed: 0,
          skipped: 0,
          asOf: new Date()
        })
      });
    }
  };

  // eslint-disable-next-line no-console
  console.info("[openerp-worker] starting");

  try {
    await runOpenERPWorker({
      pool,
      listOrgs: listActiveOrganizationIds as (db: Queryable) => Promise<string[]>,
      ticks,
      intervals,
      signal: controller.signal
    });
  } finally {
    process.removeListener("SIGTERM", shutdown);
    process.removeListener("SIGINT", shutdown);
    await pool.end().catch(() => {});
    // eslint-disable-next-line no-console
    console.info("[openerp-worker] stopped");
  }
}
