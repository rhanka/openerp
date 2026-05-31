import type { RouteContract } from "./foundation";

// Workflow route registry (DS 5.4 — WorkflowDefinition + WorkflowRun).
export function buildWorkflowRoutes(): RouteContract[] {
  return [
    // Catalog (must be before /:id routes to avoid ambiguity)
    { method: "GET", path: "/workflows/catalog", audited: false },
    // WorkflowDefinition CRUD
    { method: "GET", path: "/workflows", audited: false },
    { method: "POST", path: "/workflows", audited: true },
    { method: "GET", path: "/workflows/:id", audited: false },
    { method: "PATCH", path: "/workflows/:id", audited: true },
    { method: "DELETE", path: "/workflows/:id", audited: true },
    // Manual run + run history
    { method: "POST", path: "/workflows/:id/run", audited: true },
    { method: "GET", path: "/workflows/:id/runs", audited: false }
  ];
}
