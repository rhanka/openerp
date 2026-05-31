import { describe, expect, it } from "vitest";

import type {
  ScheduledDelivery,
  DeliveryRun,
  ReportDefinition,
  ReportRun
} from "@sentropic/openerp-domain/reporting";
import type { Queryable } from "../../src/db/client";
import {
  ScheduledDeliveryNotFoundError,
  ScheduledDeliveryTargetError,
  ScheduledDeliveryForbiddenError,
  computeNextRunAt,
  createScheduledDelivery,
  deleteScheduledDelivery,
  getScheduledDeliveryById,
  listScheduledDeliveries,
  runDueDeliveries,
  runDeliveryNow,
  updateScheduledDelivery
} from "../../src/reporting/scheduled-delivery-service";

// ---------------------------------------------------------------------------
// Fake DB
// ---------------------------------------------------------------------------

interface AuditRow {
  organizationId: string;
  actorUserId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  beforeSummary: unknown;
  afterSummary: unknown;
}

function makeFakeDb(opts: { reportRunThrows?: boolean; reportDefMissing?: boolean } = {}) {
  const defs: (ReportDefinition & { _deleted?: boolean })[] = [];
  const deliveries: (ScheduledDelivery & { _deleted?: boolean; _nextRunAt?: string; _lastRunAt?: string | null })[] = [];
  const deliveryRuns: DeliveryRun[] = [];
  const reportRuns: ReportRun[] = [];
  const audits: AuditRow[] = [];

  const db: Queryable = {
    async query<T = unknown>(text: string, values: unknown[] = []): Promise<{ rows: T[] }> {
      const t = text;

      // ------------------------------------------------------------------
      // report_definitions findById (used by createScheduledDelivery and executeDelivery)
      // ------------------------------------------------------------------
      if (t.includes("from report_definitions") && t.includes("where id = $1")) {
        if (opts.reportDefMissing) return { rows: [] };
        const [id, organizationId] = values as [string, string];
        const found = defs.find(
          (d) => d.id === id && d.organizationId === organizationId && !d._deleted
        );
        return { rows: found ? [found as unknown as T] : [] };
      }

      // ------------------------------------------------------------------
      // report_definitions insert (used by service tests that call createReportDefinition)
      // ------------------------------------------------------------------
      if (t.includes("insert into report_definitions")) {
        const [orgId, ownerUserId, reportType, name, parametersRaw, isShared] = values as [
          string, string | null, string, string, string, boolean
        ];
        const row: ReportDefinition = {
          id: `rd_${defs.length + 1}`,
          organizationId: orgId,
          ownerUserId,
          reportType,
          name,
          parameters: JSON.parse(parametersRaw as string) as Record<string, unknown>,
          isShared,
          createdAt: "2026-05-29T08:00:00.000Z",
          updatedAt: "2026-05-29T08:00:00.000Z"
        };
        defs.push(row);
        return { rows: [row as unknown as T] };
      }

      // ------------------------------------------------------------------
      // report_runs insert (used by runReportDefinition inside executeDelivery)
      // ------------------------------------------------------------------
      if (t.includes("insert into report_runs")) {
        if (opts.reportRunThrows) throw new Error("Report run failed");
        const [orgId, reportDefinitionId, triggeredByUserId, status, parametersSnapshotRaw,
          resultColumnsRaw, resultRowsRaw, rowCount, errorDetail, startedAt, completedAt] =
          values as [string, string, string | null, string, string, string, string, number, string | null, string | null, string | null];
        const row: ReportRun = {
          id: `rr_${reportRuns.length + 1}`,
          organizationId: orgId,
          reportDefinitionId,
          triggeredByUserId,
          status: status as "completed" | "failed",
          parametersSnapshot: JSON.parse(parametersSnapshotRaw as string) as Record<string, unknown>,
          resultColumns: JSON.parse(resultColumnsRaw as string) as ReportRun["resultColumns"],
          resultRows: JSON.parse(resultRowsRaw as string) as Record<string, unknown>[],
          rowCount,
          errorDetail: errorDetail ?? null,
          startedAt: startedAt ?? null,
          completedAt: completedAt ?? null,
          createdAt: "2026-05-29T08:00:00.000Z"
        };
        reportRuns.push(row);
        return { rows: [row as unknown as T] };
      }

      // pipeline_stages query (run by crm.pipeline_funnel)
      if (t.includes("from pipeline_stages")) {
        return { rows: [{ stage: "Discovery", open_count: "2", pipeline_value_minor: "50000" } as unknown as T] };
      }

      // ------------------------------------------------------------------
      // scheduled_deliveries insert
      // Note: SQL has 'in_app' hardcoded, so values are $1-$11 (no channel param)
      // $1=orgId, $2=ownerUserId, $3=name, $4=targetType, $5=targetId,
      // $6=cadence, $7=timezone, $8=nextRunAt, $9=recipientUserIds,
      // $10=isShared, $11=active
      // ------------------------------------------------------------------
      if (t.includes("insert into scheduled_deliveries")) {
        const [orgId, ownerUserId, name, targetType, targetId, cadence, timezone, nextRunAt,
          recipientUserIdsRaw, isShared, active] = values as [
          string, string | null, string, string, string, string, string, string, string, boolean, boolean
        ];
        const row: ScheduledDelivery = {
          id: `sd_${deliveries.length + 1}`,
          organizationId: orgId,
          ownerUserId,
          name,
          targetType: targetType as "report_definition",
          targetId,
          cadence: cadence as ScheduledDelivery["cadence"],
          timezone,
          nextRunAt,
          lastRunAt: null,
          channel: "in_app",
          recipientUserIds: JSON.parse(recipientUserIdsRaw as string) as string[],
          isShared,
          active,
          createdAt: "2026-05-29T08:00:00.000Z",
          updatedAt: "2026-05-29T08:00:00.000Z"
        };
        deliveries.push(row);
        return { rows: [row as unknown as T] };
      }

      // ------------------------------------------------------------------
      // scheduled_deliveries findById — return a shallow copy so mutations
      // to the stored row don't retroactively change the "before" snapshot
      // captured by the service before calling update.
      // ------------------------------------------------------------------
      if (t.includes("from scheduled_deliveries") && t.includes("where id = $1")) {
        const [id, organizationId] = values as [string, string];
        const found = deliveries.find(
          (d) => d.id === id && d.organizationId === organizationId && !d._deleted
        );
        return { rows: found ? [{ ...found } as unknown as T] : [] };
      }

      // ------------------------------------------------------------------
      // scheduled_deliveries list (general)
      // ------------------------------------------------------------------
      if (t.includes("from scheduled_deliveries") && t.includes("order by name")) {
        const [organizationId] = values as [string];
        const rows = deliveries.filter((d) => d.organizationId === organizationId && !d._deleted);
        return { rows: rows as unknown as T[] };
      }

      // ------------------------------------------------------------------
      // scheduled_deliveries listDue (active, next_run_at <=)
      // ------------------------------------------------------------------
      if (
        t.includes("from scheduled_deliveries") &&
        t.includes("active = true") &&
        t.includes("next_run_at <=")
      ) {
        const [organizationId, asOf] = values as [string, string];
        const asOfMs = new Date(asOf).getTime();
        const rows = deliveries.filter(
          (d) =>
            d.organizationId === organizationId &&
            d.active &&
            !d._deleted &&
            new Date(d.nextRunAt).getTime() <= asOfMs
        );
        return { rows: rows as unknown as T[] };
      }

      // ------------------------------------------------------------------
      // scheduled_deliveries soft-delete
      // ------------------------------------------------------------------
      if (t.includes("update scheduled_deliveries") && t.includes("deleted_at = now()")) {
        const [id, organizationId] = values as [string, string];
        const d = deliveries.find((d) => d.id === id && d.organizationId === organizationId && !d._deleted);
        if (!d) return { rows: [] };
        d._deleted = true;
        return { rows: [{ id: d.id } as unknown as T] };
      }

      // ------------------------------------------------------------------
      // scheduled_deliveries advanceNextRunAt (set next_run_at + last_run_at)
      // ------------------------------------------------------------------
      if (
        t.includes("update scheduled_deliveries") &&
        t.includes("next_run_at = $3") &&
        t.includes("last_run_at = now()")
      ) {
        const [id, organizationId, nextRunAt] = values as [string, string, string];
        const d = deliveries.find((d) => d.id === id && d.organizationId === organizationId && !d._deleted);
        if (d) {
          d.nextRunAt = nextRunAt;
          d._nextRunAt = nextRunAt;
          d.lastRunAt = new Date().toISOString();
          d._lastRunAt = d.lastRunAt;
        }
        return { rows: [] };
      }

      // ------------------------------------------------------------------
      // scheduled_deliveries markLastRunAt (set last_run_at only, no next_run_at change)
      // ------------------------------------------------------------------
      if (
        t.includes("update scheduled_deliveries") &&
        t.includes("last_run_at = now()") &&
        !t.includes("next_run_at = $3")
      ) {
        const [id, organizationId] = values as [string, string];
        const d = deliveries.find((d) => d.id === id && d.organizationId === organizationId && !d._deleted);
        if (d) {
          d._lastRunAt = new Date().toISOString();
        }
        return { rows: [] };
      }

      // ------------------------------------------------------------------
      // scheduled_deliveries update (general patch)
      // ------------------------------------------------------------------
      if (t.includes("update scheduled_deliveries") && t.includes("updated_at = now()")) {
        const [id, organizationId] = values as [string, string];
        const d = deliveries.find((d) => d.id === id && d.organizationId === organizationId && !d._deleted);
        if (!d) return { rows: [] };
        // Apply simple patches
        const trailing = values.slice(2);
        if (t.includes("name = $")) {
          const nameVal = trailing.find((v) => typeof v === "string" && !v.startsWith("{") && !v.startsWith("["));
          if (nameVal) d.name = nameVal as string;
        }
        if (t.includes("is_shared = $")) {
          const sv = trailing.find((v) => typeof v === "boolean");
          if (sv !== undefined) d.isShared = sv as boolean;
        }
        if (t.includes("active = $")) {
          const av = trailing.find((v) => typeof v === "boolean");
          if (av !== undefined) d.active = av as boolean;
        }
        return { rows: [d as unknown as T] };
      }

      // ------------------------------------------------------------------
      // delivery_runs insert
      // ------------------------------------------------------------------
      if (t.includes("insert into delivery_runs")) {
        const [orgId, scheduledDeliveryId, reportRunId, triggeredBy, status, errorDetail,
          snapshotSummaryRaw, startedAt, completedAt] = values as [
          string, string, string | null, string, string, string | null, string, string | null, string | null
        ];
        const row: DeliveryRun = {
          id: `dr_${deliveryRuns.length + 1}`,
          organizationId: orgId,
          scheduledDeliveryId,
          reportRunId: reportRunId ?? null,
          triggeredBy: triggeredBy as DeliveryRun["triggeredBy"],
          status: status as DeliveryRun["status"],
          errorDetail: errorDetail ?? null,
          snapshotSummary: JSON.parse(snapshotSummaryRaw as string) as Record<string, unknown>,
          startedAt: startedAt ?? null,
          completedAt: completedAt ?? null,
          createdAt: "2026-05-29T08:00:00.000Z"
        };
        deliveryRuns.push(row);
        return { rows: [row as unknown as T] };
      }

      // ------------------------------------------------------------------
      // delivery_runs findById
      // ------------------------------------------------------------------
      if (t.includes("from delivery_runs") && t.includes("where id = $1")) {
        const [id, organizationId] = values as [string, string];
        const found = deliveryRuns.find((r) => r.id === id && r.organizationId === organizationId);
        return { rows: found ? [found as unknown as T] : [] };
      }

      // ------------------------------------------------------------------
      // audit_events insert — positional shape from audit-emit.ts
      // ------------------------------------------------------------------
      if (t.includes("insert into audit_events")) {
        const [
          organizationId,
          actorUserId,
          _actorType,
          action,
          resourceType,
          resourceId,
          beforeSummary,
          afterSummary
        ] = values as [string, string, string, string, string, string, unknown, unknown];
        void _actorType;
        audits.push({
          organizationId,
          actorUserId,
          action,
          resourceType,
          resourceId,
          beforeSummary,
          afterSummary
        });
        return { rows: [] };
      }

      return { rows: [] };
    }
  };

  return { db, defs, deliveries, deliveryRuns, reportRuns, audits };
}

// Create a report definition in the fake db
async function seedReportDef(
  db: Queryable,
  context: { organizationId: string; actorUserId: string }
): Promise<ReportDefinition> {
  const result = await db.query<ReportDefinition>(
    `insert into report_definitions (organization_id, owner_user_id, report_type, name, parameters, is_shared)
     values ($1, $2, $3, $4, $5, $6) returning id, organization_id as "organizationId", owner_user_id as "ownerUserId", report_type as "reportType", name, parameters, is_shared as "isShared", created_at as "createdAt", updated_at as "updatedAt"`,
    [
      context.organizationId,
      context.actorUserId,
      "crm.pipeline_funnel",
      "Pipeline funnel test",
      JSON.stringify({}),
      false
    ]
  );
  return result.rows[0]!;
}

const context = { organizationId: "org_1", actorUserId: "user_actor" };
const contextB = { organizationId: "org_1", actorUserId: "user_other" };

describe("computeNextRunAt", () => {
  it("advances daily by 1 day", () => {
    const from = new Date("2026-05-29T10:00:00.000Z");
    const next = computeNextRunAt(from, "daily", "UTC");
    expect(next.getTime()).toBeGreaterThan(from.getTime());
    // Should be roughly +1 day
    const diffMs = next.getTime() - from.getTime();
    expect(diffMs).toBeCloseTo(24 * 60 * 60 * 1000, -3);
  });

  it("advances weekly by 7 days", () => {
    const from = new Date("2026-05-29T10:00:00.000Z");
    const next = computeNextRunAt(from, "weekly", "UTC");
    const diffDays = (next.getTime() - from.getTime()) / (24 * 60 * 60 * 1000);
    expect(diffDays).toBeCloseTo(7, 0);
  });

  it("advances monthly by ~1 month", () => {
    const from = new Date("2026-05-29T10:00:00.000Z");
    const next = computeNextRunAt(from, "monthly", "UTC");
    const diffDays = (next.getTime() - from.getTime()) / (24 * 60 * 60 * 1000);
    expect(diffDays).toBeGreaterThan(27);
    expect(diffDays).toBeLessThan(33);
  });

  it("advances quarterly by ~3 months", () => {
    const from = new Date("2026-01-01T00:00:00.000Z");
    const next = computeNextRunAt(from, "quarterly", "UTC");
    const diffDays = (next.getTime() - from.getTime()) / (24 * 60 * 60 * 1000);
    expect(diffDays).toBeGreaterThan(85);
    expect(diffDays).toBeLessThan(95);
  });

  it("advances annual by ~1 year", () => {
    const from = new Date("2026-01-01T00:00:00.000Z");
    const next = computeNextRunAt(from, "annual", "UTC");
    const diffDays = (next.getTime() - from.getTime()) / (24 * 60 * 60 * 1000);
    expect(diffDays).toBeGreaterThan(360);
    expect(diffDays).toBeLessThan(370);
  });

  it("result is always strictly after fromInstant", () => {
    const from = new Date("2026-05-29T08:00:00.000Z");
    for (const cadence of ["daily", "weekly", "monthly", "quarterly", "annual"] as const) {
      const next = computeNextRunAt(from, cadence, "UTC");
      expect(next.getTime(), `cadence ${cadence}`).toBeGreaterThan(from.getTime());
    }
  });
});

describe("ScheduledDeliveryService (DS 5.3)", () => {
  it("creates a delivery and emits reporting.scheduled_delivery.created", async () => {
    const { db, audits } = makeFakeDb();
    const rd = await seedReportDef(db, context);

    const created = await createScheduledDelivery(db, context, {
      name: "Weekly funnel delivery",
      targetType: "report_definition",
      targetId: rd.id,
      cadence: "weekly",
      timezone: "UTC",
      recipientUserIds: ["user_actor"],
      isShared: false,
      ownerUserId: context.actorUserId
    });

    expect(created.id).toBeTruthy();
    expect(created.name).toBe("Weekly funnel delivery");
    expect(created.cadence).toBe("weekly");
    expect(created.channel).toBe("in_app");
    expect(created.recipientUserIds).toEqual(["user_actor"]);
    // nextRunAt should be in the future
    expect(new Date(created.nextRunAt).getTime()).toBeGreaterThan(Date.now() - 1000);

    const createdAudit = audits.find((a) => a.action === "reporting.scheduled_delivery.created");
    expect(createdAudit).toBeDefined();
    expect(createdAudit!.resourceId).toBe(created.id);
  });

  it("throws ScheduledDeliveryTargetError when target report definition is missing", async () => {
    const { db } = makeFakeDb({ reportDefMissing: true });
    await expect(
      createScheduledDelivery(db, context, {
        name: "Bad target",
        targetType: "report_definition",
        targetId: "nonexistent-id",
        cadence: "weekly"
      })
    ).rejects.toBeInstanceOf(ScheduledDeliveryTargetError);
  });

  it("updates a delivery and emits reporting.scheduled_delivery.updated with before/after", async () => {
    const { db, audits } = makeFakeDb();
    const rd = await seedReportDef(db, context);
    const created = await createScheduledDelivery(db, context, {
      name: "Original",
      targetType: "report_definition",
      targetId: rd.id,
      cadence: "weekly",
      ownerUserId: context.actorUserId
    });

    const updated = await updateScheduledDelivery(db, context, created.id, { name: "Updated" });
    expect(updated.name).toBe("Updated");

    const updateAudit = audits.find((a) => a.action === "reporting.scheduled_delivery.updated");
    expect(updateAudit).toBeDefined();
    expect(updateAudit!.beforeSummary).toMatchObject({ name: "Original" });
    expect(updateAudit!.afterSummary).toMatchObject({ name: "Updated" });
  });

  it("throws ScheduledDeliveryNotFoundError on update of missing id", async () => {
    const { db } = makeFakeDb();
    await expect(
      updateScheduledDelivery(db, context, "no-such-id", { name: "X" })
    ).rejects.toBeInstanceOf(ScheduledDeliveryNotFoundError);
  });

  it("soft-deletes and emits reporting.scheduled_delivery.deleted", async () => {
    const { db, audits } = makeFakeDb();
    const rd = await seedReportDef(db, context);
    const created = await createScheduledDelivery(db, context, {
      name: "ToDelete",
      targetType: "report_definition",
      targetId: rd.id,
      cadence: "monthly",
      ownerUserId: context.actorUserId
    });

    await deleteScheduledDelivery(db, context, created.id);
    const found = await getScheduledDeliveryById(db, context, created.id);
    expect(found).toBeNull();

    const list = await listScheduledDeliveries(db, context);
    expect(list.find((d) => d.id === created.id)).toBeUndefined();

    const deleteAudit = audits.find((a) => a.action === "reporting.scheduled_delivery.deleted");
    expect(deleteAudit).toBeDefined();
    expect(deleteAudit!.resourceId).toBe(created.id);
  });

  it("runDueDeliveries: processes due deliveries, advances next_run_at to future (SKIP), sets last_run_at, persists completed delivery_run with report_run_id", async () => {
    const { db, deliveries, deliveryRuns, reportRuns, audits } = makeFakeDb();
    const rd = await seedReportDef(db, context);

    // Create a delivery with next_run_at in the PAST
    const created = await createScheduledDelivery(db, context, {
      name: "Past due delivery",
      targetType: "report_definition",
      targetId: rd.id,
      cadence: "weekly",
      recipientUserIds: ["user_actor"],
      ownerUserId: context.actorUserId
    });

    // Manually set nextRunAt to a past date in the fake data
    const d = deliveries.find((x) => x.id === created.id)!;
    d.nextRunAt = "2020-01-01T00:00:00.000Z";

    const asOfInstant = new Date();
    const result = await runDueDeliveries(db, context, asOfInstant);

    expect(result.processed).toBe(1);
    expect(result.results).toHaveLength(1);
    expect(result.results[0]!.status).toBe("completed");
    expect(result.results[0]!.scheduledDeliveryId).toBe(created.id);

    // A delivery_run should have been persisted with status='completed' and a non-null report_run_id
    const deliveryRun = deliveryRuns.find((r) => r.scheduledDeliveryId === created.id);
    expect(deliveryRun).toBeDefined();
    expect(deliveryRun!.status).toBe("completed");
    expect(deliveryRun!.reportRunId).not.toBeNull();

    // A report_run should have been created (the frozen snapshot)
    expect(reportRuns.length).toBeGreaterThan(0);

    // next_run_at should now be in the FUTURE (SKIP semantics — anchored on now())
    const updatedDelivery = deliveries.find((x) => x.id === created.id)!;
    expect(new Date(updatedDelivery.nextRunAt).getTime()).toBeGreaterThan(Date.now() - 1000);

    // last_run_at should be set
    expect(updatedDelivery._lastRunAt ?? updatedDelivery.lastRunAt).toBeTruthy();

    // audit events: reporting.delivery_run.completed
    expect(audits.some((a) => a.action === "reporting.delivery_run.completed")).toBe(true);
  });

  it("runDeliveryNow: creates a delivery_run with triggered_by=manual and does NOT advance next_run_at", async () => {
    const { db, deliveries, deliveryRuns } = makeFakeDb();
    const rd = await seedReportDef(db, context);

    const created = await createScheduledDelivery(db, context, {
      name: "Manual run",
      targetType: "report_definition",
      targetId: rd.id,
      cadence: "weekly",
      recipientUserIds: ["user_actor"],
      ownerUserId: context.actorUserId
    });

    const originalNextRunAt = deliveries.find((x) => x.id === created.id)!.nextRunAt;

    const deliveryRun = await runDeliveryNow(db, context, created.id);

    expect(deliveryRun.triggeredBy).toBe("manual");
    expect(deliveryRun.status).toBe("completed");

    // next_run_at must NOT have changed
    const afterDelivery = deliveries.find((x) => x.id === created.id)!;
    expect(afterDelivery.nextRunAt).toBe(originalNextRunAt);

    // delivery_run with triggered_by=manual persisted
    const run = deliveryRuns.find((r) => r.scheduledDeliveryId === created.id);
    expect(run).toBeDefined();
    expect(run!.triggeredBy).toBe("manual");
  });

  it("no recipients → delivery_run status=skipped, error_detail=no_recipients", async () => {
    const { db, deliveryRuns } = makeFakeDb();
    const rd = await seedReportDef(db, context);

    const created = await createScheduledDelivery(db, context, {
      name: "No recipients",
      targetType: "report_definition",
      targetId: rd.id,
      cadence: "weekly",
      recipientUserIds: [], // empty
      ownerUserId: context.actorUserId
    });

    const deliveryRun = await runDeliveryNow(db, context, created.id);

    expect(deliveryRun.status).toBe("skipped");
    expect(deliveryRun.errorDetail).toBe("no_recipients");
    expect(deliveryRun.reportRunId).toBeNull();
    // No audit event emitted for skipped
    const run = deliveryRuns.find((r) => r.scheduledDeliveryId === created.id);
    expect(run).toBeDefined();
  });

  it("source deleted target → delivery_run status=failed, error_detail=source_deleted, emits delivery_run.failed", async () => {
    const { db, deliveryRuns, audits, deliveries } = makeFakeDb();
    const rd = await seedReportDef(db, context);

    const created = await createScheduledDelivery(db, context, {
      name: "Target will be deleted",
      targetType: "report_definition",
      targetId: rd.id,
      cadence: "weekly",
      recipientUserIds: ["user_actor"],
      ownerUserId: context.actorUserId
    });

    // Mark the report definition as deleted in fake data
    const defRecord = (db as unknown as { query: unknown }) as unknown;
    void defRecord;
    // Directly mark as deleted in the fakeDb closure — we need to reach the defs array.
    // Since we can't do that from outside, we use a second fake with reportDefMissing=true
    // to simulate the source_deleted scenario via runDeliveryNow on a delivery whose targetId
    // doesn't exist in the DB.
    //
    // Alternative: create delivery in a separate fakeDb where reportDefMissing=true
    const { db: db2, deliveryRuns: dr2, audits: a2, deliveries: dels2 } = makeFakeDb({ reportDefMissing: true });
    // But we need the delivery to exist in db2 — insert manually
    const row: ScheduledDelivery = {
      id: "sd_source_deleted",
      organizationId: context.organizationId,
      ownerUserId: context.actorUserId,
      name: "Source deleted test",
      targetType: "report_definition",
      targetId: "rd_gone",
      cadence: "weekly",
      timezone: "UTC",
      nextRunAt: new Date().toISOString(),
      lastRunAt: null,
      channel: "in_app",
      recipientUserIds: ["user_actor"],
      isShared: false,
      active: true,
      createdAt: "2026-05-29T08:00:00.000Z",
      updatedAt: "2026-05-29T08:00:00.000Z"
    };
    dels2.push(row);

    const deliveryRun = await runDeliveryNow(db2, context, "sd_source_deleted");

    expect(deliveryRun.status).toBe("failed");
    expect(deliveryRun.errorDetail).toBe("source_deleted");
    expect(dr2.find((r) => r.status === "failed")).toBeDefined();
    expect(a2.some((a) => a.action === "reporting.delivery_run.failed")).toBe(true);

    void created; void deliveries; void deliveryRuns; void audits;
  });

  it("ownership enforcement: shared delivery non-owner update throws ScheduledDeliveryForbiddenError", async () => {
    const { db } = makeFakeDb();
    const rd = await seedReportDef(db, context);
    const created = await createScheduledDelivery(db, context, {
      name: "Shared delivery",
      targetType: "report_definition",
      targetId: rd.id,
      cadence: "weekly",
      isShared: true,
      ownerUserId: context.actorUserId
    });

    await expect(
      updateScheduledDelivery(db, contextB, created.id, { name: "Hacked" })
    ).rejects.toBeInstanceOf(ScheduledDeliveryForbiddenError);
  });

  it("ownership enforcement: shared delivery non-owner delete throws ScheduledDeliveryForbiddenError", async () => {
    const { db } = makeFakeDb();
    const rd = await seedReportDef(db, context);
    const created = await createScheduledDelivery(db, context, {
      name: "Shared delivery for delete",
      targetType: "report_definition",
      targetId: rd.id,
      cadence: "monthly",
      isShared: true,
      ownerUserId: context.actorUserId
    });

    await expect(
      deleteScheduledDelivery(db, contextB, created.id)
    ).rejects.toBeInstanceOf(ScheduledDeliveryForbiddenError);
  });
});
