import { describe, expect, it } from "vitest";
import { buildProjectRoutes } from "../../src/http/routes/project";

describe("project route registry (DS 3.0)", () => {
  it("registers project CRUD + timeline endpoints", () => {
    expect(buildProjectRoutes().map((r) => `${r.method} ${r.path}`)).toEqual([
      "GET /project/projects",
      "POST /project/projects",
      "GET /project/projects/:id",
      "PATCH /project/projects/:id",
      "DELETE /project/projects/:id",
      "GET /project/timeline"
    ]);
  });

  it("flags mutating endpoints as audited", () => {
    const routes = buildProjectRoutes();
    expect(routes.find((r) => r.path === "/project/projects" && r.method === "POST")?.audited).toBe(true);
    expect(routes.find((r) => r.path === "/project/projects/:id" && r.method === "PATCH")?.audited).toBe(true);
    expect(routes.find((r) => r.path === "/project/projects/:id" && r.method === "DELETE")?.audited).toBe(true);
    expect(routes.find((r) => r.path === "/project/projects" && r.method === "GET")?.audited).toBe(false);
    expect(routes.find((r) => r.path === "/project/timeline" && r.method === "GET")?.audited).toBe(false);
  });
});
