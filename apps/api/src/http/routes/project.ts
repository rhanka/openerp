import type { RouteContract } from "./foundation";

// Project route registry (Demo Slice 3.0 — delivery module open).
// Extended in DS 3.1 with ProjectTask CRUD.
// Extended in DS 3.2 with TimeEntry CRUD.
// Extended in DS 3.3 with Rate + Assignment CRUD.
// Extended in DS 3.4 with InvoiceProposal (generate + lifecycle).
// Extended in DS 3.5 with TimeEntry submit/approve/reject via ApprovalRequest (PG-07).
export function buildProjectRoutes(): RouteContract[] {
  return [
    {
      method: "GET",
      path: "/project/projects",
      audited: false,
      responseSchema: "Project"
    },
    {
      method: "POST",
      path: "/project/projects",
      audited: true,
      requestSchema: "CreateProjectInput",
      responseSchema: "Project"
    },
    {
      method: "GET",
      path: "/project/projects/:id",
      audited: false,
      responseSchema: "Project"
    },
    {
      method: "PATCH",
      path: "/project/projects/:id",
      audited: true,
      requestSchema: "UpdateProjectInput",
      responseSchema: "Project"
    },
    { method: "DELETE", path: "/project/projects/:id", audited: true },
    { method: "GET", path: "/project/timeline", audited: false, responseSchema: "TimelineEntry" },
    {
      method: "GET",
      path: "/project/tasks",
      audited: false,
      responseSchema: "ProjectTask"
    },
    {
      method: "POST",
      path: "/project/tasks",
      audited: true,
      requestSchema: "CreateProjectTaskInput",
      responseSchema: "ProjectTask"
    },
    {
      method: "GET",
      path: "/project/tasks/:id",
      audited: false,
      responseSchema: "ProjectTask"
    },
    {
      method: "PATCH",
      path: "/project/tasks/:id",
      audited: true,
      requestSchema: "UpdateProjectTaskInput",
      responseSchema: "ProjectTask"
    },
    { method: "DELETE", path: "/project/tasks/:id", audited: true },
    {
      method: "GET",
      path: "/project/time-entries",
      audited: false,
      responseSchema: "TimeEntry"
    },
    {
      method: "POST",
      path: "/project/time-entries",
      audited: true,
      requestSchema: "CreateTimeEntryInput",
      responseSchema: "TimeEntry"
    },
    {
      method: "GET",
      path: "/project/time-entries/:id",
      audited: false,
      responseSchema: "TimeEntry"
    },
    {
      method: "PATCH",
      path: "/project/time-entries/:id",
      audited: true,
      requestSchema: "UpdateTimeEntryInput",
      responseSchema: "TimeEntry"
    },
    { method: "DELETE", path: "/project/time-entries/:id", audited: true },
    {
      method: "POST",
      path: "/project/time-entries/:id/submit",
      audited: true,
      responseSchema: "TimeEntry"
    },
    {
      method: "POST",
      path: "/project/time-entries/:id/approve",
      audited: true,
      responseSchema: "TimeEntry"
    },
    {
      method: "POST",
      path: "/project/time-entries/:id/reject",
      audited: true,
      responseSchema: "TimeEntry"
    },
    {
      method: "GET",
      path: "/project/rates",
      audited: false,
      responseSchema: "Rate"
    },
    {
      method: "POST",
      path: "/project/rates",
      audited: true,
      requestSchema: "CreateRateInput",
      responseSchema: "Rate"
    },
    {
      method: "GET",
      path: "/project/rates/:id",
      audited: false,
      responseSchema: "Rate"
    },
    {
      method: "PATCH",
      path: "/project/rates/:id",
      audited: true,
      requestSchema: "UpdateRateInput",
      responseSchema: "Rate"
    },
    { method: "DELETE", path: "/project/rates/:id", audited: true },
    {
      method: "GET",
      path: "/project/assignments",
      audited: false,
      responseSchema: "Assignment"
    },
    {
      method: "POST",
      path: "/project/assignments",
      audited: true,
      requestSchema: "CreateAssignmentInput",
      responseSchema: "Assignment"
    },
    {
      method: "GET",
      path: "/project/assignments/:id",
      audited: false,
      responseSchema: "Assignment"
    },
    {
      method: "PATCH",
      path: "/project/assignments/:id",
      audited: true,
      requestSchema: "UpdateAssignmentInput",
      responseSchema: "Assignment"
    },
    { method: "DELETE", path: "/project/assignments/:id", audited: true },
    {
      method: "GET",
      path: "/project/invoice-proposals",
      audited: false,
      responseSchema: "InvoiceProposal"
    },
    {
      method: "POST",
      path: "/project/invoice-proposals/generate",
      audited: true,
      requestSchema: "CreateInvoiceProposalInput",
      responseSchema: "InvoiceProposalWithLines"
    },
    {
      method: "GET",
      path: "/project/invoice-proposals/:id",
      audited: false,
      responseSchema: "InvoiceProposalWithLines"
    },
    {
      method: "POST",
      path: "/project/invoice-proposals/:id/submit",
      audited: true,
      responseSchema: "InvoiceProposal"
    },
    {
      method: "POST",
      path: "/project/invoice-proposals/:id/approve",
      audited: true,
      responseSchema: "InvoiceProposal"
    },
    {
      method: "POST",
      path: "/project/invoice-proposals/:id/reject",
      audited: true,
      responseSchema: "InvoiceProposal"
    },
    { method: "DELETE", path: "/project/invoice-proposals/:id", audited: true }
  ];
}
