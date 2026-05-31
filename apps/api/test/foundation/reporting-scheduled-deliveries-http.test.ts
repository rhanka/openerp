import { describe, expect, it } from "vitest";

import type {
  ScheduledDelivery,
  DeliveryRun,
  ReportDefinition,
  ReportRun
} from "@sentropic/openerp-domain/reporting";
import type { Queryable } from "../../src/db/client";
import { buildApp, headerTenantResolver } from "../../src/http/app";

function makeFakeDb() {
  const defs: (ReportDefinition & { _deleted?: boolean })[] = [];
  const deliveries: (ScheduledDelivery & { _deleted?: boolean; _nextRunAtChanged?: boolean })[] = [];
  const deliveryRuns: DeliveryRun[] = [];
  const reportRuns: ReportRun[] = [];
  const audits: unknown[] = [];

  // Seed a default report definition
  defs.push({
    id: "rd_http_sd_1",
    organizationId: "org_sd_http",
    ownerUserId: "user_sd_http",
    reportType: "crm.pipeline_funnel",
    name: "HTTP scheduled delivery funnel",
    parameters: {},
    isShared: false,
    createdAt: "2026-05-29T08:00:00.000Z",
    updatedAt: "2026-05-29T08:00:00.000Z"
  });

  const db: Queryable = {
    async query<T = unknown>(text: string, values: unknown[] = []): Promise<{ rows: T[] }> {
      const t = text;

      // report_definitions findById
      if (t.includes("from report_definitions") && t.includes("where id = $1")) {
        const [id, organizationId] = values as [string, string];
        const found = defs.find((d) => d.id === id && d.organizationId === organizationId && !d._deleted);
        return { rows: found ? [found as unknown as T] : [] };
      }

      // report_runs insert
      if (t.includes("insert into report_runs")) {
        const [orgId, reportDefinitionId, triggeredByUserId, status, parametersSnapshotRaw,
          resultColumnsRaw, resultRowsRaw, rowCount, errorDetail, startedAt, completedAt] =
          values as [string, string, string | null, string, string, string, string, number, string | null, string | null, string | null];
        const row: ReportRun = {
          id: `rr_sd_${reportRuns.length + 1}`,
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

      // pipeline_stages query
      if (t.includes("from pipeline_stages")) {
        return { rows: [{ stage: "Discovery", open_count: "1", pipeline_value_minor: "3000" }] as unknown as T[] };
      }

      // scheduled_deliveries insert
      // Note: SQL has 'in_app' hardcoded: $1-$11, no channel param
      if (t.includes("insert into scheduled_deliveries")) {
        const [orgId, ownerUserId, name, targetType, targetId, cadence, timezone, nextRunAt,
          recipientUserIdsRaw, isShared, active] = values as [
          string, string | null, string, string, string, string, string, string, string, boolean, boolean
        ];
        const row: ScheduledDelivery = {
          id: `sd_http_${deliveries.length + 1}`,
          organizationId: orgId,
          ownerUserId: ownerUserId ?? null,
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

      // scheduled_deliveries findById — return a copy to avoid mutation contamination
      if (t.includes("from scheduled_deliveries") && t.includes("where id = $1")) {
        const [id, organizationId] = values as [string, string];
        const found = deliveries.find((d) => d.id === id && d.organizationId === organizationId && !d._deleted);
        return { rows: found ? [{ ...found } as unknown as T] : [] };
      }

      // scheduled_deliveries list
      if (t.includes("from scheduled_deliveries") && t.includes("order by name")) {
        const [organizationId] = values as [string];
        const rows = deliveries.filter((d) => d.organizationId === organizationId && !d._deleted);
        return { rows: rows as unknown as T[] };
      }

      // scheduled_deliveries listDue
      if (t.includes("from scheduled_deliveries") && t.includes("active = true") && t.includes("next_run_at <=")) {
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

      // scheduled_deliveries soft-delete
      if (t.includes("update scheduled_deliveries") && t.includes("deleted_at = now()")) {
        const [id, organizationId] = values as [string, string];
        const d = deliveries.find((d) => d.id === id && d.organizationId === organizationId && !d._deleted);
        if (!d) return { rows: [] };
        d._deleted = true;
        return { rows: [{ id: d.id } as unknown as T] };
      }

      // scheduled_deliveries advanceNextRunAt
      if (t.includes("update scheduled_deliveries") && t.includes("next_run_at = $3") && t.includes("last_run_at = now()")) {
        const [id, organizationId, nextRunAt] = values as [string, string, string];
        const d = deliveries.find((d) => d.id === id && d.organizationId === organizationId && !d._deleted);
        if (d) { d.nextRunAt = nextRunAt; d._nextRunAtChanged = true; }
        return { rows: [] };
      }

      // scheduled_deliveries update patch
      if (t.includes("update scheduled_deliveries") && t.includes("updated_at = now()")) {
        const [id, organizationId] = values as [string, string];
        const d = deliveries.find((d) => d.id === id && d.organizationId === organizationId && !d._deleted);
        if (!d) return { rows: [] };
        // Apply name patch if present
        if (t.includes("name = $")) {
          const nameVal = values.slice(2).find((v) => typeof v === "string" && !v.startsWith("{") && !v.startsWith("["));
          if (nameVal) d.name = nameVal as string;
        }
        if (t.includes("is_shared = $")) {
          const sv = values.slice(2).find((v) => typeof v === "boolean");
          if (sv !== undefined) d.isShared = sv as boolean;
        }
        return { rows: [d as unknown as T] };
      }

      // delivery_runs insert
      if (t.includes("insert into delivery_runs")) {
        const [orgId, scheduledDeliveryId, reportRunId, triggeredBy, status, errorDetail,
          snapshotSummaryRaw, startedAt, completedAt] = values as [
          string, string, string | null, string, string, string | null, string, string | null, string | null
        ];
        const row: DeliveryRun = {
          id: `dr_http_${deliveryRuns.length + 1}`,
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

      // delivery_runs findById
      if (t.includes("from delivery_runs") && t.includes("where id = $1")) {
        const [id, organizationId] = values as [string, string];
        const found = deliveryRuns.find((r) => r.id === id && r.organizationId === organizationId);
        return { rows: found ? [found as unknown as T] : [] };
      }

      // delivery_runs list by delivery
      if (t.includes("from delivery_runs") && t.includes("scheduled_delivery_id = $2")) {
        const [organizationId, scheduledDeliveryId] = values as [string, string];
        const rows = deliveryRuns
          .filter((r) => r.organizationId === organizationId && r.scheduledDeliveryId === scheduledDeliveryId)
          .sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));
        return { rows: rows as unknown as T[] };
      }

      // audit_events insert
      if (t.includes("insert into audit_events")) {
        audits.push(values);
        return { rows: [] };
      }

      return { rows: [] };
    }
  };

  return { db, defs, deliveries, deliveryRuns, reportRuns, audits };
}

const orgId = "org_sd_http";
const userId = "user_sd_http";

function buildTestApp(db: Queryable) {
  return buildApp({ db, resolveTenant: headerTenantResolver });
}

function hdrs(userOverride?: string) {
  return {
    "x-organization-id": orgId,
    "x-user-identity-id": userOverride ?? userId,
    "content-type": "application/json"
  };
}

describe("Reporting ScheduledDeliveries HTTP (DS 5.3)", () => {
  it("401 when no tenant headers", async () => {
    const { db } = makeFakeDb();
    const app = buildTestApp(db);
    const res = await app.request("/reporting/scheduled-deliveries", { method: "GET" });
    expect(res.status).toBe(401);
  });

  it("POST /reporting/scheduled-deliveries → 201", async () => {
    const { db } = makeFakeDb();
    const app = buildTestApp(db);
    const res = await app.request("/reporting/scheduled-deliveries", {
      method: "POST",
      headers: hdrs(),
      body: JSON.stringify({
        name: "Weekly funnel",
        targetType: "report_definition",
        targetId: "rd_http_sd_1",
        cadence: "weekly",
        timezone: "UTC",
        recipientUserIds: [userId]
      })
    });
    expect(res.status).toBe(201);
    const body = await res.json() as ScheduledDelivery;
    expect(body.name).toBe("Weekly funnel");
    expect(body.id).toBeTruthy();
    expect(body.cadence).toBe("weekly");
    expect(body.channel).toBe("in_app");
  });

  it("POST /reporting/scheduled-deliveries → 400 when name missing", async () => {
    const { db } = makeFakeDb();
    const app = buildTestApp(db);
    const res = await app.request("/reporting/scheduled-deliveries", {
      method: "POST",
      headers: hdrs(),
      body: JSON.stringify({ targetId: "rd_http_sd_1", cadence: "weekly" })
    });
    expect(res.status).toBe(400);
  });

  it("POST /reporting/scheduled-deliveries → 400 for invalid cadence", async () => {
    const { db } = makeFakeDb();
    const app = buildTestApp(db);
    const res = await app.request("/reporting/scheduled-deliveries", {
      method: "POST",
      headers: hdrs(),
      body: JSON.stringify({ name: "Bad cadence", targetId: "rd_http_sd_1", cadence: "hourly" })
    });
    expect(res.status).toBe(400);
  });

  it("POST /reporting/scheduled-deliveries → 400 for bad target", async () => {
    const { db } = makeFakeDb();
    const app = buildTestApp(db);
    const res = await app.request("/reporting/scheduled-deliveries", {
      method: "POST",
      headers: hdrs(),
      body: JSON.stringify({
        name: "Bad target",
        targetType: "report_definition",
        targetId: "nonexistent-rd",
        cadence: "weekly"
      })
    });
    expect(res.status).toBe(400);
  });

  it("GET /reporting/scheduled-deliveries → 200 with items", async () => {
    const { db } = makeFakeDb();
    const app = buildTestApp(db);
    await app.request("/reporting/scheduled-deliveries", {
      method: "POST",
      headers: hdrs(),
      body: JSON.stringify({ name: "SD1", targetId: "rd_http_sd_1", cadence: "monthly" })
    });
    const res = await app.request("/reporting/scheduled-deliveries", {
      method: "GET",
      headers: hdrs()
    });
    expect(res.status).toBe(200);
    const body = await res.json() as { items: ScheduledDelivery[] };
    expect(body.items).toHaveLength(1);
  });

  it("GET /reporting/scheduled-deliveries/:id → 200", async () => {
    const { db } = makeFakeDb();
    const app = buildTestApp(db);
    const createRes = await app.request("/reporting/scheduled-deliveries", {
      method: "POST",
      headers: hdrs(),
      body: JSON.stringify({ name: "GetById", targetId: "rd_http_sd_1", cadence: "weekly" })
    });
    const created = await createRes.json() as ScheduledDelivery;
    const res = await app.request(`/reporting/scheduled-deliveries/${created.id}`, {
      method: "GET",
      headers: hdrs()
    });
    expect(res.status).toBe(200);
    const body = await res.json() as ScheduledDelivery;
    expect(body.id).toBe(created.id);
  });

  it("GET /reporting/scheduled-deliveries/:id → 404 for unknown id", async () => {
    const { db } = makeFakeDb();
    const app = buildTestApp(db);
    const res = await app.request("/reporting/scheduled-deliveries/nope", {
      method: "GET",
      headers: hdrs()
    });
    expect(res.status).toBe(404);
  });

  it("PATCH /reporting/scheduled-deliveries/:id → 200", async () => {
    const { db } = makeFakeDb();
    const app = buildTestApp(db);
    const createRes = await app.request("/reporting/scheduled-deliveries", {
      method: "POST",
      headers: hdrs(),
      body: JSON.stringify({ name: "Before patch", targetId: "rd_http_sd_1", cadence: "weekly", ownerUserId: userId })
    });
    const created = await createRes.json() as ScheduledDelivery;
    const patchRes = await app.request(`/reporting/scheduled-deliveries/${created.id}`, {
      method: "PATCH",
      headers: hdrs(),
      body: JSON.stringify({ name: "After patch" })
    });
    expect(patchRes.status).toBe(200);
    const updated = await patchRes.json() as ScheduledDelivery;
    expect(updated.name).toBe("After patch");
  });

  it("PATCH /reporting/scheduled-deliveries/:id → 403 for non-owner on shared delivery", async () => {
    const { db } = makeFakeDb();
    const app = buildTestApp(db);
    const createRes = await app.request("/reporting/scheduled-deliveries", {
      method: "POST",
      headers: hdrs(),
      body: JSON.stringify({ name: "Shared", targetId: "rd_http_sd_1", cadence: "weekly", isShared: true, ownerUserId: userId })
    });
    const created = await createRes.json() as ScheduledDelivery;
    const res = await app.request(`/reporting/scheduled-deliveries/${created.id}`, {
      method: "PATCH",
      headers: hdrs("user_other"),
      body: JSON.stringify({ name: "Hacked" })
    });
    expect(res.status).toBe(403);
  });

  it("DELETE /reporting/scheduled-deliveries/:id → 204", async () => {
    const { db } = makeFakeDb();
    const app = buildTestApp(db);
    const createRes = await app.request("/reporting/scheduled-deliveries", {
      method: "POST",
      headers: hdrs(),
      body: JSON.stringify({ name: "Delete me", targetId: "rd_http_sd_1", cadence: "monthly" })
    });
    const created = await createRes.json() as ScheduledDelivery;
    const delRes = await app.request(`/reporting/scheduled-deliveries/${created.id}`, {
      method: "DELETE",
      headers: hdrs()
    });
    expect(delRes.status).toBe(204);
  });

  it("DELETE /reporting/scheduled-deliveries/:id → 404 for unknown id", async () => {
    const { db } = makeFakeDb();
    const app = buildTestApp(db);
    const res = await app.request("/reporting/scheduled-deliveries/nope", {
      method: "DELETE",
      headers: hdrs()
    });
    expect(res.status).toBe(404);
  });

  it("POST /reporting/scheduled-deliveries/run → 200 with summary (run-due)", async () => {
    const { db, deliveries } = makeFakeDb();
    const app = buildTestApp(db);

    // Create a delivery with recipients so it executes
    const createRes = await app.request("/reporting/scheduled-deliveries", {
      method: "POST",
      headers: hdrs(),
      body: JSON.stringify({
        name: "Due delivery",
        targetId: "rd_http_sd_1",
        cadence: "weekly",
        recipientUserIds: [userId]
      })
    });
    const created = await createRes.json() as ScheduledDelivery;

    // Force it to be due
    const d = deliveries.find((x) => x.id === created.id)!;
    d.nextRunAt = "2020-01-01T00:00:00.000Z";

    const runRes = await app.request("/reporting/scheduled-deliveries/run", {
      method: "POST",
      headers: hdrs()
    });
    expect(runRes.status).toBe(200);
    const body = await runRes.json() as { processed: number; results: unknown[] };
    expect(body.processed).toBe(1);
    expect(body.results).toHaveLength(1);
  });

  it("POST /reporting/scheduled-deliveries/:id/run → 200 (run-now manual)", async () => {
    const { db } = makeFakeDb();
    const app = buildTestApp(db);
    const createRes = await app.request("/reporting/scheduled-deliveries", {
      method: "POST",
      headers: hdrs(),
      body: JSON.stringify({
        name: "Manual run",
        targetId: "rd_http_sd_1",
        cadence: "weekly",
        recipientUserIds: [userId]
      })
    });
    const created = await createRes.json() as ScheduledDelivery;
    const runRes = await app.request(`/reporting/scheduled-deliveries/${created.id}/run`, {
      method: "POST",
      headers: hdrs()
    });
    expect(runRes.status).toBe(200);
    const body = await runRes.json() as DeliveryRun;
    expect(body.triggeredBy).toBe("manual");
    expect(body.status).toBe("completed");
  });

  it("POST /reporting/scheduled-deliveries/:id/run → 404 for unknown id", async () => {
    const { db } = makeFakeDb();
    const app = buildTestApp(db);
    const res = await app.request("/reporting/scheduled-deliveries/nope/run", {
      method: "POST",
      headers: hdrs()
    });
    expect(res.status).toBe(404);
  });

  it("GET /reporting/scheduled-deliveries/:id/runs → 200 with runs list", async () => {
    const { db } = makeFakeDb();
    const app = buildTestApp(db);
    const createRes = await app.request("/reporting/scheduled-deliveries", {
      method: "POST",
      headers: hdrs(),
      body: JSON.stringify({ name: "With runs", targetId: "rd_http_sd_1", cadence: "weekly", recipientUserIds: [userId] })
    });
    const created = await createRes.json() as ScheduledDelivery;

    // Run it once
    await app.request(`/reporting/scheduled-deliveries/${created.id}/run`, {
      method: "POST",
      headers: hdrs()
    });

    const runsRes = await app.request(`/reporting/scheduled-deliveries/${created.id}/runs`, {
      method: "GET",
      headers: hdrs()
    });
    expect(runsRes.status).toBe(200);
    const body = await runsRes.json() as { items: DeliveryRun[] };
    expect(body.items).toHaveLength(1);
  });

  it("GET /reporting/delivery-runs/:id → 200", async () => {
    const { db } = makeFakeDb();
    const app = buildTestApp(db);
    const createRes = await app.request("/reporting/scheduled-deliveries", {
      method: "POST",
      headers: hdrs(),
      body: JSON.stringify({ name: "Run then get", targetId: "rd_http_sd_1", cadence: "weekly", recipientUserIds: [userId] })
    });
    const created = await createRes.json() as ScheduledDelivery;
    const runRes = await app.request(`/reporting/scheduled-deliveries/${created.id}/run`, {
      method: "POST",
      headers: hdrs()
    });
    const deliveryRun = await runRes.json() as DeliveryRun;

    const getRes = await app.request(`/reporting/delivery-runs/${deliveryRun.id}`, {
      method: "GET",
      headers: hdrs()
    });
    expect(getRes.status).toBe(200);
    const body = await getRes.json() as DeliveryRun;
    expect(body.id).toBe(deliveryRun.id);
  });

  it("GET /reporting/delivery-runs/:id → 404 for unknown id", async () => {
    const { db } = makeFakeDb();
    const app = buildTestApp(db);
    const res = await app.request("/reporting/delivery-runs/nope", {
      method: "GET",
      headers: hdrs()
    });
    expect(res.status).toBe(404);
  });
});
