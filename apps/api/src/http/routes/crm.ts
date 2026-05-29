import type { RouteContract } from "./foundation";

// CRM route registry (Demo Slice 2 + 2.1 + 2.3 + 2.5 + 2.7 — Company + Contact +
// PipelineStage + Opportunity + Leads + soft-delete + QuoteHandoff).
export function buildCrmRoutes(): RouteContract[] {
  return [
    { method: "GET", path: "/crm/companies", audited: false },
    { method: "POST", path: "/crm/companies", audited: true },
    { method: "GET", path: "/crm/companies/:id", audited: false },
    { method: "PATCH", path: "/crm/companies/:id", audited: true },
    { method: "DELETE", path: "/crm/companies/:id", audited: true },
    { method: "GET", path: "/crm/contacts", audited: false },
    { method: "POST", path: "/crm/contacts", audited: true },
    { method: "GET", path: "/crm/contacts/:id", audited: false },
    { method: "PATCH", path: "/crm/contacts/:id", audited: true },
    { method: "DELETE", path: "/crm/contacts/:id", audited: true },
    { method: "GET", path: "/crm/pipeline-stages", audited: false },
    { method: "POST", path: "/crm/pipeline-stages", audited: true },
    { method: "GET", path: "/crm/pipeline-stages/:id", audited: false },
    { method: "PATCH", path: "/crm/pipeline-stages/:id", audited: true },
    { method: "GET", path: "/crm/opportunities", audited: false },
    { method: "POST", path: "/crm/opportunities", audited: true },
    { method: "GET", path: "/crm/opportunities/:id", audited: false },
    { method: "PATCH", path: "/crm/opportunities/:id", audited: true },
    { method: "DELETE", path: "/crm/opportunities/:id", audited: true },
    { method: "GET", path: "/crm/leads", audited: false },
    { method: "POST", path: "/crm/leads", audited: true },
    { method: "GET", path: "/crm/leads/:id", audited: false },
    { method: "PATCH", path: "/crm/leads/:id", audited: true },
    { method: "DELETE", path: "/crm/leads/:id", audited: true },
    { method: "POST", path: "/crm/leads/:id/convert", audited: true },
    { method: "GET", path: "/crm/timeline", audited: false },
    { method: "GET", path: "/crm/quote-handoffs", audited: false },
    { method: "GET", path: "/crm/quote-handoffs/:id", audited: false },
    { method: "POST", path: "/crm/quote-handoffs/:id/accept", audited: true },
    { method: "POST", path: "/crm/quote-handoffs/:id/reject", audited: true }
  ];
}
