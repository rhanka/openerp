import { describe, expect, it } from "vitest";

import type { Dashboard, DashboardWidget, ReportDefinition } from "@sentropic/openerp-domain/reporting";
import type { Queryable } from "../../src/db/client";
import {
  DashboardForbiddenError,
  DashboardNotFoundError,
  DashboardWidgetNotFoundError,
  DashboardWidgetReportDefinitionError,
  addWidget,
  createDashboard,
  deleteDashboard,
  listDashboards,
  removeWidget,
  renderDashboard,
  updateDashboard,
  updateWidget
} from "../../src/reporting/dashboard-service";

interface AuditRow {
  organizationId: string;
  actorUserId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  beforeSummary: unknown;
  afterSummary: unknown;
}

function makeFakeDb(opts: { widgetRunThrows?: boolean; missingRd?: boolean } = {}) {
  const dashboards: Dashboard[] = [];
  const widgets: DashboardWidget[] = [];
  const defs: ReportDefinition[] = [];
  const audits: AuditRow[] = [];
  let pipelineRows: Record<string, unknown>[] = [
    { stage: "Discovery", open_count: "2", pipeline_value_minor: "10000" }
  ];

  // Seed a default report definition so addWidget works by default
  const defaultRd: ReportDefinition = {
    id: "rd_default",
    organizationId: "org_1",
    ownerUserId: null,
    reportType: "crm.pipeline_funnel",
    name: "Default funnel",
    parameters: {},
    isShared: false,
    createdAt: "2026-05-29T08:00:00.000Z",
    updatedAt: "2026-05-29T08:00:00.000Z"
  };
  if (!opts.missingRd) {
    defs.push(defaultRd);
  }

  const db: Queryable = {
    async query<T = unknown>(text: string, values: unknown[] = []): Promise<{ rows: T[] }> {
      const t = text;

      // ------------------------------------------------------------------
      // dashboards insert
      // ------------------------------------------------------------------
      if (t.includes("insert into dashboards")) {
        const [orgId, ownerUserId, name, description, isShared] = values as [
          string, string | null, string, string | null, boolean
        ];
        const row: Dashboard = {
          id: `dash_${dashboards.length + 1}`,
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

      // ------------------------------------------------------------------
      // dashboards findById
      // ------------------------------------------------------------------
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

      // ------------------------------------------------------------------
      // dashboards list
      // ------------------------------------------------------------------
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

      // ------------------------------------------------------------------
      // dashboards soft-delete
      // ------------------------------------------------------------------
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

      // ------------------------------------------------------------------
      // dashboards update patch
      // ------------------------------------------------------------------
      if (t.includes("update dashboards")) {
        const [id, organizationId] = values as [string, string];
        const idx = dashboards.findIndex(
          (d) =>
            d.id === id &&
            d.organizationId === organizationId &&
            !(d as unknown as { _deleted?: boolean })._deleted
        );
        if (idx === -1) return { rows: [] };
        const trailing = values.slice(2);
        const patch: Partial<Dashboard> = {};
        if (t.includes("name = $")) {
          const candidate = trailing.find((v) => typeof v === "string" && v.length > 0);
          if (candidate) patch.name = candidate as string;
        }
        if (t.includes("is_shared = $")) {
          const candidate = trailing.find((v) => typeof v === "boolean");
          if (candidate !== undefined) patch.isShared = candidate as boolean;
        }
        dashboards[idx] = { ...dashboards[idx]!, ...patch, updatedAt: "2026-05-29T08:05:00.000Z" };
        return { rows: [dashboards[idx]! as unknown as T] };
      }

      // ------------------------------------------------------------------
      // report_definitions findById (for widget validation)
      // ------------------------------------------------------------------
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

      // ------------------------------------------------------------------
      // dashboard_widgets insert
      // ------------------------------------------------------------------
      if (t.includes("insert into dashboard_widgets")) {
        const [orgId, dashboardId, reportDefinitionId, title, position] = values as [
          string, string, string, string | null, number
        ];
        const row: DashboardWidget = {
          id: `widget_${widgets.length + 1}`,
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

      // ------------------------------------------------------------------
      // dashboard_widgets findById
      // ------------------------------------------------------------------
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

      // ------------------------------------------------------------------
      // dashboard_widgets list by dashboard
      // ------------------------------------------------------------------
      if (t.includes("from dashboard_widgets") && t.includes("order by position")) {
        const [organizationId, dashboardId] = values as [string, string];
        const filtered = widgets
          .filter((w) => w.organizationId === organizationId && w.dashboardId === dashboardId)
          .filter((w) => !(w as unknown as { _deleted?: boolean })._deleted)
          .sort((a, b) => a.position - b.position);
        return { rows: filtered as unknown as T[] };
      }

      // ------------------------------------------------------------------
      // dashboard_widgets soft-delete
      // ------------------------------------------------------------------
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

      // ------------------------------------------------------------------
      // dashboard_widgets update patch
      // ------------------------------------------------------------------
      if (t.includes("update dashboard_widgets")) {
        const [id, organizationId] = values as [string, string];
        const idx = widgets.findIndex(
          (w) =>
            w.id === id &&
            w.organizationId === organizationId &&
            !(w as unknown as { _deleted?: boolean })._deleted
        );
        if (idx === -1) return { rows: [] };
        const trailing = values.slice(2);
        const patch: Partial<DashboardWidget> = {};
        if (t.includes("position = $")) {
          const candidate = trailing.find((v) => typeof v === "number");
          if (candidate !== undefined) patch.position = candidate as number;
        }
        widgets[idx] = { ...widgets[idx]!, ...patch, updatedAt: "2026-05-29T08:05:00.000Z" };
        return { rows: [widgets[idx]! as unknown as T] };
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

      // ------------------------------------------------------------------
      // crm.pipeline_funnel query (used by renderDashboard)
      // ------------------------------------------------------------------
      if (t.includes("from pipeline_stages")) {
        if (opts.widgetRunThrows) throw new Error("DB query failed");
        return { rows: pipelineRows as unknown as T[] };
      }

      return { rows: [] };
    }
  };

  return {
    db,
    dashboards,
    widgets,
    audits,
    defs,
    setPipelineRows: (rows: Record<string, unknown>[]) => { pipelineRows = rows; }
  };
}

const context = { organizationId: "org_1", actorUserId: "user_actor" };
const contextB = { organizationId: "org_1", actorUserId: "user_other" };

describe("DashboardService (DS 5.2)", () => {
  it("creates a dashboard and emits reporting.dashboard.created", async () => {
    const { db, audits } = makeFakeDb();
    const created = await createDashboard(db, context, {
      name: "My dashboard",
      isShared: false
    });
    expect(created.name).toBe("My dashboard");
    expect(created.isShared).toBe(false);
    expect(audits).toHaveLength(1);
    expect(audits[0]!.action).toBe("reporting.dashboard.created");
    expect(audits[0]!.resourceId).toBe(created.id);
    expect(audits[0]!.afterSummary).toMatchObject({ name: "My dashboard" });
  });

  it("updates a dashboard and emits reporting.dashboard.updated with before/after", async () => {
    const { db, audits } = makeFakeDb();
    const created = await createDashboard(db, context, {
      name: "Original",
      isShared: false
    });
    const updated = await updateDashboard(db, context, created.id, { isShared: true });
    const updateAudit = audits.find((a) => a.action === "reporting.dashboard.updated");
    expect(updateAudit).toBeDefined();
    expect(updateAudit!.beforeSummary).toMatchObject({ name: "Original" });
    void updated;
  });

  it("throws DashboardNotFoundError on update of missing id", async () => {
    const { db } = makeFakeDb();
    await expect(
      updateDashboard(db, context, "dash_nope", { name: "X" })
    ).rejects.toBeInstanceOf(DashboardNotFoundError);
  });

  it("soft-deletes and emits reporting.dashboard.deleted", async () => {
    const { db, audits } = makeFakeDb();
    const created = await createDashboard(db, context, { name: "ToDelete" });
    await deleteDashboard(db, context, created.id);
    const deleteAudit = audits.find((a) => a.action === "reporting.dashboard.deleted");
    expect(deleteAudit).toBeDefined();
    expect(deleteAudit!.resourceId).toBe(created.id);
    expect(deleteAudit!.beforeSummary).toMatchObject({ name: "ToDelete" });
    const list = await listDashboards(db, context);
    expect(list.find((d) => d.id === created.id)).toBeUndefined();
  });

  it("ownership enforcement: shared dashboard non-owner update throws DashboardForbiddenError", async () => {
    const { db } = makeFakeDb();
    const created = await createDashboard(db, context, {
      name: "Shared dash",
      isShared: true,
      ownerUserId: "user_actor"
    });
    await expect(
      updateDashboard(db, contextB, created.id, { name: "Hacked" })
    ).rejects.toBeInstanceOf(DashboardForbiddenError);
  });

  it("ownership enforcement: shared dashboard non-owner delete throws DashboardForbiddenError", async () => {
    const { db } = makeFakeDb();
    const created = await createDashboard(db, context, {
      name: "Shared dash",
      isShared: true,
      ownerUserId: "user_actor"
    });
    await expect(
      deleteDashboard(db, contextB, created.id)
    ).rejects.toBeInstanceOf(DashboardForbiddenError);
  });
});

describe("DashboardWidgetService (DS 5.2)", () => {
  it("addWidget creates a widget and emits reporting.dashboard_widget.created", async () => {
    const { db, audits } = makeFakeDb();
    const dash = await createDashboard(db, context, { name: "D1" });
    const widget = await addWidget(db, context, dash.id, {
      reportDefinitionId: "rd_default",
      position: 0
    });
    expect(widget.dashboardId).toBe(dash.id);
    expect(widget.reportDefinitionId).toBe("rd_default");
    const createAudit = audits.find((a) => a.action === "reporting.dashboard_widget.created");
    expect(createAudit).toBeDefined();
    expect(createAudit!.resourceId).toBe(widget.id);
  });

  it("addWidget throws DashboardWidgetReportDefinitionError when reportDefinition missing", async () => {
    const { db } = makeFakeDb({ missingRd: true });
    const dash = await createDashboard(db, context, { name: "D1" });
    await expect(
      addWidget(db, context, dash.id, { reportDefinitionId: "rd_missing" })
    ).rejects.toBeInstanceOf(DashboardWidgetReportDefinitionError);
  });

  it("ownership enforcement: shared dashboard non-owner cannot addWidget", async () => {
    const { db } = makeFakeDb();
    const dash = await createDashboard(db, context, {
      name: "Shared",
      isShared: true,
      ownerUserId: "user_actor"
    });
    await expect(
      addWidget(db, contextB, dash.id, { reportDefinitionId: "rd_default" })
    ).rejects.toBeInstanceOf(DashboardForbiddenError);
  });

  it("updateWidget emits reporting.dashboard_widget.updated", async () => {
    const { db, audits } = makeFakeDb();
    const dash = await createDashboard(db, context, { name: "D1" });
    const widget = await addWidget(db, context, dash.id, {
      reportDefinitionId: "rd_default",
      position: 0
    });
    await updateWidget(db, context, dash.id, widget.id, { position: 5 });
    const updateAudit = audits.find((a) => a.action === "reporting.dashboard_widget.updated");
    expect(updateAudit).toBeDefined();
    expect(updateAudit!.beforeSummary).toMatchObject({ position: 0 });
  });

  it("removeWidget soft-deletes and emits reporting.dashboard_widget.deleted", async () => {
    const { db, audits } = makeFakeDb();
    const dash = await createDashboard(db, context, { name: "D1" });
    const widget = await addWidget(db, context, dash.id, {
      reportDefinitionId: "rd_default",
      position: 0
    });
    await removeWidget(db, context, dash.id, widget.id);
    const deleteAudit = audits.find((a) => a.action === "reporting.dashboard_widget.deleted");
    expect(deleteAudit).toBeDefined();
    expect(deleteAudit!.resourceId).toBe(widget.id);
  });

  it("removeWidget throws DashboardWidgetNotFoundError for missing widget", async () => {
    const { db } = makeFakeDb();
    const dash = await createDashboard(db, context, { name: "D1" });
    await expect(
      removeWidget(db, context, dash.id, "widget_nope")
    ).rejects.toBeInstanceOf(DashboardWidgetNotFoundError);
  });
});

describe("renderDashboard (DS 5.2)", () => {
  it("renders dashboard with widgets in position order without persisting a run or emitting audit", async () => {
    const { db, audits } = makeFakeDb();
    // Create dashboard + 2 widgets in reverse order
    const dash = await createDashboard(db, context, { name: "Render test" });
    const w1 = await addWidget(db, context, dash.id, {
      reportDefinitionId: "rd_default",
      position: 1
    });
    const w2 = await addWidget(db, context, dash.id, {
      reportDefinitionId: "rd_default",
      position: 0
    });

    const auditCountBefore = audits.length;
    const result = await renderDashboard(db, context, dash.id);

    // No new audit events from render
    expect(audits.length).toBe(auditCountBefore);
    expect(result.dashboard.id).toBe(dash.id);
    expect(result.widgets).toHaveLength(2);
    // Ordered by position asc
    expect(result.widgets[0]!.widget.id).toBe(w2.id);
    expect(result.widgets[1]!.widget.id).toBe(w1.id);
    // Each widget has columns + rows
    expect(result.widgets[0]!.columns.length).toBeGreaterThan(0);
    expect(result.widgets[0]!.rowCount).toBeGreaterThanOrEqual(1);
    expect(result.widgets[0]!.rows.length).toBeGreaterThanOrEqual(1);
  });

  it("captures per-widget error without throwing for the whole render", async () => {
    const { db } = makeFakeDb({ widgetRunThrows: true });
    const dash = await createDashboard(db, context, { name: "Broken widget" });
    await addWidget(db, context, dash.id, {
      reportDefinitionId: "rd_default",
      position: 0
    });
    const result = await renderDashboard(db, context, dash.id);
    expect(result.widgets).toHaveLength(1);
    expect(result.widgets[0]!.error).toBeTruthy();
    expect(result.widgets[0]!.rowCount).toBe(0);
  });

  it("throws DashboardNotFoundError for missing dashboard", async () => {
    const { db } = makeFakeDb();
    await expect(
      renderDashboard(db, context, "dash_nope")
    ).rejects.toBeInstanceOf(DashboardNotFoundError);
  });
});
