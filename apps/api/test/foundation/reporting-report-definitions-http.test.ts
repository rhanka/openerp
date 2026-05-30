import { describe, expect, it } from "vitest";

import type { ReportDefinition, ReportRun } from "@sentropic/openerp-domain/reporting";
import type { Queryable } from "../../src/db/client";
import { buildApp, headerTenantResolver } from "../../src/http/app";

function makeFakeDb(opts: { runThrows?: boolean } = {}) {
  const defs: ReportDefinition[] = [];
  const runs: ReportRun[] = [];
  let pipelineRows: Record<string, unknown>[] = [];

  const db: Queryable = {
    async query<T = unknown>(text: string, values: unknown[] = []): Promise<{ rows: T[] }> {
      const t = text;

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

      if (t.includes("from report_definitions") && t.includes("where id = $1")) {
        const [id, organizationId] = values as [string, string];
        const found = defs.find(
          (d) =>
            d.id === id &&
            d.organizationId === organizationId &&
            !(d as unknown as { _deleted?: boolean })._deleted
        );
        return { rows: found ? [found as unknown as T] : [] };
      }

      if (t.includes("from report_definitions") && t.includes("order by name")) {
        const [organizationId, filterReportType, , , limit, offset] = values as [
          string, string | null, string | null, boolean | null, number, number
        ];
        const filtered = defs
          .filter((d) => d.organizationId === organizationId)
          .filter((d) => !(d as unknown as { _deleted?: boolean })._deleted)
          .filter((d) => filterReportType ? d.reportType === filterReportType : true)
          .sort((a, b) => a.name.localeCompare(b.name))
          .slice(offset, offset + limit);
        return { rows: filtered as unknown as T[] };
      }

      if (t.includes("update report_definitions") && t.includes("deleted_at = now()")) {
        const [id, organizationId] = values as [string, string];
        const idx = defs.findIndex(
          (d) =>
            d.id === id &&
            d.organizationId === organizationId &&
            !(d as unknown as { _deleted?: boolean })._deleted
        );
        if (idx === -1) return { rows: [] };
        (defs[idx] as unknown as { _deleted: boolean })._deleted = true;
        return { rows: [{ id: defs[idx]!.id } as unknown as T] };
      }

      if (t.includes("update report_definitions")) {
        const [id, organizationId] = values as [string, string];
        const idx = defs.findIndex(
          (d) =>
            d.id === id &&
            d.organizationId === organizationId &&
            !(d as unknown as { _deleted?: boolean })._deleted
        );
        if (idx === -1) return { rows: [] };
        const trailing = values.slice(2);
        const patch: Partial<ReportDefinition> = {};
        if (t.includes("name = $")) {
          const candidate = trailing.find(
            (v) => typeof v === "string" && !v.startsWith("{") && !v.startsWith("[")
          );
          if (candidate) patch.name = candidate as string;
        }
        if (t.includes("is_shared = $")) {
          const candidate = trailing.find((v) => typeof v === "boolean");
          if (candidate !== undefined) patch.isShared = candidate as boolean;
        }
        defs[idx] = { ...defs[idx]!, ...patch, updatedAt: "2026-05-29T08:05:00.000Z" };
        return { rows: [defs[idx]! as unknown as T] };
      }

      if (t.includes("insert into report_runs")) {
        const [orgId, reportDefinitionId, triggeredByUserId, status, parametersSnapshotRaw,
          resultColumnsRaw, resultRowsRaw, rowCount, errorDetail, startedAt, completedAt] =
          values as [string, string, string | null, string, string, string, string, number, string | null, string | null, string | null];
        const row: ReportRun = {
          id: `rr_${runs.length + 1}`,
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
        runs.push(row);
        return { rows: [row as unknown as T] };
      }

      if (t.includes("from report_runs") && t.includes("where id = $1")) {
        const [id, orgId] = values as [string, string];
        const found = runs.find((r) => r.id === id && r.organizationId === orgId);
        return { rows: found ? [found as unknown as T] : [] };
      }

      if (t.includes("from report_runs") && t.includes("order by created_at")) {
        const [orgId, defId, limit, offset] = values as [string, string | null, number, number];
        const filtered = runs
          .filter((r) => r.organizationId === orgId)
          .filter((r) => defId ? r.reportDefinitionId === defId : true)
          .slice(offset, offset + limit);
        return { rows: filtered as unknown as T[] };
      }

      if (t.includes("insert into audit_events")) {
        return { rows: [] };
      }

      if (t.includes("from pipeline_stages")) {
        if (opts.runThrows) throw new Error("DB query failed");
        return { rows: pipelineRows as unknown as T[] };
      }

      return { rows: [] };
    }
  };

  return { db, defs, runs, setPipelineRows: (rows: Record<string, unknown>[]) => { pipelineRows = rows; } };
}

const tenantHeaders = {
  "x-organization-id": "00000000-0000-0000-0000-000000000001",
  "x-user-identity-id": "00000000-0000-0000-0000-000000000aaa"
} as const;

const ownerB = {
  "x-organization-id": "00000000-0000-0000-0000-000000000001",
  "x-user-identity-id": "00000000-0000-0000-0000-000000000bbb"
} as const;

describe("Reporting /reporting/report-types HTTP surface (DS 5.1)", () => {
  it("GET /reporting/report-types returns catalog items", async () => {
    const { db } = makeFakeDb();
    const app = buildApp({ db, resolveTenant: headerTenantResolver });
    const res = await app.request("/reporting/report-types", { headers: tenantHeaders });
    expect(res.status).toBe(200);
    const body = await res.json() as { items: unknown[] };
    expect(body.items.length).toBe(4);
  });
});

describe("Reporting /reporting/report-definitions HTTP surface (DS 5.1)", () => {
  it("POST creates and returns 201 + body", async () => {
    const { db } = makeFakeDb();
    const app = buildApp({ db, resolveTenant: headerTenantResolver });
    const res = await app.request("/reporting/report-definitions", {
      method: "POST",
      headers: { "content-type": "application/json", ...tenantHeaders },
      body: JSON.stringify({ reportType: "crm.pipeline_funnel", name: "My funnel" })
    });
    expect(res.status).toBe(201);
    const body = await res.json() as ReportDefinition;
    expect(body.reportType).toBe("crm.pipeline_funnel");
    expect(body.name).toBe("My funnel");
    expect(body.id).toBeDefined();
  });

  it("POST rejects missing name with 400 INVALID_INPUT", async () => {
    const { db } = makeFakeDb();
    const app = buildApp({ db, resolveTenant: headerTenantResolver });
    const res = await app.request("/reporting/report-definitions", {
      method: "POST",
      headers: { "content-type": "application/json", ...tenantHeaders },
      body: JSON.stringify({ reportType: "crm.pipeline_funnel" })
    });
    expect(res.status).toBe(400);
    const body = await res.json() as { code: string; errors: Record<string, string> };
    expect(body.code).toBe("INVALID_INPUT");
    expect(body.errors.name).toBe("REQUIRED");
  });

  it("POST rejects unknown report type with 400 UNKNOWN_REPORT_TYPE", async () => {
    const { db } = makeFakeDb();
    const app = buildApp({ db, resolveTenant: headerTenantResolver });
    const res = await app.request("/reporting/report-definitions", {
      method: "POST",
      headers: { "content-type": "application/json", ...tenantHeaders },
      body: JSON.stringify({ reportType: "unknown.type", name: "X" })
    });
    expect(res.status).toBe(400);
    const body = await res.json() as { code: string };
    expect(body.code).toBe("UNKNOWN_REPORT_TYPE");
  });

  it("GET /reporting/report-definitions returns { items: [] } when no records", async () => {
    const { db } = makeFakeDb();
    const app = buildApp({ db, resolveTenant: headerTenantResolver });
    const res = await app.request("/reporting/report-definitions", { headers: tenantHeaders });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ items: [] });
  });

  it("GET /reporting/report-definitions/:id returns 404 when not found", async () => {
    const { db } = makeFakeDb();
    const app = buildApp({ db, resolveTenant: headerTenantResolver });
    const res = await app.request("/reporting/report-definitions/rd_missing", {
      headers: tenantHeaders
    });
    expect(res.status).toBe(404);
  });

  it("PATCH /reporting/report-definitions/:id returns 404 when not found", async () => {
    const { db } = makeFakeDb();
    const app = buildApp({ db, resolveTenant: headerTenantResolver });
    const res = await app.request("/reporting/report-definitions/rd_missing", {
      method: "PATCH",
      headers: { "content-type": "application/json", ...tenantHeaders },
      body: JSON.stringify({ name: "x" })
    });
    expect(res.status).toBe(404);
  });

  it("DELETE /reporting/report-definitions/:id returns 204 after soft-delete", async () => {
    const { db } = makeFakeDb();
    const app = buildApp({ db, resolveTenant: headerTenantResolver });
    const created = await (
      await app.request("/reporting/report-definitions", {
        method: "POST",
        headers: { "content-type": "application/json", ...tenantHeaders },
        body: JSON.stringify({ reportType: "crm.pipeline_funnel", name: "ToDelete" })
      })
    ).json() as ReportDefinition;
    const del = await app.request(`/reporting/report-definitions/${created.id}`, {
      method: "DELETE",
      headers: tenantHeaders
    });
    expect(del.status).toBe(204);
  });

  it("DELETE /reporting/report-definitions/:id returns 404 when not found", async () => {
    const { db } = makeFakeDb();
    const app = buildApp({ db, resolveTenant: headerTenantResolver });
    const res = await app.request("/reporting/report-definitions/rd_missing", {
      method: "DELETE",
      headers: tenantHeaders
    });
    expect(res.status).toBe(404);
  });

  it("rejects requests without tenant context (401)", async () => {
    const { db } = makeFakeDb();
    const app = buildApp({ db, resolveTenant: headerTenantResolver });
    const res = await app.request("/reporting/report-definitions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ reportType: "crm.pipeline_funnel", name: "X" })
    });
    expect(res.status).toBe(401);
  });

  it("POST /reporting/report-definitions/:id/run returns 200 with rows (success)", async () => {
    const { db, setPipelineRows } = makeFakeDb();
    setPipelineRows([{ stage: "Discovery", open_count: "2", pipeline_value_minor: "3000" }]);
    const app = buildApp({ db, resolveTenant: headerTenantResolver });
    const created = await (
      await app.request("/reporting/report-definitions", {
        method: "POST",
        headers: { "content-type": "application/json", ...tenantHeaders },
        body: JSON.stringify({ reportType: "crm.pipeline_funnel", name: "Funnel run" })
      })
    ).json() as ReportDefinition;

    const res = await app.request(`/reporting/report-definitions/${created.id}/run`, {
      method: "POST",
      headers: tenantHeaders
    });
    expect(res.status).toBe(200);
    const run = await res.json() as ReportRun;
    expect(run.status).toBe("completed");
    expect(run.rowCount).toBe(1);
    expect(run.resultRows).toHaveLength(1);
    expect(run.resultColumns.length).toBeGreaterThan(0);
  });

  it("POST /reporting/report-definitions/:id/run returns 422 on run failure", async () => {
    const { db } = makeFakeDb({ runThrows: true });
    const app = buildApp({ db, resolveTenant: headerTenantResolver });
    const created = await (
      await app.request("/reporting/report-definitions", {
        method: "POST",
        headers: { "content-type": "application/json", ...tenantHeaders },
        body: JSON.stringify({ reportType: "crm.pipeline_funnel", name: "Funnel fail" })
      })
    ).json() as ReportDefinition;

    const res = await app.request(`/reporting/report-definitions/${created.id}/run`, {
      method: "POST",
      headers: tenantHeaders
    });
    expect(res.status).toBe(422);
    const body = await res.json() as { code: string };
    expect(body.code).toBe("REPORT_RUN_FAILED");
  });

  it("PATCH /reporting/report-definitions/:id returns 403 for shared non-owner", async () => {
    const { db } = makeFakeDb();
    const app = buildApp({ db, resolveTenant: headerTenantResolver });
    // Create as owner A
    const created = await (
      await app.request("/reporting/report-definitions", {
        method: "POST",
        headers: { "content-type": "application/json", ...tenantHeaders },
        body: JSON.stringify({
          reportType: "crm.pipeline_funnel",
          name: "Shared def",
          isShared: true,
          ownerUserId: "00000000-0000-0000-0000-000000000aaa"
        })
      })
    ).json() as ReportDefinition;

    // Attempt update as owner B
    const res = await app.request(`/reporting/report-definitions/${created.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json", ...ownerB },
      body: JSON.stringify({ name: "Hacked" })
    });
    expect(res.status).toBe(403);
  });
});

describe("Reporting /reporting/report-runs HTTP surface (DS 5.1)", () => {
  it("GET /reporting/report-runs returns { items: [] } when no runs", async () => {
    const { db } = makeFakeDb();
    const app = buildApp({ db, resolveTenant: headerTenantResolver });
    const res = await app.request("/reporting/report-runs", { headers: tenantHeaders });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ items: [] });
  });

  it("GET /reporting/report-runs/:id returns 404 when not found", async () => {
    const { db } = makeFakeDb();
    const app = buildApp({ db, resolveTenant: headerTenantResolver });
    const res = await app.request("/reporting/report-runs/rr_missing", {
      headers: tenantHeaders
    });
    expect(res.status).toBe(404);
  });
});
