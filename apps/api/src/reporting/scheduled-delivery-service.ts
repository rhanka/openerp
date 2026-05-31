import type {
  ScheduledDelivery,
  DeliveryRun,
  CreateScheduledDeliveryInput,
  UpdateScheduledDeliveryInput,
  ScheduledDeliveryCadence
} from "@sentropic/openerp-domain/reporting";

import type { Queryable, TenantContext } from "../db/client";
import { assertTenantContext } from "../db/client";
import { recordAuditEvent } from "../foundation/audit-emit";
import { findReportDefinitionById } from "./report-definitions";
import { runReportDefinition } from "./report-definition-service";
import {
  insertScheduledDelivery,
  findScheduledDeliveryById,
  listScheduledDeliveries as listScheduledDeliveriesRepo,
  listDueScheduledDeliveries,
  updateScheduledDeliveryRepo,
  softDeleteScheduledDelivery,
  advanceNextRunAt as advanceNextRunAtRepo,
  insertDeliveryRun,
  findDeliveryRunById as findDeliveryRunByIdRepo,
  listDeliveryRunsByDelivery as listDeliveryRunsByDeliveryRepo
} from "./scheduled-deliveries";

// ---------------------------------------------------------------------------
// Error types
// ---------------------------------------------------------------------------

export class ScheduledDeliveryNotFoundError extends Error {
  readonly code = "SCHEDULED_DELIVERY_NOT_FOUND";
  constructor(id: string) {
    super(`ScheduledDelivery ${id} not found`);
  }
}

export class ScheduledDeliveryTargetError extends Error {
  readonly code = "SCHEDULED_DELIVERY_TARGET_ERROR";
  constructor(message: string) {
    super(message);
  }
}

export class ScheduledDeliveryForbiddenError extends Error {
  readonly code = "FORBIDDEN";
  constructor(message = "Access denied") {
    super(message);
  }
}

// ---------------------------------------------------------------------------
// Timezone-aware next-run computation (SKIP semantics)
//
// computeNextRunAt returns the next occurrence STRICTLY AFTER fromInstant,
// computed on the tz-localized calendar.
// - daily: +1 calendar day in tz
// - weekly: +7 calendar days in tz
// - monthly: +1 calendar month in tz
// - quarterly: +3 calendar months in tz
// - annual: +1 calendar year in tz
//
// "SKIP" semantics: we always anchor on now() (passed as fromInstant), not on
// the old next_run_at — so any missed windows are skipped and only the next
// future slot is returned. The result is always > fromInstant.
// ---------------------------------------------------------------------------

export function computeNextRunAt(
  fromInstant: Date,
  cadence: ScheduledDeliveryCadence,
  timezone: string
): Date {
  // Resolve to a tz-localized "wall-clock" date so that calendar arithmetic
  // is month/year-correct in the given timezone.
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  });
  const parts = fmt.formatToParts(fromInstant);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "0";
  const year = parseInt(get("year"), 10);
  const month = parseInt(get("month"), 10) - 1; // 0-indexed
  const day = parseInt(get("day"), 10);
  const hour = parseInt(get("hour"), 10);
  const minute = parseInt(get("minute"), 10);
  const second = parseInt(get("second"), 10);

  // Build a local-calendar Date in UTC (treating the tz wall-clock as UTC
  // calendar values, then shifting back).
  // Simpler approach: use Date.UTC with the localized values, then apply the
  // offset delta so that when we format the result in the same tz, it shows
  // the advanced wall-clock date.
  //
  // Practical approach: compute the offset at fromInstant, add it to get the
  // equivalent UTC "wall-clock" time, do calendar math, then subtract the
  // offset at the result to get back to actual UTC.
  const tzOffsetMs = getTzOffsetMs(fromInstant, timezone);
  // localWallMs = milliseconds since epoch of the "equivalent UTC" wall-clock
  const localWallMs = fromInstant.getTime() + tzOffsetMs;
  const localDate = new Date(localWallMs);

  // Advance the local wall-clock date
  switch (cadence) {
    case "daily":
      localDate.setUTCDate(localDate.getUTCDate() + 1);
      break;
    case "weekly":
      localDate.setUTCDate(localDate.getUTCDate() + 7);
      break;
    case "monthly":
      localDate.setUTCMonth(localDate.getUTCMonth() + 1);
      break;
    case "quarterly":
      localDate.setUTCMonth(localDate.getUTCMonth() + 3);
      break;
    case "annual":
      localDate.setUTCFullYear(localDate.getUTCFullYear() + 1);
      break;
  }
  void [year, month, day, hour, minute, second]; // suppress lint on unused locals

  // Shift back to actual UTC: subtract the offset at the *new* local wall time
  const newLocalMs = localDate.getTime();
  const newActualUtc = new Date(newLocalMs);
  const newTzOffsetMs = getTzOffsetMs(newActualUtc, timezone);
  const result = new Date(newLocalMs - newTzOffsetMs);
  return result;
}

/** Returns the timezone offset in ms (positive = UTC is ahead of local). */
function getTzOffsetMs(instant: Date, timezone: string): number {
  // Format the instant in both UTC and local tz, parse the difference.
  const utcStr = instant.toLocaleString("en-CA", { timeZone: "UTC", hour12: false });
  const tzStr = instant.toLocaleString("en-CA", { timeZone: timezone, hour12: false });
  // Ensure we don't get off by misparse
  const parseLocal = (s: string): number => {
    // "YYYY-MM-DD, HH:MM:SS" → Date
    const cleaned = s.replace(",", "");
    return new Date(cleaned + " UTC").getTime();
  };
  return parseLocal(tzStr) - parseLocal(utcStr);
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

export async function createScheduledDelivery(
  db: Queryable,
  context: TenantContext,
  input: CreateScheduledDeliveryInput
): Promise<ScheduledDelivery> {
  assertTenantContext(context);

  if (input.targetType !== "report_definition") {
    throw new ScheduledDeliveryTargetError(
      `Unsupported target_type: ${input.targetType}. Only 'report_definition' is supported in v1.`
    );
  }

  // Validate that the target report definition exists and is not deleted
  const reportDef = await findReportDefinitionById(db, context, input.targetId);
  if (!reportDef) {
    throw new ScheduledDeliveryTargetError(
      `ReportDefinition ${input.targetId} not found or has been deleted`
    );
  }

  const tz = input.timezone ?? "UTC";
  const now = new Date();
  const nextRunAt = computeNextRunAt(now, input.cadence, tz);

  const created = await insertScheduledDelivery(db, context, {
    ...input,
    nextRunAt: nextRunAt.toISOString()
  });

  await recordAuditEvent(db, context, {
    action: "reporting.scheduled_delivery.created",
    resourceType: "scheduled_delivery",
    resourceId: created.id,
    beforeSummary: null,
    afterSummary: {
      name: created.name,
      targetType: created.targetType,
      targetId: created.targetId,
      cadence: created.cadence,
      timezone: created.timezone,
      nextRunAt: created.nextRunAt,
      ownerUserId: created.ownerUserId,
      isShared: created.isShared,
      active: created.active
    }
  });

  return created;
}

export async function updateScheduledDelivery(
  db: Queryable,
  context: TenantContext,
  id: string,
  patch: UpdateScheduledDeliveryInput
): Promise<ScheduledDelivery> {
  assertTenantContext(context);

  const before = await findScheduledDeliveryById(db, context, id);
  if (!before) throw new ScheduledDeliveryNotFoundError(id);
  enforceOwnership(before, context);

  const updated = await updateScheduledDeliveryRepo(db, context, id, patch);
  if (!updated) throw new ScheduledDeliveryNotFoundError(id);

  await recordAuditEvent(db, context, {
    action: "reporting.scheduled_delivery.updated",
    resourceType: "scheduled_delivery",
    resourceId: id,
    beforeSummary: {
      name: before.name,
      cadence: before.cadence,
      active: before.active,
      nextRunAt: before.nextRunAt
    },
    afterSummary: {
      name: updated.name,
      cadence: updated.cadence,
      active: updated.active,
      nextRunAt: updated.nextRunAt
    }
  });

  return updated;
}

export async function deleteScheduledDelivery(
  db: Queryable,
  context: TenantContext,
  id: string
): Promise<void> {
  assertTenantContext(context);

  const before = await findScheduledDeliveryById(db, context, id);
  if (!before) throw new ScheduledDeliveryNotFoundError(id);
  enforceOwnership(before, context);

  const deleted = await softDeleteScheduledDelivery(db, context, id);
  if (!deleted) throw new ScheduledDeliveryNotFoundError(id);

  await recordAuditEvent(db, context, {
    action: "reporting.scheduled_delivery.deleted",
    resourceType: "scheduled_delivery",
    resourceId: id,
    beforeSummary: {
      name: before.name,
      cadence: before.cadence,
      targetId: before.targetId,
      active: before.active
    },
    afterSummary: null
  });
}

export async function getScheduledDeliveryById(
  db: Queryable,
  context: TenantContext,
  id: string
): Promise<ScheduledDelivery | null> {
  return findScheduledDeliveryById(db, context, id);
}

export async function listScheduledDeliveries(
  db: Queryable,
  context: TenantContext,
  options: {
    ownerUserId?: string | null;
    isShared?: boolean;
    active?: boolean;
    limit?: number;
    offset?: number;
  } = {}
): Promise<ScheduledDelivery[]> {
  return listScheduledDeliveriesRepo(db, context, options);
}

// ---------------------------------------------------------------------------
// Execution helpers
// ---------------------------------------------------------------------------

interface ExecuteDeliveryResult {
  deliveryRun: DeliveryRun;
}

/**
 * Execute one delivery: run the report, persist a delivery_run, emit audit.
 * Does NOT advance next_run_at or set last_run_at — callers own that.
 * Errors are captured per-delivery (never rethrown) so batch runs don't abort.
 */
export async function executeDelivery(
  db: Queryable,
  context: TenantContext,
  delivery: ScheduledDelivery,
  triggeredBy: "schedule" | "manual"
): Promise<ExecuteDeliveryResult> {
  const startedAt = new Date().toISOString();

  // No recipients → skipped (no report run, no event)
  if (!delivery.recipientUserIds || delivery.recipientUserIds.length === 0) {
    const run = await insertDeliveryRun(db, context, {
      scheduledDeliveryId: delivery.id,
      reportRunId: null,
      triggeredBy,
      status: "skipped",
      errorDetail: "no_recipients",
      snapshotSummary: {},
      startedAt,
      completedAt: new Date().toISOString()
    });
    return { deliveryRun: run };
  }

  // Check that the target definition still exists
  const reportDef = await findReportDefinitionById(db, context, delivery.targetId);
  if (!reportDef) {
    const run = await insertDeliveryRun(db, context, {
      scheduledDeliveryId: delivery.id,
      reportRunId: null,
      triggeredBy,
      status: "failed",
      errorDetail: "source_deleted",
      snapshotSummary: {},
      startedAt,
      completedAt: new Date().toISOString()
    });
    await recordAuditEvent(db, context, {
      action: "reporting.delivery_run.failed",
      resourceType: "delivery_run",
      resourceId: run.id,
      beforeSummary: null,
      afterSummary: {
        scheduledDeliveryId: delivery.id,
        triggeredBy,
        errorDetail: "source_deleted"
      }
    });
    return { deliveryRun: run };
  }

  // Execute the report definition
  try {
    const reportRun = await runReportDefinition(db, context, delivery.targetId);
    const completedAt = new Date().toISOString();
    const run = await insertDeliveryRun(db, context, {
      scheduledDeliveryId: delivery.id,
      reportRunId: reportRun.id,
      triggeredBy,
      status: "completed",
      errorDetail: null,
      snapshotSummary: {
        rowCount: reportRun.rowCount,
        reportType: reportDef.reportType
      },
      startedAt,
      completedAt
    });
    await recordAuditEvent(db, context, {
      action: "reporting.delivery_run.completed",
      resourceType: "delivery_run",
      resourceId: run.id,
      beforeSummary: null,
      afterSummary: {
        scheduledDeliveryId: delivery.id,
        reportRunId: reportRun.id,
        triggeredBy,
        rowCount: reportRun.rowCount,
        reportType: reportDef.reportType
      }
    });
    return { deliveryRun: run };
  } catch (err) {
    const errorDetail = err instanceof Error ? err.message : String(err);
    const run = await insertDeliveryRun(db, context, {
      scheduledDeliveryId: delivery.id,
      reportRunId: null,
      triggeredBy,
      status: "failed",
      errorDetail,
      snapshotSummary: {},
      startedAt,
      completedAt: new Date().toISOString()
    });
    await recordAuditEvent(db, context, {
      action: "reporting.delivery_run.failed",
      resourceType: "delivery_run",
      resourceId: run.id,
      beforeSummary: null,
      afterSummary: {
        scheduledDeliveryId: delivery.id,
        triggeredBy,
        errorDetail
      }
    });
    return { deliveryRun: run };
  }
}

// ---------------------------------------------------------------------------
// Run services
// ---------------------------------------------------------------------------

export interface RunDueDeliveriesResult {
  processed: number;
  results: Array<{
    scheduledDeliveryId: string;
    deliveryRunId: string;
    status: "completed" | "failed" | "skipped";
  }>;
}

/**
 * For each active schedule due for this tenant (next_run_at <= asOfInstant):
 *  1. Execute the delivery (run the report, persist delivery_run).
 *  2. Advance next_run_at = computeNextRunAt(now(), cadence, timezone) — SKIP semantics.
 *  3. Set last_run_at = now().
 * Returns a summary of all processed deliveries.
 */
export async function runDueDeliveries(
  db: Queryable,
  context: TenantContext,
  asOfInstant?: Date
): Promise<RunDueDeliveriesResult> {
  assertTenantContext(context);

  const asOf = (asOfInstant ?? new Date()).toISOString();
  const dueDeliveries = await listDueScheduledDeliveries(db, context, asOf);

  const results: RunDueDeliveriesResult["results"] = [];

  for (const delivery of dueDeliveries) {
    const { deliveryRun } = await executeDelivery(db, context, delivery, "schedule");

    // SKIP semantics: anchor next_run_at on now() (not on old next_run_at)
    // so that any missed windows are skipped and only the next future slot fires.
    const now = new Date();
    const nextRunAt = computeNextRunAt(now, delivery.cadence, delivery.timezone);
    await advanceNextRunAtRepo(db, context, delivery.id, nextRunAt.toISOString());

    results.push({
      scheduledDeliveryId: delivery.id,
      deliveryRunId: deliveryRun.id,
      status: deliveryRun.status
    });
  }

  return { processed: results.length, results };
}

/**
 * Force a single delivery to run immediately (triggered_by='manual').
 * Does NOT advance next_run_at or set last_run_at — manual runs must not
 * shift the cadence. This is an explicit requirement.
 */
export async function runDeliveryNow(
  db: Queryable,
  context: TenantContext,
  id: string
): Promise<DeliveryRun> {
  assertTenantContext(context);

  const delivery = await findScheduledDeliveryById(db, context, id);
  if (!delivery) throw new ScheduledDeliveryNotFoundError(id);

  const { deliveryRun } = await executeDelivery(db, context, delivery, "manual");
  // Intentionally do NOT advance next_run_at or set last_run_at.
  return deliveryRun;
}

// ---------------------------------------------------------------------------
// Query services
// ---------------------------------------------------------------------------

export async function getDeliveryRunById(
  db: Queryable,
  context: TenantContext,
  id: string
): Promise<DeliveryRun | null> {
  return findDeliveryRunByIdRepo(db, context, id);
}

export async function listDeliveryRunsForDelivery(
  db: Queryable,
  context: TenantContext,
  scheduledDeliveryId: string,
  options: { limit?: number; offset?: number } = {}
): Promise<DeliveryRun[]> {
  return listDeliveryRunsByDeliveryRepo(db, context, scheduledDeliveryId, options);
}

// ---------------------------------------------------------------------------
// Ownership enforcement
// A shared ScheduledDelivery may only be mutated by its owner.
// ---------------------------------------------------------------------------

function enforceOwnership(delivery: ScheduledDelivery, context: TenantContext): void {
  if (
    delivery.isShared &&
    delivery.ownerUserId !== null &&
    delivery.ownerUserId !== context.actorUserId
  ) {
    throw new ScheduledDeliveryForbiddenError(
      `Only the owner of shared ScheduledDelivery ${delivery.id} may modify it`
    );
  }
}
