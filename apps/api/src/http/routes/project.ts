import type { RouteContract } from "./foundation";

// Project route registry (Demo Slice 3.0 — delivery module open).
// Extended in DS 3.1 with ProjectTask CRUD.
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
    { method: "DELETE", path: "/project/tasks/:id", audited: true }
  ];
}
