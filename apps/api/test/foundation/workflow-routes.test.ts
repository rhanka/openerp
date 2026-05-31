import { describe, expect, it } from "vitest";
import { buildWorkflowRoutes } from "../../src/http/routes/workflow";

describe("workflow route registry (DS 5.4)", () => {
  it("registers workflow CRUD + run + runs + catalog endpoints", () => {
    const paths = buildWorkflowRoutes().map((r) => `${r.method} ${r.path}`);
    expect(paths).toContain("GET /workflows/catalog");
    expect(paths).toContain("GET /workflows");
    expect(paths).toContain("POST /workflows");
    expect(paths).toContain("GET /workflows/:id");
    expect(paths).toContain("PATCH /workflows/:id");
    expect(paths).toContain("DELETE /workflows/:id");
    expect(paths).toContain("POST /workflows/:id/run");
    expect(paths).toContain("GET /workflows/:id/runs");
  });

  it("flags mutating endpoints as audited", () => {
    const routes = buildWorkflowRoutes();
    expect(routes.find((r) => r.path === "/workflows" && r.method === "POST")?.audited).toBe(true);
    expect(routes.find((r) => r.path === "/workflows/:id" && r.method === "PATCH")?.audited).toBe(true);
    expect(routes.find((r) => r.path === "/workflows/:id" && r.method === "DELETE")?.audited).toBe(true);
    expect(routes.find((r) => r.path === "/workflows/:id/run" && r.method === "POST")?.audited).toBe(true);
  });

  it("flags GET endpoints as not audited", () => {
    const routes = buildWorkflowRoutes();
    expect(routes.find((r) => r.path === "/workflows/catalog" && r.method === "GET")?.audited).toBe(false);
    expect(routes.find((r) => r.path === "/workflows" && r.method === "GET")?.audited).toBe(false);
    expect(routes.find((r) => r.path === "/workflows/:id" && r.method === "GET")?.audited).toBe(false);
    expect(routes.find((r) => r.path === "/workflows/:id/runs" && r.method === "GET")?.audited).toBe(false);
  });
});
