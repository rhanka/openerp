import type { RouteContract } from "./foundation";

// CRM route registry (Demo Slice 2 + 2.1 + 2.5 — Company + Contact +
// PipelineStage + Opportunity).
export function buildCrmRoutes(): RouteContract[] {
  return [
    { method: "GET", path: "/crm/companies", audited: false },
    { method: "POST", path: "/crm/companies", audited: true },
    { method: "GET", path: "/crm/companies/:id", audited: false },
    { method: "PATCH", path: "/crm/companies/:id", audited: true },
    { method: "GET", path: "/crm/contacts", audited: false },
    { method: "POST", path: "/crm/contacts", audited: true },
    { method: "GET", path: "/crm/contacts/:id", audited: false },
    { method: "PATCH", path: "/crm/contacts/:id", audited: true },
    { method: "GET", path: "/crm/pipeline-stages", audited: false },
    { method: "POST", path: "/crm/pipeline-stages", audited: true },
    { method: "GET", path: "/crm/pipeline-stages/:id", audited: false },
    { method: "PATCH", path: "/crm/pipeline-stages/:id", audited: true },
    { method: "GET", path: "/crm/opportunities", audited: false },
    { method: "POST", path: "/crm/opportunities", audited: true },
    { method: "GET", path: "/crm/opportunities/:id", audited: false },
    { method: "PATCH", path: "/crm/opportunities/:id", audited: true },
    { method: "GET", path: "/crm/timeline", audited: false }
  ];
}
