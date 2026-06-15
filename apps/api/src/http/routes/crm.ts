import type { RouteContract } from "./foundation";

// CRM route registry (Demo Slice 2 + 2.1 + 2.3 + 2.5 + 2.7 — Company + Contact +
// PipelineStage + Opportunity + Leads + soft-delete + QuoteHandoff).
export function buildCrmRoutes(): RouteContract[] {
  return [
    // ── Companies ────────────────────────────────────────────────────────────
    { method: "GET", path: "/crm/companies", audited: false, responseSchema: "Company" },
    {
      method: "POST",
      path: "/crm/companies",
      audited: true,
      requestSchema: "CreateCompanyInput",
      responseSchema: "Company"
    },
    { method: "GET", path: "/crm/companies/:id", audited: false, responseSchema: "Company" },
    {
      method: "PATCH",
      path: "/crm/companies/:id",
      audited: true,
      requestSchema: "UpdateCompanyInput",
      responseSchema: "Company"
    },
    { method: "DELETE", path: "/crm/companies/:id", audited: true, responseSchema: "Company" },

    // ── Contacts ─────────────────────────────────────────────────────────────
    { method: "GET", path: "/crm/contacts", audited: false, responseSchema: "Contact" },
    {
      method: "POST",
      path: "/crm/contacts",
      audited: true,
      requestSchema: "CreateContactInput",
      responseSchema: "Contact"
    },
    { method: "GET", path: "/crm/contacts/:id", audited: false, responseSchema: "Contact" },
    {
      method: "PATCH",
      path: "/crm/contacts/:id",
      audited: true,
      requestSchema: "UpdateContactInput",
      responseSchema: "Contact"
    },
    { method: "DELETE", path: "/crm/contacts/:id", audited: true, responseSchema: "Contact" },

    // ── Pipeline stages ──────────────────────────────────────────────────────
    {
      method: "GET",
      path: "/crm/pipeline-stages",
      audited: false,
      responseSchema: "PipelineStage"
    },
    {
      method: "POST",
      path: "/crm/pipeline-stages",
      audited: true,
      requestSchema: "CreatePipelineStageInput",
      responseSchema: "PipelineStage"
    },
    {
      method: "GET",
      path: "/crm/pipeline-stages/:id",
      audited: false,
      responseSchema: "PipelineStage"
    },
    {
      method: "PATCH",
      path: "/crm/pipeline-stages/:id",
      audited: true,
      requestSchema: "UpdatePipelineStageInput",
      responseSchema: "PipelineStage"
    },

    // ── Opportunities ────────────────────────────────────────────────────────
    {
      method: "GET",
      path: "/crm/opportunities",
      audited: false,
      responseSchema: "Opportunity"
    },
    {
      method: "POST",
      path: "/crm/opportunities",
      audited: true,
      requestSchema: "CreateOpportunityInput",
      responseSchema: "Opportunity"
    },
    {
      method: "GET",
      path: "/crm/opportunities/:id",
      audited: false,
      responseSchema: "Opportunity"
    },
    {
      method: "PATCH",
      path: "/crm/opportunities/:id",
      audited: true,
      requestSchema: "UpdateOpportunityInput",
      responseSchema: "Opportunity"
    },
    {
      method: "DELETE",
      path: "/crm/opportunities/:id",
      audited: true,
      responseSchema: "Opportunity"
    },

    // ── Leads ────────────────────────────────────────────────────────────────
    { method: "GET", path: "/crm/leads", audited: false, responseSchema: "Lead" },
    {
      method: "POST",
      path: "/crm/leads",
      audited: true,
      requestSchema: "CreateLeadInput",
      responseSchema: "Lead"
    },
    { method: "GET", path: "/crm/leads/:id", audited: false, responseSchema: "Lead" },
    {
      method: "PATCH",
      path: "/crm/leads/:id",
      audited: true,
      requestSchema: "UpdateLeadInput",
      responseSchema: "Lead"
    },
    { method: "DELETE", path: "/crm/leads/:id", audited: true, responseSchema: "Lead" },
    {
      method: "POST",
      path: "/crm/leads/:id/convert",
      audited: true,
      responseSchema: "ConvertLeadResult"
    },

    // ── Timeline (placeholder — no schema yet) ───────────────────────────────
    { method: "GET", path: "/crm/timeline", audited: false },

    // ── Quote handoffs ───────────────────────────────────────────────────────
    {
      method: "GET",
      path: "/crm/quote-handoffs",
      audited: false,
      responseSchema: "QuoteHandoff"
    },
    {
      method: "GET",
      path: "/crm/quote-handoffs/:id",
      audited: false,
      responseSchema: "QuoteHandoff"
    },
    {
      method: "POST",
      path: "/crm/quote-handoffs/:id/accept",
      audited: true,
      responseSchema: "QuoteHandoff"
    },
    {
      method: "POST",
      path: "/crm/quote-handoffs/:id/reject",
      audited: true,
      responseSchema: "QuoteHandoff"
    }
  ];
}
