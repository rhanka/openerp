import { describe, expect, it } from "vitest";
import { buildProjectRoutes } from "../../src/http/routes/project";

describe("project route registry (DS 3.0 + DS 3.1 + DS 3.2 + DS 3.3 + DS 3.4 + DS 3.5)", () => {
  it("registers project CRUD + timeline + task + time-entry + rate + assignment + invoice-proposal endpoints", () => {
    expect(buildProjectRoutes().map((r) => `${r.method} ${r.path}`)).toEqual([
      "GET /project/projects",
      "POST /project/projects",
      "GET /project/projects/:id",
      "PATCH /project/projects/:id",
      "DELETE /project/projects/:id",
      "GET /project/timeline",
      "GET /project/tasks",
      "POST /project/tasks",
      "GET /project/tasks/:id",
      "PATCH /project/tasks/:id",
      "DELETE /project/tasks/:id",
      "GET /project/time-entries",
      "POST /project/time-entries",
      "GET /project/time-entries/:id",
      "PATCH /project/time-entries/:id",
      "DELETE /project/time-entries/:id",
      "POST /project/time-entries/:id/submit",
      "POST /project/time-entries/:id/approve",
      "POST /project/time-entries/:id/reject",
      "GET /project/rates",
      "POST /project/rates",
      "GET /project/rates/:id",
      "PATCH /project/rates/:id",
      "DELETE /project/rates/:id",
      "GET /project/assignments",
      "POST /project/assignments",
      "GET /project/assignments/:id",
      "PATCH /project/assignments/:id",
      "DELETE /project/assignments/:id",
      "GET /project/invoice-proposals",
      "POST /project/invoice-proposals/generate",
      "GET /project/invoice-proposals/:id",
      "POST /project/invoice-proposals/:id/submit",
      "POST /project/invoice-proposals/:id/approve",
      "POST /project/invoice-proposals/:id/reject",
      "DELETE /project/invoice-proposals/:id"
    ]);
  });

  it("flags mutating endpoints as audited", () => {
    const routes = buildProjectRoutes();
    expect(routes.find((r) => r.path === "/project/projects" && r.method === "POST")?.audited).toBe(true);
    expect(routes.find((r) => r.path === "/project/projects/:id" && r.method === "PATCH")?.audited).toBe(true);
    expect(routes.find((r) => r.path === "/project/projects/:id" && r.method === "DELETE")?.audited).toBe(true);
    expect(routes.find((r) => r.path === "/project/projects" && r.method === "GET")?.audited).toBe(false);
    expect(routes.find((r) => r.path === "/project/timeline" && r.method === "GET")?.audited).toBe(false);
    // Task routes
    expect(routes.find((r) => r.path === "/project/tasks" && r.method === "POST")?.audited).toBe(true);
    expect(routes.find((r) => r.path === "/project/tasks/:id" && r.method === "PATCH")?.audited).toBe(true);
    expect(routes.find((r) => r.path === "/project/tasks/:id" && r.method === "DELETE")?.audited).toBe(true);
    expect(routes.find((r) => r.path === "/project/tasks" && r.method === "GET")?.audited).toBe(false);
    expect(routes.find((r) => r.path === "/project/tasks/:id" && r.method === "GET")?.audited).toBe(false);
    // Time-entry routes (DS 3.2 + DS 3.5)
    expect(routes.find((r) => r.path === "/project/time-entries" && r.method === "POST")?.audited).toBe(true);
    expect(routes.find((r) => r.path === "/project/time-entries/:id" && r.method === "PATCH")?.audited).toBe(true);
    expect(routes.find((r) => r.path === "/project/time-entries/:id" && r.method === "DELETE")?.audited).toBe(true);
    expect(routes.find((r) => r.path === "/project/time-entries" && r.method === "GET")?.audited).toBe(false);
    expect(routes.find((r) => r.path === "/project/time-entries/:id" && r.method === "GET")?.audited).toBe(false);
    expect(routes.find((r) => r.path === "/project/time-entries/:id/submit" && r.method === "POST")?.audited).toBe(true);
    expect(routes.find((r) => r.path === "/project/time-entries/:id/approve" && r.method === "POST")?.audited).toBe(true);
    expect(routes.find((r) => r.path === "/project/time-entries/:id/reject" && r.method === "POST")?.audited).toBe(true);
    // Rate routes (DS 3.3)
    expect(routes.find((r) => r.path === "/project/rates" && r.method === "POST")?.audited).toBe(true);
    expect(routes.find((r) => r.path === "/project/rates/:id" && r.method === "PATCH")?.audited).toBe(true);
    expect(routes.find((r) => r.path === "/project/rates/:id" && r.method === "DELETE")?.audited).toBe(true);
    expect(routes.find((r) => r.path === "/project/rates" && r.method === "GET")?.audited).toBe(false);
    expect(routes.find((r) => r.path === "/project/rates/:id" && r.method === "GET")?.audited).toBe(false);
    // Assignment routes (DS 3.3)
    expect(routes.find((r) => r.path === "/project/assignments" && r.method === "POST")?.audited).toBe(true);
    expect(routes.find((r) => r.path === "/project/assignments/:id" && r.method === "PATCH")?.audited).toBe(true);
    expect(routes.find((r) => r.path === "/project/assignments/:id" && r.method === "DELETE")?.audited).toBe(true);
    expect(routes.find((r) => r.path === "/project/assignments" && r.method === "GET")?.audited).toBe(false);
    expect(routes.find((r) => r.path === "/project/assignments/:id" && r.method === "GET")?.audited).toBe(false);
    // InvoiceProposal routes (DS 3.4)
    expect(routes.find((r) => r.path === "/project/invoice-proposals/generate" && r.method === "POST")?.audited).toBe(true);
    expect(routes.find((r) => r.path === "/project/invoice-proposals/:id/submit" && r.method === "POST")?.audited).toBe(true);
    expect(routes.find((r) => r.path === "/project/invoice-proposals/:id/approve" && r.method === "POST")?.audited).toBe(true);
    expect(routes.find((r) => r.path === "/project/invoice-proposals/:id/reject" && r.method === "POST")?.audited).toBe(true);
    expect(routes.find((r) => r.path === "/project/invoice-proposals/:id" && r.method === "DELETE")?.audited).toBe(true);
    expect(routes.find((r) => r.path === "/project/invoice-proposals" && r.method === "GET")?.audited).toBe(false);
    expect(routes.find((r) => r.path === "/project/invoice-proposals/:id" && r.method === "GET")?.audited).toBe(false);
  });
});
