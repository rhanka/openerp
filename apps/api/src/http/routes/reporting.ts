import type { RouteContract } from "./foundation";

// Reporting route registry (DS 5.0 — SavedView; DS 5.1 — ReportDefinition + ReportRun).
export function buildReportingRoutes(): RouteContract[] {
  return [
    // SavedView (DS 5.0)
    {
      method: "GET",
      path: "/reporting/saved-views",
      audited: false,
      responseSchema: "SavedView"
    },
    {
      method: "POST",
      path: "/reporting/saved-views",
      audited: true,
      requestSchema: "CreateSavedViewInput",
      responseSchema: "SavedView"
    },
    {
      method: "GET",
      path: "/reporting/saved-views/:id",
      audited: false,
      responseSchema: "SavedView"
    },
    {
      method: "PATCH",
      path: "/reporting/saved-views/:id",
      audited: true,
      requestSchema: "UpdateSavedViewInput",
      responseSchema: "SavedView"
    },
    {
      method: "DELETE",
      path: "/reporting/saved-views/:id",
      audited: true,
      responseSchema: "SavedView"
    },
    // ReportDefinition + ReportRun (DS 5.1)
    // GET /reporting/report-types — string array, no schema
    { method: "GET", path: "/reporting/report-types", audited: false },
    {
      method: "GET",
      path: "/reporting/report-definitions",
      audited: false,
      responseSchema: "ReportDefinition"
    },
    {
      method: "POST",
      path: "/reporting/report-definitions",
      audited: true,
      requestSchema: "CreateReportDefinitionInput",
      responseSchema: "ReportDefinition"
    },
    {
      method: "GET",
      path: "/reporting/report-definitions/:id",
      audited: false,
      responseSchema: "ReportDefinition"
    },
    {
      method: "PATCH",
      path: "/reporting/report-definitions/:id",
      audited: true,
      requestSchema: "UpdateReportDefinitionInput",
      responseSchema: "ReportDefinition"
    },
    {
      method: "DELETE",
      path: "/reporting/report-definitions/:id",
      audited: true,
      responseSchema: "ReportDefinition"
    },
    {
      method: "POST",
      path: "/reporting/report-definitions/:id/run",
      audited: true,
      responseSchema: "ReportRun"
    },
    {
      method: "GET",
      path: "/reporting/report-runs",
      audited: false,
      responseSchema: "ReportRun"
    },
    {
      method: "GET",
      path: "/reporting/report-runs/:id",
      audited: false,
      responseSchema: "ReportRun"
    },
    // Dashboard + DashboardWidget (DS 5.2)
    {
      method: "GET",
      path: "/reporting/dashboards",
      audited: false,
      responseSchema: "Dashboard"
    },
    {
      method: "POST",
      path: "/reporting/dashboards",
      audited: true,
      requestSchema: "CreateDashboardInput",
      responseSchema: "Dashboard"
    },
    {
      method: "GET",
      path: "/reporting/dashboards/:id",
      audited: false,
      responseSchema: "Dashboard"
    },
    {
      method: "PATCH",
      path: "/reporting/dashboards/:id",
      audited: true,
      requestSchema: "UpdateDashboardInput",
      responseSchema: "Dashboard"
    },
    {
      method: "DELETE",
      path: "/reporting/dashboards/:id",
      audited: true,
      responseSchema: "Dashboard"
    },
    // GET /:id/render — rendered output is variable, no schema
    { method: "GET", path: "/reporting/dashboards/:id/render", audited: false },
    {
      method: "GET",
      path: "/reporting/dashboards/:id/widgets",
      audited: false,
      responseSchema: "DashboardWidget"
    },
    {
      method: "POST",
      path: "/reporting/dashboards/:id/widgets",
      audited: true,
      requestSchema: "CreateDashboardWidgetInput",
      responseSchema: "DashboardWidget"
    },
    {
      method: "PATCH",
      path: "/reporting/dashboards/:id/widgets/:widgetId",
      audited: true,
      requestSchema: "UpdateDashboardWidgetInput",
      responseSchema: "DashboardWidget"
    },
    {
      method: "DELETE",
      path: "/reporting/dashboards/:id/widgets/:widgetId",
      audited: true,
      responseSchema: "DashboardWidget"
    },
    // ScheduledDelivery + DeliveryRun (DS 5.3)
    {
      method: "GET",
      path: "/reporting/scheduled-deliveries",
      audited: false,
      responseSchema: "ScheduledDelivery"
    },
    {
      method: "POST",
      path: "/reporting/scheduled-deliveries",
      audited: true,
      requestSchema: "CreateScheduledDeliveryInput",
      responseSchema: "ScheduledDelivery"
    },
    {
      method: "GET",
      path: "/reporting/scheduled-deliveries/:id",
      audited: false,
      responseSchema: "ScheduledDelivery"
    },
    {
      method: "PATCH",
      path: "/reporting/scheduled-deliveries/:id",
      audited: true,
      requestSchema: "UpdateScheduledDeliveryInput",
      responseSchema: "ScheduledDelivery"
    },
    {
      method: "DELETE",
      path: "/reporting/scheduled-deliveries/:id",
      audited: true,
      responseSchema: "ScheduledDelivery"
    },
    // POST /run — tick trigger, no schema
    { method: "POST", path: "/reporting/scheduled-deliveries/run", audited: true },
    {
      method: "POST",
      path: "/reporting/scheduled-deliveries/:id/run",
      audited: true,
      responseSchema: "DeliveryRun"
    },
    {
      method: "GET",
      path: "/reporting/scheduled-deliveries/:id/runs",
      audited: false,
      responseSchema: "DeliveryRun"
    },
    {
      method: "GET",
      path: "/reporting/delivery-runs/:id",
      audited: false,
      responseSchema: "DeliveryRun"
    }
  ];
}
