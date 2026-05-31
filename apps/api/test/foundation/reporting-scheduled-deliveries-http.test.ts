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
          targetType: targetType as ScheduledDelivery["targetType"],
          targetId,
          cadence: cadence as ScheduledDelivery["cadence"],
          timezone,
          nextRunAt,
          lastRunAt: null,
          channel: "in_app",
          recipientUserIds: JSON.parse(recipientUserIdsRaw) as string[],
          isShared,
          active,
          createdAt: "2026-05-29T08:00:00.000Z",
          updatedAt: "2026-05-29T08:00:00.000Z"
        };
        deliveries.push(row);
        return { rows: [row as unknown as T] };
      }

      // scheduled_deliveries list
      if (t.includes("from scheduled_deliveries") && t.includes("deleted_at is null") && !t.includes("where id = $1")) {
        const [orgId] = values as [string];
        const rows = deliveries.filter((d) => d.organizationId === orgId && !d._deleted);
        return { rows: rows as unknown as T[] };
      }

      // scheduled_deliveries findById
      if (t.includes("from scheduled_deliveries") && t.includes("where id = $1")) {
        const [id, orgId] = values as [string, string];
        const found = deliveries.find((d) => d.id === id && d.organizationId === orgId && !d._deleted);
        return { rows: found ? [found as unknown as T] : [] };
      }

      // scheduled_deliveries update/delete
      if (t.includes("update scheduled_deliveries") && t.includes("returning")) {
        if (t.includes("deleted_at = now()")) {
          const [id, orgId] = values as [string, string];
          const d = deliveries.find((d) => d.id === id && d.organizationId === orgId && !d._deleted);
          if (d) { d._deleted = true; return { rows: [d as unknown as T] }; }
          return { rows: [] };
        }
        if (t.includes("next_run_at")) {
          const [id, orgId] = values as [string, string];
          const d = deliveries.find((d) => d.id === id && d.organizationId === orgId && !d._deleted);
          if (d) { d._nextRunAtChanged = true; return { rows: [d as unknown as T] }; }
          return { rows: [] };
        }
        const [id, orgId] = values as [string, string];
        const d = deliveries.find((d) => d.id === id && d.organizationId === orgId && !d._deleted);
        if (d) return { rows: [d as unknown as T] };
        return { rows: [] };
      }

      // scheduled_deliveries list due
      if (t.includes("from scheduled_deliveries") && t.includes("next_run_at <=")) {
        return { rows: [] };
      }

      // delivery_runs insert
      if (t.includes("insert into delivery_runs")) {
        const [orgId, scheduledDeliveryId, reportRunId, triggeredBy, status, errorDetail,
          snapshotSummaryRaw, startedAt, completedAt] =
          values as [string, string, string | null, string, string, string | null, string, string, string];
        const row: DeliveryRun = {
          id: `dr_http_${deliveryRuns.length + 1}`,
          organizationId: orgId,
          scheduledDeliveryId,
          reportRunId: reportRunId ?? null,
          triggeredBy: triggeredBy as DeliveryRun["triggeredBy"],
          status: status as DeliveryRun["status"],
          errorDetail: errorDetail ?? null,
          snapshotSummary: JSON.parse(snapshotSummaryRaw) as Record<string, unknown>,
          startedAt: startedAt ?? null,
          completedAt: completedAt ?? null,
          createdAt: "2026-05-29T08:00:00.000Z"
        };
        deliveryRuns.push(row);
        return { rows: [row as unknown as T] };
      }

      // delivery_runs findById
      if (t.includes("from delivery_runs") && t.includes("where id = $1")) {
        const [id, orgId] = values as [string, string];
        const found = deliveryRuns.find((r) => r.id === id && r.organizationId === orgId);
        return { rows: found ? [found as unknown as T] : [] };
      }

      // delivery_runs list by delivery
      if (t.includes("from delivery_runs") && t.includes("scheduled_delivery_id = $2")) {
        const [orgId, sdId] = values as [string, string];
        const rows = deliveryRuns.filter((r) => r.organizationId === orgId && r.scheduledDeliveryId === sdId);
        return { rows: rows as unknown as T[] };
      }

      // webhook_endpoints (ignore in this test context — return empty)
      if (t.includes("webhook_endpoints") || t.includes("webhook_deliveries")) {
        return { rows: [] };
      }

      // workflow_definitions (ignore in this test context)
      if (t.includes("workflow_definitions") || t.includes("workflow_runs")) {
        return { rows: [] };
      }

      // audit_events insert
      if (t.includes("insert into audit_events")) {
        const row = { id: `audit_${audits.length + 1}` };
        audits.push(row);
        return { rows: [row as unknown as T] };
      }

      return { rows: [] };
    }
  };

  return { db, defs, deliveries, deliveryRuns, audits };
}

describe("reporting scheduled-deliveries HTTP (DS 5.3)", () => {
  it("POST /reporting/scheduled-deliveries creates a delivery and returns 201", async () => {
    const { db } = makeFakeDb();
    const app = buildApp({
      db,
      resolveTenant: headerTenantResolver
    });

    const res = await app.request("/reporting/scheduled-deliveries", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-organization-id": "org_sd_http",
        "x-user-identity-id": "user_sd_http"
      },
      body: JSON.stringify({
        name: "Test delivery",
        targetType: "report_definition",
        targetId: "rd_http_sd_1",
        cadence: "weekly",
        timezone: "UTC",
        recipientUserIds: ["user_sd_http"]
      })
    });
    expect(res.status).toBe(201);
    const data = await res.json() as { id: string; name: string; cadence: string };
    expect(data.id).toBeDefined();
    expect(data.name).toBe("Test delivery");
    expect(data.cadence).toBe("weekly");
  });

  it("POST /reporting/scheduled-deliveries returns 400 for missing name", async () => {
    const { db } = makeFakeDb();
    const app = buildApp({ db, resolveTenant: headerTenantResolver });

    const res = await app.request("/reporting/scheduled-deliveries", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-organization-id": "org_sd_http",
        "x-user-identity-id": "user_sd_http"
      },
      body: JSON.stringify({ targetType: "report_definition", targetId: "rd_http_sd_1", cadence: "weekly", timezone: "UTC" })
    });
    expect(res.status).toBe(400);
  });

  it("GET /reporting/scheduled-deliveries returns list", async () => {
    const { db } = makeFakeDb();
    const app = buildApp({ db, resolveTenant: headerTenantResolver });

    const res = await app.request("/reporting/scheduled-deliveries", {
      headers: {
        "x-organization-id": "org_sd_http",
        "x-user-identity-id": "user_sd_http"
      }
    });
    expect(res.status).toBe(200);
    const data = await res.json() as { items: unknown[] };
    expect(Array.isArray(data.items)).toBe(true);
  });

  it("GET /reporting/scheduled-deliveries/:id returns 404 for unknown id", async () => {
    const { db } = makeFakeDb();
    const app = buildApp({ db, resolveTenant: headerTenantResolver });

    const res = await app.request("/reporting/scheduled-deliveries/unknown-id", {
      headers: {
        "x-organization-id": "org_sd_http",
        "x-user-identity-id": "user_sd_http"
      }
    });
    expect(res.status).toBe(404);
  });

  it("returns 401 without tenant headers", async () => {
    const { db } = makeFakeDb();
    const app = buildApp({ db, resolveTenant: headerTenantResolver });

    const res = await app.request("/reporting/scheduled-deliveries");
    expect(res.status).toBe(401);
  });
});
