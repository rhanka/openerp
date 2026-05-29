import type { RouteContract } from "./foundation";

// Reporting route registry (Demo Slice 5.0 — SavedView entity, Article 4.5).
export function buildReportingRoutes(): RouteContract[] {
  return [
    { method: "GET", path: "/reporting/saved-views", audited: false },
    { method: "POST", path: "/reporting/saved-views", audited: true },
    { method: "GET", path: "/reporting/saved-views/:id", audited: false },
    { method: "PATCH", path: "/reporting/saved-views/:id", audited: true },
    { method: "DELETE", path: "/reporting/saved-views/:id", audited: true }
  ];
}
