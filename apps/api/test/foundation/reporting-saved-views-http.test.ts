import { describe, expect, it } from "vitest";

import type { SavedView } from "@sentropic/openerp-domain/reporting";
import type { Queryable } from "../../src/db/client";
import { buildApp, headerTenantResolver } from "../../src/http/app";

function makeFakeDb() {
  const views: SavedView[] = [];

  const db: Queryable = {
    async query<T = unknown>(text: string, values: unknown[] = []): Promise<{ rows: T[] }> {
      const t = text;

      if (t.includes("insert into saved_views")) {
        const [
          organizationId,
          ownerUserId,
          resourceType,
          name,
          filters,
          columns,
          sortBy,
          isShared
        ] = values as [string, string | null, string, string, string, string, string | null, boolean];
        const row: SavedView = {
          id: `sv_${views.length + 1}`,
          organizationId,
          ownerUserId,
          resourceType,
          name,
          filters: JSON.parse(filters as string) as Record<string, unknown>,
          columns: JSON.parse(columns as string) as string[],
          sortBy,
          isShared,
          createdAt: "2026-05-29T08:00:00.000Z",
          updatedAt: "2026-05-29T08:00:00.000Z"
        };
        views.push(row);
        return { rows: [row as unknown as T] };
      }

      if (t.includes("from saved_views") && t.includes("where id = $1")) {
        const [id, organizationId] = values as [string, string];
        const found = views.find(
          (v) =>
            v.id === id &&
            v.organizationId === organizationId &&
            !(v as unknown as { _deleted?: boolean })._deleted
        );
        return { rows: found ? [found as unknown as T] : [] };
      }

      if (t.includes("from saved_views") && t.includes("order by name")) {
        const [organizationId, filterResourceType, , , limit, offset] = values as [
          string,
          string | null,
          string | null,
          boolean | null,
          number,
          number
        ];
        const filtered = views
          .filter((v) => v.organizationId === organizationId)
          .filter((v) => !(v as unknown as { _deleted?: boolean })._deleted)
          .filter((v) => (filterResourceType ? v.resourceType === filterResourceType : true))
          .sort((a, b) => a.name.localeCompare(b.name))
          .slice(offset, offset + limit);
        return { rows: filtered as unknown as T[] };
      }

      if (t.includes("update saved_views") && t.includes("deleted_at = now()")) {
        const [id, organizationId] = values as [string, string];
        const idx = views.findIndex(
          (v) =>
            v.id === id &&
            v.organizationId === organizationId &&
            !(v as unknown as { _deleted?: boolean })._deleted
        );
        if (idx === -1) return { rows: [] };
        (views[idx] as unknown as { _deleted: boolean })._deleted = true;
        return { rows: [{ id: views[idx]!.id } as unknown as T] };
      }

      if (t.includes("update saved_views")) {
        const [id, organizationId] = values as [string, string];
        const idx = views.findIndex(
          (v) =>
            v.id === id &&
            v.organizationId === organizationId &&
            !(v as unknown as { _deleted?: boolean })._deleted
        );
        if (idx === -1) return { rows: [] };
        const trailing = values.slice(2);
        const patch: Partial<SavedView> = {};
        if (t.includes("name = $")) {
          const candidate = trailing.find((v) => typeof v === "string" && !v.startsWith("{") && !v.startsWith("["));
          if (candidate) patch.name = candidate as string;
        }
        views[idx] = { ...views[idx]!, ...patch, updatedAt: "2026-05-29T08:05:00.000Z" };
        return { rows: [views[idx]! as unknown as T] };
      }

      if (t.includes("insert into audit_events")) {
        return { rows: [] };
      }

      return { rows: [] };
    }
  };
  return { db, views };
}

const tenantHeaders = {
  "x-organization-id": "00000000-0000-0000-0000-000000000001",
  "x-user-identity-id": "00000000-0000-0000-0000-000000000aaa"
} as const;

describe("Reporting /reporting/saved-views HTTP surface (DS 5.0)", () => {
  it("POST /reporting/saved-views creates and returns 201 + body", async () => {
    const { db } = makeFakeDb();
    const app = buildApp({ db, resolveTenant: headerTenantResolver });
    const res = await app.request("/reporting/saved-views", {
      method: "POST",
      headers: { "content-type": "application/json", ...tenantHeaders },
      body: JSON.stringify({ resourceType: "crm.opportunity", name: "Open opportunities" })
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toMatchObject({ name: "Open opportunities", resourceType: "crm.opportunity" });
    expect(body.id).toBeDefined();
  });

  it("POST /reporting/saved-views rejects missing name with 400 INVALID_INPUT", async () => {
    const { db } = makeFakeDb();
    const app = buildApp({ db, resolveTenant: headerTenantResolver });
    const res = await app.request("/reporting/saved-views", {
      method: "POST",
      headers: { "content-type": "application/json", ...tenantHeaders },
      body: JSON.stringify({ resourceType: "crm.opportunity" })
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe("INVALID_INPUT");
    expect(body.errors.name).toBe("REQUIRED");
  });

  it("POST /reporting/saved-views rejects missing resourceType with 400 INVALID_INPUT", async () => {
    const { db } = makeFakeDb();
    const app = buildApp({ db, resolveTenant: headerTenantResolver });
    const res = await app.request("/reporting/saved-views", {
      method: "POST",
      headers: { "content-type": "application/json", ...tenantHeaders },
      body: JSON.stringify({ name: "My view" })
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe("INVALID_INPUT");
    expect(body.errors.resourceType).toBe("REQUIRED");
  });

  it("GET /reporting/saved-views returns { items: [] } when no records", async () => {
    const { db } = makeFakeDb();
    const app = buildApp({ db, resolveTenant: headerTenantResolver });
    const res = await app.request("/reporting/saved-views", {
      headers: tenantHeaders
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ items: [] });
  });

  it("GET /reporting/saved-views filters by resourceType query param", async () => {
    const { db } = makeFakeDb();
    const app = buildApp({ db, resolveTenant: headerTenantResolver });

    await app.request("/reporting/saved-views", {
      method: "POST",
      headers: { "content-type": "application/json", ...tenantHeaders },
      body: JSON.stringify({ resourceType: "crm.opportunity", name: "Opportunities view" })
    });
    await app.request("/reporting/saved-views", {
      method: "POST",
      headers: { "content-type": "application/json", ...tenantHeaders },
      body: JSON.stringify({ resourceType: "billing.invoice", name: "Invoices view" })
    });

    const res = await app.request("/reporting/saved-views?resourceType=crm.opportunity", {
      headers: tenantHeaders
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items).toHaveLength(1);
    expect(body.items[0].resourceType).toBe("crm.opportunity");
  });

  it("GET /reporting/saved-views/:id returns 404 when not found", async () => {
    const { db } = makeFakeDb();
    const app = buildApp({ db, resolveTenant: headerTenantResolver });
    const res = await app.request("/reporting/saved-views/sv_missing", {
      headers: tenantHeaders
    });
    expect(res.status).toBe(404);
  });

  it("PATCH /reporting/saved-views/:id returns 404 when not found", async () => {
    const { db } = makeFakeDb();
    const app = buildApp({ db, resolveTenant: headerTenantResolver });
    const res = await app.request("/reporting/saved-views/sv_missing", {
      method: "PATCH",
      headers: { "content-type": "application/json", ...tenantHeaders },
      body: JSON.stringify({ name: "x" })
    });
    expect(res.status).toBe(404);
  });

  it("DELETE /reporting/saved-views/:id returns 204 after soft-delete", async () => {
    const { db } = makeFakeDb();
    const app = buildApp({ db, resolveTenant: headerTenantResolver });

    const created = await (
      await app.request("/reporting/saved-views", {
        method: "POST",
        headers: { "content-type": "application/json", ...tenantHeaders },
        body: JSON.stringify({ resourceType: "crm.opportunity", name: "ToDelete" })
      })
    ).json() as SavedView;

    const del = await app.request(`/reporting/saved-views/${created.id}`, {
      method: "DELETE",
      headers: tenantHeaders
    });
    expect(del.status).toBe(204);
  });

  it("DELETE /reporting/saved-views/:id returns 404 when not found", async () => {
    const { db } = makeFakeDb();
    const app = buildApp({ db, resolveTenant: headerTenantResolver });
    const res = await app.request("/reporting/saved-views/sv_missing", {
      method: "DELETE",
      headers: tenantHeaders
    });
    expect(res.status).toBe(404);
  });

  it("rejects requests without tenant context (401)", async () => {
    const { db } = makeFakeDb();
    const app = buildApp({ db, resolveTenant: headerTenantResolver });
    const res = await app.request("/reporting/saved-views", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ resourceType: "crm.opportunity", name: "X" })
    });
    expect(res.status).toBe(401);
  });
});
