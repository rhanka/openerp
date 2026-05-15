import { describe, expect, it } from "vitest";
import { buildApprovalRequestRoutes } from "../../src/http/routes/approval-requests";

describe("Approval request route contract (PG-07, Lot 4)", () => {
  const routes = buildApprovalRequestRoutes();

  it("declares the four MVP endpoints", () => {
    expect(routes.map((r) => `${r.method} ${r.path}`)).toEqual([
      "POST /approval-requests",
      "GET /approval-requests",
      "GET /approval-requests/:id",
      "PATCH /approval-requests/:id/decide"
    ]);
  });

  it("marks mutating endpoints as audited and idempotency-required", () => {
    const post = routes.find((r) => r.method === "POST")!;
    const decide = routes.find((r) => r.path.endsWith("/decide"))!;
    expect(post.audited).toBe(true);
    expect(post.requiresIdempotency).toBe(true);
    expect(decide.audited).toBe(true);
    expect(decide.requiresIdempotency).toBe(true);
  });

  it("leaves read endpoints non-audited and idempotency-free", () => {
    const readEndpoints = routes.filter((r) => r.method === "GET");
    for (const r of readEndpoints) {
      expect(r.audited).toBe(false);
      expect(r.requiresIdempotency).toBeFalsy();
    }
  });
});
