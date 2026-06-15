import type { RouteContract } from "./foundation";

// Workflow route registry (DS 5.4 — WorkflowDefinition + WorkflowRun).
export function buildWorkflowRoutes(): RouteContract[] {
  return [
    // Catalog (must be before /:id routes to avoid ambiguity) — catalog format may evolve
    { method: "GET", path: "/workflows/catalog", audited: false },
    // WorkflowDefinition CRUD
    {
      method: "GET",
      path: "/workflows",
      audited: false,
      responseSchema: "WorkflowDefinition"
    },
    {
      method: "POST",
      path: "/workflows",
      audited: true,
      requestSchema: "CreateWorkflowDefinitionInput",
      responseSchema: "WorkflowDefinition"
    },
    {
      method: "GET",
      path: "/workflows/:id",
      audited: false,
      responseSchema: "WorkflowDefinition"
    },
    {
      method: "PATCH",
      path: "/workflows/:id",
      audited: true,
      requestSchema: "UpdateWorkflowDefinitionInput",
      responseSchema: "WorkflowDefinition"
    },
    {
      method: "DELETE",
      path: "/workflows/:id",
      audited: true,
      responseSchema: "WorkflowDefinition"
    },
    // Manual run + run history
    {
      method: "POST",
      path: "/workflows/:id/run",
      audited: true,
      responseSchema: "WorkflowRun"
    },
    {
      method: "GET",
      path: "/workflows/:id/runs",
      audited: false,
      responseSchema: "WorkflowRun"
    }
  ];
}
