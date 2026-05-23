import type { RouteContract } from "./foundation";

// CRM route registry (Demo Slice 2 — Company only).
export function buildCrmRoutes(): RouteContract[] {
  return [
    { method: "GET", path: "/crm/companies", audited: false },
    { method: "POST", path: "/crm/companies", audited: true },
    { method: "GET", path: "/crm/companies/:id", audited: false },
    { method: "PATCH", path: "/crm/companies/:id", audited: true }
  ];
}
