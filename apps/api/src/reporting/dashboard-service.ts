import type {
  Dashboard,
  DashboardWidget,
  CreateDashboardInput,
  UpdateDashboardInput,
  CreateDashboardWidgetInput,
  UpdateDashboardWidgetInput,
  ReportColumn
} from "@sentropic/openerp-domain/reporting";

import type { Queryable, TenantContext } from "../db/client";
import { assertTenantContext } from "../db/client";
import { recordAuditEvent } from "../foundation/audit-emit";
import { REPORT_CATALOG } from "./report-registry";
import { findReportDefinitionById } from "./report-definitions";
import {
  insertDashboard,
  findDashboardById,
  listDashboards as listDashboardsRepo,
  updateDashboardRepo,
  softDeleteDashboard,
  insertDashboardWidget,
  findDashboardWidgetById,
  listDashboardWidgets as listDashboardWidgetsRepo,
  updateDashboardWidgetRepo,
  softDeleteDashboardWidget
} from "./dashboards";

// ---------------------------------------------------------------------------
// Error types
// ---------------------------------------------------------------------------

export class DashboardNotFoundError extends Error {
  readonly code = "DASHBOARD_NOT_FOUND";
  constructor(id: string) {
    super(`Dashboard ${id} not found`);
  }
}

export class DashboardWidgetNotFoundError extends Error {
  readonly code = "DASHBOARD_WIDGET_NOT_FOUND";
  constructor(id: string) {
    super(`DashboardWidget ${id} not found`);
  }
}

export class DashboardForbiddenError extends Error {
  readonly code = "FORBIDDEN";
  constructor(message = "Access denied") {
    super(message);
  }
}

export class DashboardWidgetReportDefinitionError extends Error {
  readonly code = "REPORT_DEFINITION_NOT_FOUND";
  constructor(id: string) {
    super(`ReportDefinition ${id} not found or deleted`);
  }
}

// ---------------------------------------------------------------------------
// Dashboard service
// ---------------------------------------------------------------------------

export async function createDashboard(
  db: Queryable,
  context: TenantContext,
  input: CreateDashboardInput
): Promise<Dashboard> {
  assertTenantContext(context);
  const created = await insertDashboard(db, context, input);
  await recordAuditEvent(db, context, {
    action: "reporting.dashboard.created",
    resourceType: "dashboard",
    resourceId: created.id,
    beforeSummary: null,
    afterSummary: {
      name: created.name,
      ownerUserId: created.ownerUserId,
      isShared: created.isShared
    }
  });
  return created;
}

export async function updateDashboard(
  db: Queryable,
  context: TenantContext,
  id: string,
  patch: UpdateDashboardInput
): Promise<Dashboard> {
  assertTenantContext(context);
  const before = await findDashboardById(db, context, id);
  if (!before) throw new DashboardNotFoundError(id);
  enforceDashboardOwnership(before, context);
  const updated = await updateDashboardRepo(db, context, id, patch);
  if (!updated) throw new DashboardNotFoundError(id);
  await recordAuditEvent(db, context, {
    action: "reporting.dashboard.updated",
    resourceType: "dashboard",
    resourceId: updated.id,
    beforeSummary: { name: before.name, isShared: before.isShared },
    afterSummary: { name: updated.name, isShared: updated.isShared }
  });
  return updated;
}

export async function deleteDashboard(
  db: Queryable,
  context: TenantContext,
  id: string
): Promise<void> {
  assertTenantContext(context);
  const before = await findDashboardById(db, context, id);
  if (!before) throw new DashboardNotFoundError(id);
  enforceDashboardOwnership(before, context);
  const deleted = await softDeleteDashboard(db, context, id);
  if (!deleted) throw new DashboardNotFoundError(id);
  await recordAuditEvent(db, context, {
    action: "reporting.dashboard.deleted",
    resourceType: "dashboard",
    resourceId: id,
    beforeSummary: { name: before.name },
    afterSummary: null
  });
}

export async function getDashboardById(
  db: Queryable,
  context: TenantContext,
  id: string
): Promise<Dashboard | null> {
  return findDashboardById(db, context, id);
}

export async function listDashboards(
  db: Queryable,
  context: TenantContext,
  options: {
    limit?: number;
    offset?: number;
    ownerUserId?: string | null;
    isShared?: boolean;
  } = {}
): Promise<Dashboard[]> {
  return listDashboardsRepo(db, context, options);
}

// ---------------------------------------------------------------------------
// DashboardWidget service
// ---------------------------------------------------------------------------

export async function addWidget(
  db: Queryable,
  context: TenantContext,
  dashboardId: string,
  input: CreateDashboardWidgetInput
): Promise<DashboardWidget> {
  assertTenantContext(context);
  const dashboard = await findDashboardById(db, context, dashboardId);
  if (!dashboard) throw new DashboardNotFoundError(dashboardId);
  enforceDashboardOwnership(dashboard, context);
  // Validate the referenced report_definition exists and is not deleted
  const rd = await findReportDefinitionById(db, context, input.reportDefinitionId);
  if (!rd) throw new DashboardWidgetReportDefinitionError(input.reportDefinitionId);
  const created = await insertDashboardWidget(db, context, dashboardId, input);
  await recordAuditEvent(db, context, {
    action: "reporting.dashboard_widget.created",
    resourceType: "dashboard_widget",
    resourceId: created.id,
    beforeSummary: null,
    afterSummary: {
      dashboardId,
      reportDefinitionId: input.reportDefinitionId,
      position: created.position
    }
  });
  return created;
}

export async function updateWidget(
  db: Queryable,
  context: TenantContext,
  dashboardId: string,
  widgetId: string,
  patch: UpdateDashboardWidgetInput
): Promise<DashboardWidget> {
  assertTenantContext(context);
  const dashboard = await findDashboardById(db, context, dashboardId);
  if (!dashboard) throw new DashboardNotFoundError(dashboardId);
  enforceDashboardOwnership(dashboard, context);
  const before = await findDashboardWidgetById(db, context, widgetId);
  if (!before || before.dashboardId !== dashboardId) throw new DashboardWidgetNotFoundError(widgetId);
  const updated = await updateDashboardWidgetRepo(db, context, widgetId, patch);
  if (!updated) throw new DashboardWidgetNotFoundError(widgetId);
  await recordAuditEvent(db, context, {
    action: "reporting.dashboard_widget.updated",
    resourceType: "dashboard_widget",
    resourceId: widgetId,
    beforeSummary: { title: before.title, position: before.position },
    afterSummary: { title: updated.title, position: updated.position }
  });
  return updated;
}

export async function removeWidget(
  db: Queryable,
  context: TenantContext,
  dashboardId: string,
  widgetId: string
): Promise<void> {
  assertTenantContext(context);
  const dashboard = await findDashboardById(db, context, dashboardId);
  if (!dashboard) throw new DashboardNotFoundError(dashboardId);
  enforceDashboardOwnership(dashboard, context);
  const widget = await findDashboardWidgetById(db, context, widgetId);
  if (!widget || widget.dashboardId !== dashboardId) throw new DashboardWidgetNotFoundError(widgetId);
  const deleted = await softDeleteDashboardWidget(db, context, widgetId);
  if (!deleted) throw new DashboardWidgetNotFoundError(widgetId);
  await recordAuditEvent(db, context, {
    action: "reporting.dashboard_widget.deleted",
    resourceType: "dashboard_widget",
    resourceId: widgetId,
    beforeSummary: { dashboardId, reportDefinitionId: widget.reportDefinitionId },
    afterSummary: null
  });
}

export async function listWidgets(
  db: Queryable,
  context: TenantContext,
  dashboardId: string
): Promise<DashboardWidget[]> {
  const dashboard = await findDashboardById(db, context, dashboardId);
  if (!dashboard) throw new DashboardNotFoundError(dashboardId);
  return listDashboardWidgetsRepo(db, context, dashboardId);
}

// ---------------------------------------------------------------------------
// Live render (non-persisting, non-audited — transient read only)
// ---------------------------------------------------------------------------

export interface RenderedWidget {
  widget: DashboardWidget;
  reportType: string;
  columns: ReportColumn[];
  rows: Record<string, unknown>[];
  rowCount: number;
  error?: string;
}

export interface DashboardRenderResult {
  dashboard: Dashboard;
  widgets: RenderedWidget[];
}

export async function renderDashboard(
  db: Queryable,
  context: TenantContext,
  id: string
): Promise<DashboardRenderResult> {
  assertTenantContext(context);
  const dashboard = await findDashboardById(db, context, id);
  if (!dashboard) throw new DashboardNotFoundError(id);

  const widgets = await listDashboardWidgetsRepo(db, context, id);
  const renderedWidgets: RenderedWidget[] = [];

  for (const widget of widgets) {
    const rd = await findReportDefinitionById(db, context, widget.reportDefinitionId);
    if (!rd) {
      renderedWidgets.push({
        widget,
        reportType: "unknown",
        columns: [],
        rows: [],
        rowCount: 0,
        error: `ReportDefinition ${widget.reportDefinitionId} not found`
      });
      continue;
    }
    const entry = REPORT_CATALOG[rd.reportType];
    if (!entry) {
      renderedWidgets.push({
        widget,
        reportType: rd.reportType,
        columns: [],
        rows: [],
        rowCount: 0,
        error: `Unknown report type: ${rd.reportType}`
      });
      continue;
    }
    try {
      const rows = await entry.run(db, context.organizationId, rd.parameters);
      renderedWidgets.push({
        widget,
        reportType: rd.reportType,
        columns: entry.columns,
        rows,
        rowCount: rows.length
      });
    } catch (err) {
      renderedWidgets.push({
        widget,
        reportType: rd.reportType,
        columns: entry.columns,
        rows: [],
        rowCount: 0,
        error: err instanceof Error ? err.message : String(err)
      });
    }
  }

  return { dashboard, widgets: renderedWidgets };
}

// ---------------------------------------------------------------------------
// Ownership enforcement
// A shared Dashboard may only be mutated by its owner.
// ---------------------------------------------------------------------------

function enforceDashboardOwnership(dashboard: Dashboard, context: TenantContext): void {
  if (dashboard.isShared && dashboard.ownerUserId !== null && dashboard.ownerUserId !== context.actorUserId) {
    throw new DashboardForbiddenError(
      `Only the owner of shared Dashboard ${dashboard.id} may modify it`
    );
  }
}
