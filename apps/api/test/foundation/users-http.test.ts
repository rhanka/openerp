import { describe, expect, it } from "vitest";

import type { Queryable, TenantContext } from "../../src/db/client";
import { buildApp, headerTenantResolver } from "../../src/http/app";
import type { TenantUserSummary } from "../../src/foundation/user-identities";

function makeFakeDb(seed: TenantUserSummary[] = []) {
  const db: Queryable = {
    async query<T = unknown>(text: string, _values: unknown[] = []): Promise<{ rows: T[] }> {
      if (text.includes("from users") && text.includes("organization_id = $1")) {
        return { rows: seed as unknown as T[] };
      }
      // Passthrough for idempotency / other middleware checks
      return { rows: [] };
    }
  };
  return { db };
}

const DEMO_USERS: TenantUserSummary[] = [
  { id: "uid-1", email: "alice@demo.local", displayName: "Alice Tremblay", status: "active" },
  { id: "uid-2", email: "bob@demo.local", displayName: "Bob Martin", status: "invited" }
];

describe("GET /users (tenant users list)", () => {
  it("returns an items array for the tenant", async () => {
    const { db } = makeFakeDb(DEMO_USERS);
    const app = buildApp({
      resolveTenant: headerTenantResolver,
      db
    });

    const req = new Request("http://localhost/users", {
      headers: {
        "x-organization-id": "org-123",
        "x-user-identity-id": "uid-1"
      }
    });
    const res = await app.request(req.url, req);
    expect(res.status).toBe(200);
    const body = await res.json() as { items: TenantUserSummary[] };
    expect(body.items).toHaveLength(2);
    expect(body.items[0]!.email).toBe("alice@demo.local");
    expect(body.items[1]!.displayName).toBe("Bob Martin");
  });

  it("returns 401 without tenant headers", async () => {
    const { db } = makeFakeDb(DEMO_USERS);
    const app = buildApp({
      resolveTenant: headerTenantResolver,
      db
    });
    const req = new Request("http://localhost/users");
    const res = await app.request(req.url, req);
    expect(res.status).toBe(401);
  });

  it("returns empty items when no users exist", async () => {
    const { db } = makeFakeDb([]);
    const app = buildApp({
      resolveTenant: headerTenantResolver,
      db
    });
    const req = new Request("http://localhost/users", {
      headers: {
        "x-organization-id": "org-empty",
        "x-user-identity-id": "uid-sys"
      }
    });
    const res = await app.request(req.url, req);
    expect(res.status).toBe(200);
    const body = await res.json() as { items: TenantUserSummary[] };
    expect(body.items).toHaveLength(0);
  });
});
