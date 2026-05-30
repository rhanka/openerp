import type { RouteContract } from "./foundation";

// Reporting route registry (DS 5.0 — SavedView; DS 5.1 — ReportDefinition + ReportRun).
export function buildReportingRoutes(): RouteContract[] {
  return [
    // SavedView (DS 5.0)
    { method: "GET", path: "/reporting/saved-views", audited: false },
    { method: "POST", path: "/reporting/saved-views", audited: true },
    { method: "GET", path: "/reporting/saved-views/:id", audited: false },
    { method: "PATCH", path: "/reporting/saved-views/:id", audited: true },
    { method: "DELETE", path: "/reporting/saved-views/:id", audited: true },
    // ReportDefinition + ReportRun (DS 5.1)
    { method: "GET", path: "/reporting/report-types", audited: false },
    { method: "GET", path: "/reporting/report-definitions", audited: false },
    { method: "POST", path: "/reporting/report-definitions", audited: true },
    { method: "GET", path: "/reporting/report-definitions/:id", audited: false },
    { method: "PATCH", path: "/reporting/report-definitions/:id", audited: true },
    { method: "DELETE", path: "/reporting/report-definitions/:id", audited: true },
    { method: "POST", path: "/reporting/report-definitions/:id/run", audited: true },
    { method: "GET", path: "/reporting/report-runs", audited: false },
    { method: "GET", path: "/reporting/report-runs/:id", audited: false }
  ];
}
