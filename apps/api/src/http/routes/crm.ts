import type { RouteContract } from "./foundation";

// CRM route registry (Demo Slice 2 + 2.1 — Company + Contact).
export function buildCrmRoutes(): RouteContract[] {
  return [
    { method: "GET", path: "/crm/companies", audited: false },
    { method: "POST", path: "/crm/companies", audited: true },
    { method: "GET", path: "/crm/companies/:id", audited: false },
    { method: "PATCH", path: "/crm/companies/:id", audited: true },
    { method: "GET", path: "/crm/contacts", audited: false },
    { method: "POST", path: "/crm/contacts", audited: true },
    { method: "GET", path: "/crm/contacts/:id", audited: false },
    { method: "PATCH", path: "/crm/contacts/:id", audited: true }
  ];
}
