import { Hono } from "hono";
import { describe, expect, it } from "vitest";

import type { AppBindings } from "../../src/http/app";
import type { Queryable, TenantContext } from "../../src/db/client";
import {
  type EffectivePermissionResolver,
  requirePermission
} from "../../src/http/rbac-middleware";

function makeMockApp(
  resolver: EffectivePermissionResolver,
  required = { resource: "audit.event", action: "read", scope: "organization" } as const
) {
  const app = new Hono<AppBindings>();
  const fakeDb: Queryable = { async query() { return { rows: [] }; } };
  const tenant: TenantContext = { organizationId: "org_1", actorUserId: "user_1" };
  app.use("*", async (c, next) => {
    c.set("db", fakeDb);
    c.set("tenant", tenant);
    await next();
  });
  app.get("/audit-events", requirePermission(required, resolver), (c) => c.json({ ok: true }));
  return app;
}

describe("RBAC requirePermission middleware (Lot 2)", () => {
  it("denies by default when the actor has no grants", async () => {
    const app = makeMockApp(async () => []);
    const res = await app.request("/audit-events");
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body).toMatchObject({ code: "FORBIDDEN", reason: "DENY_BY_DEFAULT" });
  });

  it("allows when a matching grant is present", async () => {
    const app = makeMockApp(async () => [
      { resource: "audit.event", action: "read", scope: "organization" }
    ]);
    const res = await app.request("/audit-events");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it("denies when no grant matches the required triple", async () => {
    const app = makeMockApp(async () => [
      { resource: "audit.event", action: "read", scope: "own" }
    ]);
    const res = await app.request("/audit-events");
    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({
      code: "FORBIDDEN",
      reason: "PERMISSION_MISSING"
    });
  });

  it("denies when the grant action is for a different resource", async () => {
    const app = makeMockApp(async () => [
      { resource: "comment.thread", action: "read", scope: "organization" }
    ]);
    const res = await app.request("/audit-events");
    expect(res.status).toBe(403);
  });
});
