import { describe, expect, it } from "vitest";

import type { Queryable } from "../../src/db/client";
import { buildApp, headerTenantResolver } from "../../src/http/app";

interface AuditRow {
  id: string;
  organizationId: string;
  actorUserId: string | null;
  actorType: "user" | "system" | "operator";
  action: string;
  resourceType: string;
  resourceId: string;
  beforeSummary: Record<string, unknown> | null;
  afterSummary: Record<string, unknown> | null;
  ipHash: string | null;
  userAgentHash: string | null;
  createdAt: string;
}

function makeDb(rows: AuditRow[]) {
  const db: Queryable = {
    async query<T = unknown>(text: string, values: unknown[] = []): Promise<{ rows: T[] }> {
      if (!text.includes("from audit_events")) return { rows: [] };
      const organizationId = values[0] as string;
      let filtered = rows.filter((r) => r.organizationId === organizationId);
      // The repository pushes filters in a fixed order — match by scanning
      // the placeholders in the SQL.
      let nextValue = 1;
      const consume = () => values[nextValue++];
      if (text.includes("action = $")) {
        const v = consume() as string;
        filtered = filtered.filter((r) => r.action === v);
      }
      if (text.includes("resource_type = $")) {
        const v = consume() as string;
        filtered = filtered.filter((r) => r.resourceType === v);
      }
      if (text.includes("actor_user_id = $")) {
        const v = consume() as string;
        filtered = filtered.filter((r) => r.actorUserId === v);
      }
      if (text.includes("created_at >= $")) {
        const v = consume() as string;
        filtered = filtered.filter((r) => r.createdAt >= v);
      }
      if (text.includes("created_at <= $")) {
        const v = consume() as string;
        filtered = filtered.filter((r) => r.createdAt <= v);
      }
      filtered = filtered.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
      const limit = values[values.length - 1] as number;
      return { rows: filtered.slice(0, limit) as unknown as T[] };
    }
  };
  return db;
}

function makeRow(overrides: Partial<AuditRow>): AuditRow {
  return {
    id: `audit_${Math.random().toString(36).slice(2, 8)}`,
    organizationId: "org_1",
    actorUserId: "uid_alice",
    actorType: "user",
    action: "approval_request.created",
    resourceType: "approval_request",
    resourceId: "ar_1",
    beforeSummary: null,
    afterSummary: null,
    ipHash: null,
    userAgentHash: null,
    createdAt: "2026-05-15T10:00:00.000Z",
    ...overrides
  };
}

const tenantHeaders = {
  "x-organization-id": "org_1",
  "x-user-identity-id": "uid_caller"
};

describe("GET /audit-events", () => {
  it("requires a tenant context", async () => {
    const app = buildApp({ db: makeDb([]), resolveTenant: headerTenantResolver });
    const res = await app.request("/audit-events");
    expect(res.status).toBe(401);
  });

  it("returns the tenant's audit events sorted newest-first", async () => {
    const db = makeDb([
      makeRow({ id: "a", createdAt: "2026-05-15T09:00:00.000Z" }),
      makeRow({ id: "b", createdAt: "2026-05-15T10:30:00.000Z" }),
      makeRow({ id: "c", createdAt: "2026-05-15T10:15:00.000Z" }),
      makeRow({ id: "other", organizationId: "org_2", createdAt: "2026-05-15T11:00:00.000Z" })
    ]);
    const app = buildApp({ db, resolveTenant: headerTenantResolver });
    const res = await app.request("/audit-events", { headers: tenantHeaders });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { count: number; data: AuditRow[] };
    expect(body.data.map((r) => r.id)).toEqual(["b", "c", "a"]);
    expect(body.count).toBe(3);
  });

  it("respects the limit query parameter", async () => {
    const db = makeDb([
      makeRow({ id: "a", createdAt: "2026-05-15T09:00:00.000Z" }),
      makeRow({ id: "b", createdAt: "2026-05-15T10:00:00.000Z" })
    ]);
    const app = buildApp({ db, resolveTenant: headerTenantResolver });
    const res = await app.request("/audit-events?limit=1", { headers: tenantHeaders });
    const body = (await res.json()) as { data: AuditRow[] };
    expect(body.data).toHaveLength(1);
    expect(body.data[0]?.id).toBe("b");
  });

  it("rejects an invalid limit", async () => {
    const app = buildApp({ db: makeDb([]), resolveTenant: headerTenantResolver });
    const res = await app.request("/audit-events?limit=abc", { headers: tenantHeaders });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { code: string; errors: { limit: string } };
    expect(body.errors.limit).toBe("INVALID_LIMIT");
  });

  it("filters by action verb", async () => {
    const db = makeDb([
      makeRow({ id: "a", action: "approval_request.created" }),
      makeRow({ id: "b", action: "approval_request.decided" }),
      makeRow({ id: "c", action: "approval_request.created" })
    ]);
    const app = buildApp({ db, resolveTenant: headerTenantResolver });
    const res = await app.request(
      "/audit-events?action=approval_request.decided",
      { headers: tenantHeaders }
    );
    const body = (await res.json()) as { data: AuditRow[] };
    expect(body.data.map((r) => r.id)).toEqual(["b"]);
  });

  it("rejects an invalid fromCreatedAt", async () => {
    const app = buildApp({ db: makeDb([]), resolveTenant: headerTenantResolver });
    const res = await app.request(
      "/audit-events?fromCreatedAt=garbage",
      { headers: tenantHeaders }
    );
    expect(res.status).toBe(400);
  });
});
