import { describe, expect, it } from "vitest";

import type { Dashboard, DashboardWidget, ReportDefinition } from "@sentropic/openerp-domain/reporting";
import type { Queryable } from "../../src/db/client";
import { buildApp, headerTenantResolver } from "../../src/http/app";

function makeFakeDb() {
  const dashboards: Dashboard[] = [];
  const widgets: DashboardWidget[] = [];
  const defs: ReportDefinition[] = [];
  const audits: unknown[] = [];

  // Seed a default report definition
  defs.push({
    id: "rd_http_1",
    organizationId: "org_http",
    ownerUserId: null,
    reportType: "crm.pipeline_funnel",
    name: "HTTP funnel",
    parameters: {},
    isShared: false,
    createdAt: "2026-05-29T08:00:00.000Z",
    updatedAt: "2026-05-29T08:00:00.000Z"
  });

  const db: Queryable = {
    async query<T = unknown>(text: string, values: unknown[] = []): Promise<{ rows: T[] }> {
      const t = text;

      if (t.includes("insert into dashboards")) {
        const [orgId, ownerUserId, name, description, isShared] = values as [
          string, string | null, string, string | null, boolean
        ];
        const row: Dashboard = {
          id: `dash_http_${dashboards.length + 1}`,
          organizationId: orgId,
          ownerUserId: ownerUserId ?? null,
          name,
          description: description ?? null,
          isShared,
          createdAt: "2026-05-29T08:00:00.000Z",
          updatedAt: "2026-05-29T08:00:00.000Z"
        };
        dashboards.push(row);
        return { rows: [row as unknown as T] };
      }

      if (t.includes("from dashboards") && t.includes("where id = $1")) {
        const [id, organizationId] = values as [string, string];
        const found = dashboards.find(
          (d) =>
            d.id === id &&
            d.organizationId === organizationId &&
            !(d as unknown as { _deleted?: boolean })._deleted
        );
        return { rows: found ? [found as unknown as T] : [] };
      }

      if (t.includes("from dashboards") && t.includes("order by name")) {
        const [organizationId, , , limit, offset] = values as [
          string, string | null, boolean | null, number, number
        ];
        const filtered = dashboards
          .filter((d) => d.organizationId === organizationId)
          .filter((d) => !(d as unknown as { _deleted?: boolean })._deleted)
          .sort((a, b) => a.name.localeCompare(b.name))
          .slice(offset, offset + limit);
        return { rows: filtered as unknown as T[] };
      }

      if (t.includes("update dashboards") && t.includes("deleted_at = now()")) {
        const [id, organizationId] = values as [string, string];
        const idx = dashboards.findIndex(
          (d) =>
            d.id === id &&
            d.organizationId === organizationId &&
            !(d as unknown as { _deleted?: boolean })._deleted
        );
        if (idx === -1) return { rows: [] };
        (dashboards[idx] as unknown as { _deleted: boolean })._deleted = true;
        return { rows: [{ id: dashboards[idx]!.id } as unknown as T] };
      }

      if (t.includes("update dashboards")) {
        const [id, organizationId] = values as [string, string];
        const idx = dashboards.findIndex(
          (d) =>
            d.id === id &&
            d.organizationId === organizationId &&
            !(d as unknown as { _deleted?: boolean })._deleted
        );
        if (idx === -1) return { rows: [] };
        return { rows: [dashboards[idx]! as unknown as T] };
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

      if (t.includes("insert into dashboard_widgets")) {
        const [orgId, dashboardId, reportDefinitionId, title, position] = values as [
          string, string, string, string | null, number
        ];
        const row: DashboardWidget = {
          id: `widget_http_${widgets.length + 1}`,
          organizationId: orgId,
          dashboardId,
          reportDefinitionId,
          title: title ?? null,
          position,
          createdAt: "2026-05-29T08:00:00.000Z",
          updatedAt: "2026-05-29T08:00:00.000Z"
        };
        widgets.push(row);
        return { rows: [row as unknown as T] };
      }

      if (t.includes("from dashboard_widgets") && t.includes("where id = $1")) {
        const [id, organizationId] = values as [string, string];
        const found = widgets.find(
          (w) =>
            w.id === id &&
            w.organizationId === organizationId &&
            !(w as unknown as { _deleted?: boolean })._deleted
        );
        return { rows: found ? [found as unknown as T] : [] };
      }

      if (t.includes("from dashboard_widgets") && t.includes("order by position")) {
        const [organizationId, dashboardId] = values as [string, string];
        const filtered = widgets
          .filter((w) => w.organizationId === organizationId && w.dashboardId === dashboardId)
          .filter((w) => !(w as unknown as { _deleted?: boolean })._deleted)
          .sort((a, b) => a.position - b.position);
        return { rows: filtered as unknown as T[] };
      }

      if (t.includes("update dashboard_widgets") && t.includes("deleted_at = now()")) {
        const [id, organizationId] = values as [string, string];
        const idx = widgets.findIndex(
          (w) =>
            w.id === id &&
            w.organizationId === organizationId &&
            !(w as unknown as { _deleted?: boolean })._deleted
        );
        if (idx === -1) return { rows: [] };
        (widgets[idx] as unknown as { _deleted: boolean })._deleted = true;
        return { rows: [{ id: widgets[idx]!.id } as unknown as T] };
      }

      if (t.includes("update dashboard_widgets")) {
        const [id, organizationId] = values as [string, string];
        const idx = widgets.findIndex(
          (w) =>
            w.id === id &&
            w.organizationId === organizationId &&
            !(w as unknown as { _deleted?: boolean })._deleted
        );
        if (idx === -1) return { rows: [] };
        return { rows: [widgets[idx]! as unknown as T] };
      }

      if (t.includes("insert into audit_events")) {
        audits.push(values);
        return { rows: [] };
      }

      if (t.includes("from pipeline_stages")) {
        return { rows: [{ stage: "Discovery", open_count: "1", pipeline_value_minor: "5000" }] as unknown as T[] };
      }

      return { rows: [] };
    }
  };

  return { db, dashboards, widgets, audits };
}

const orgId = "org_http";
const userId = "user_http";

function buildTestApp(db: Queryable) {
  return buildApp({
    db,
    resolveTenant: headerTenantResolver
  });
}

function headers() {
  return {
    "x-organization-id": orgId,
    "x-user-identity-id": userId,
    "content-type": "application/json"
  };
}

describe("Reporting Dashboards HTTP (DS 5.2)", () => {
  it("401 when no tenant headers", async () => {
    const { db } = makeFakeDb();
    const app = buildTestApp(db);
    const res = await app.request("/reporting/dashboards", {
      method: "GET",
      headers: {}
    });
    expect(res.status).toBe(401);
  });

  it("POST /reporting/dashboards → 201", async () => {
    const { db } = makeFakeDb();
    const app = buildTestApp(db);
    const res = await app.request("/reporting/dashboards", {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ name: "My dashboard" })
    });
    expect(res.status).toBe(201);
    const body = await res.json() as Dashboard;
    expect(body.name).toBe("My dashboard");
    expect(body.id).toBeTruthy();
  });

  it("POST /reporting/dashboards → 400 when name missing", async () => {
    const { db } = makeFakeDb();
    const app = buildTestApp(db);
    const res = await app.request("/reporting/dashboards", {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ description: "no name" })
    });
    expect(res.status).toBe(400);
  });

  it("GET /reporting/dashboards → 200 with items", async () => {
    const { db } = makeFakeDb();
    const app = buildTestApp(db);
    // Create one
    await app.request("/reporting/dashboards", {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ name: "D1" })
    });
    const res = await app.request("/reporting/dashboards", {
      method: "GET",
      headers: headers()
    });
    expect(res.status).toBe(200);
    const body = await res.json() as { items: Dashboard[] };
    expect(body.items).toHaveLength(1);
  });

  it("GET /reporting/dashboards/:id → 404 for unknown id", async () => {
    const { db } = makeFakeDb();
    const app = buildTestApp(db);
    const res = await app.request("/reporting/dashboards/nope", {
      method: "GET",
      headers: headers()
    });
    expect(res.status).toBe(404);
  });

  it("DELETE /reporting/dashboards/:id → 204", async () => {
    const { db } = makeFakeDb();
    const app = buildTestApp(db);
    const createRes = await app.request("/reporting/dashboards", {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ name: "Delete me" })
    });
    const created = await createRes.json() as Dashboard;
    const deleteRes = await app.request(`/reporting/dashboards/${created.id}`, {
      method: "DELETE",
      headers: headers()
    });
    expect(deleteRes.status).toBe(204);
  });

  it("DELETE /reporting/dashboards/:id → 404 for unknown id", async () => {
    const { db } = makeFakeDb();
    const app = buildTestApp(db);
    const res = await app.request("/reporting/dashboards/nope", {
      method: "DELETE",
      headers: headers()
    });
    expect(res.status).toBe(404);
  });

  it("POST /reporting/dashboards/:id/widgets → 201", async () => {
    const { db } = makeFakeDb();
    const app = buildTestApp(db);
    const createRes = await app.request("/reporting/dashboards", {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ name: "Dash with widgets" })
    });
    const dash = await createRes.json() as Dashboard;
    const widgetRes = await app.request(`/reporting/dashboards/${dash.id}/widgets`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ reportDefinitionId: "rd_http_1" })
    });
    expect(widgetRes.status).toBe(201);
    const widget = await widgetRes.json() as DashboardWidget;
    expect(widget.dashboardId).toBe(dash.id);
    expect(widget.reportDefinitionId).toBe("rd_http_1");
  });

  it("POST /reporting/dashboards/:id/widgets → 400 for missing reportDefinitionId", async () => {
    const { db } = makeFakeDb();
    const app = buildTestApp(db);
    const createRes = await app.request("/reporting/dashboards", {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ name: "D" })
    });
    const dash = await createRes.json() as Dashboard;
    const res = await app.request(`/reporting/dashboards/${dash.id}/widgets`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ title: "Missing rd" })
    });
    expect(res.status).toBe(400);
  });

  it("POST /reporting/dashboards/:id/widgets → 400 for nonexistent reportDefinitionId", async () => {
    const { db } = makeFakeDb();
    const app = buildTestApp(db);
    const createRes = await app.request("/reporting/dashboards", {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ name: "D" })
    });
    const dash = await createRes.json() as Dashboard;
    const res = await app.request(`/reporting/dashboards/${dash.id}/widgets`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ reportDefinitionId: "rd_nope" })
    });
    expect(res.status).toBe(400);
  });

  it("GET /reporting/dashboards/:id/render → 200 with widgets", async () => {
    const { db } = makeFakeDb();
    const app = buildTestApp(db);
    const createRes = await app.request("/reporting/dashboards", {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ name: "Render me" })
    });
    const dash = await createRes.json() as Dashboard;
    await app.request(`/reporting/dashboards/${dash.id}/widgets`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ reportDefinitionId: "rd_http_1", position: 0 })
    });
    const renderRes = await app.request(`/reporting/dashboards/${dash.id}/render`, {
      method: "GET",
      headers: headers()
    });
    expect(renderRes.status).toBe(200);
    const body = await renderRes.json() as { dashboard: Dashboard; widgets: Array<{ widget: DashboardWidget; columns: unknown[]; rows: unknown[]; rowCount: number }> };
    expect(body.dashboard.id).toBe(dash.id);
    expect(body.widgets).toHaveLength(1);
    expect(body.widgets[0]!.columns.length).toBeGreaterThan(0);
    expect(body.widgets[0]!.rowCount).toBeGreaterThanOrEqual(1);
  });

  it("PATCH /reporting/dashboards/:id → 403 for non-owner on shared dashboard", async () => {
    const { db } = makeFakeDb();
    const app = buildTestApp(db);
    // Create as owner user_http
    const createRes = await app.request("/reporting/dashboards", {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ name: "Shared", isShared: true, ownerUserId: userId })
    });
    const dash = await createRes.json() as Dashboard;
    // Try to update as another user
    const res = await app.request(`/reporting/dashboards/${dash.id}`, {
      method: "PATCH",
      headers: {
        "x-organization-id": orgId,
        "x-user-identity-id": "user_other",
        "content-type": "application/json"
      },
      body: JSON.stringify({ name: "Hacked" })
    });
    expect(res.status).toBe(403);
  });

  it("DELETE /reporting/dashboards/:id/widgets/:widgetId → 204", async () => {
    const { db } = makeFakeDb();
    const app = buildTestApp(db);
    const dashRes = await app.request("/reporting/dashboards", {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ name: "D" })
    });
    const dash = await dashRes.json() as Dashboard;
    const widgetRes = await app.request(`/reporting/dashboards/${dash.id}/widgets`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ reportDefinitionId: "rd_http_1" })
    });
    const widget = await widgetRes.json() as DashboardWidget;
    const delRes = await app.request(`/reporting/dashboards/${dash.id}/widgets/${widget.id}`, {
      method: "DELETE",
      headers: headers()
    });
    expect(delRes.status).toBe(204);
  });
});
