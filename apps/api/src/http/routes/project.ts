import type { RouteContract } from "./foundation";

// Project route registry (Demo Slice 3.0 — delivery module open).
// Extended in DS 3.1 with ProjectTask CRUD.
// Extended in DS 3.2 with TimeEntry CRUD.
// Extended in DS 3.3 with Rate + Assignment CRUD.
// Extended in DS 3.4 with InvoiceProposal (generate + lifecycle).
// Extended in DS 3.5 with TimeEntry submit/approve/reject via ApprovalRequest (PG-07).
export function buildProjectRoutes(): RouteContract[] {
  return [
    { method: "GET", path: "/project/projects", audited: false },
    { method: "POST", path: "/project/projects", audited: true },
    { method: "GET", path: "/project/projects/:id", audited: false },
    { method: "PATCH", path: "/project/projects/:id", audited: true },
    { method: "DELETE", path: "/project/projects/:id", audited: true },
    { method: "GET", path: "/project/timeline", audited: false },
    { method: "GET", path: "/project/tasks", audited: false },
    { method: "POST", path: "/project/tasks", audited: true },
    { method: "GET", path: "/project/tasks/:id", audited: false },
    { method: "PATCH", path: "/project/tasks/:id", audited: true },
    { method: "DELETE", path: "/project/tasks/:id", audited: true },
    { method: "GET", path: "/project/time-entries", audited: false },
    { method: "POST", path: "/project/time-entries", audited: true },
    { method: "GET", path: "/project/time-entries/:id", audited: false },
    { method: "PATCH", path: "/project/time-entries/:id", audited: true },
    { method: "DELETE", path: "/project/time-entries/:id", audited: true },
    { method: "POST", path: "/project/time-entries/:id/submit", audited: true },
    { method: "POST", path: "/project/time-entries/:id/approve", audited: true },
    { method: "POST", path: "/project/time-entries/:id/reject", audited: true },
    { method: "GET", path: "/project/rates", audited: false },
    { method: "POST", path: "/project/rates", audited: true },
    { method: "GET", path: "/project/rates/:id", audited: false },
    { method: "PATCH", path: "/project/rates/:id", audited: true },
    { method: "DELETE", path: "/project/rates/:id", audited: true },
    { method: "GET", path: "/project/assignments", audited: false },
    { method: "POST", path: "/project/assignments", audited: true },
    { method: "GET", path: "/project/assignments/:id", audited: false },
    { method: "PATCH", path: "/project/assignments/:id", audited: true },
    { method: "DELETE", path: "/project/assignments/:id", audited: true },
    { method: "GET", path: "/project/invoice-proposals", audited: false },
    { method: "POST", path: "/project/invoice-proposals/generate", audited: true },
    { method: "GET", path: "/project/invoice-proposals/:id", audited: false },
    { method: "POST", path: "/project/invoice-proposals/:id/submit", audited: true },
    { method: "POST", path: "/project/invoice-proposals/:id/approve", audited: true },
    { method: "POST", path: "/project/invoice-proposals/:id/reject", audited: true },
    { method: "DELETE", path: "/project/invoice-proposals/:id", audited: true }
  ];
}
