import { describe, expect, it } from "vitest";

import type { Company } from "@sentropic/openerp-domain/crm";

import type { Queryable } from "../../src/db/client";
import { buildApp, headerTenantResolver } from "../../src/http/app";

function makeFakeDb() {
  const companies: Company[] = [];

  const db: Queryable = {
    async query<T = unknown>(text: string, values: unknown[] = []): Promise<{ rows: T[] }> {
      const t = text;

      if (t.includes("insert into companies")) {
        const [
          organizationId,
          displayName,
          legalName,
          ownerUserId,
          teamId,
          website,
          phone,
          email,
          language,
          taxRegion,
          billingAddress,
          shippingAddress
        ] = values as [
          string,
          string,
          string | null,
          string | null,
          string | null,
          string | null,
          string | null,
          string | null,
          "en" | "fr" | null,
          string | null,
          unknown,
          unknown
        ];
        const row: Company = {
          id: `co_${companies.length + 1}`,
          organizationId,
          displayName,
          legalName,
          status: "active",
          ownerUserId,
          teamId,
          website,
          phone,
          email,
          language,
          taxRegion,
          billingAddress: billingAddress as Company["billingAddress"],
          shippingAddress: shippingAddress as Company["shippingAddress"],
          createdAt: "2026-05-23T08:00:00.000Z",
          updatedAt: "2026-05-23T08:00:00.000Z"
        };
        companies.push(row);
        return { rows: [row as unknown as T] };
      }

      if (t.includes("from companies") && t.includes("where id = $1")) {
        const [id, organizationId] = values as [string, string];
        const found = companies.find((c) => c.id === id && c.organizationId === organizationId);
        return { rows: found ? [found as unknown as T] : [] };
      }

      if (t.includes("from companies") && t.includes("order by display_name")) {
        const [organizationId, status, limit, offset] = values as [
          string,
          string | null,
          number,
          number
        ];
        const filtered = companies
          .filter((c) => c.organizationId === organizationId)
          .filter((c) => (status ? c.status === status : true))
          .sort((a, b) => a.displayName.localeCompare(b.displayName))
          .slice(offset, offset + limit);
        return { rows: filtered as unknown as T[] };
      }

      if (t.includes("update companies")) {
        const [id, organizationId] = values as [string, string];
        const idx = companies.findIndex((c) => c.id === id && c.organizationId === organizationId);
        if (idx === -1) return { rows: [] };
        // The repo emits dynamic SQL; trailing values map onto the patched
        // columns in declaration order. We only exercise displayName and
        // status here, which is enough for the HTTP surface tests.
        const trailing = values.slice(2);
        if (t.includes("display_name = $")) {
          companies[idx] = {
            ...companies[idx]!,
            displayName: String(trailing[0]),
            updatedAt: "2026-05-23T08:05:00.000Z"
          };
          trailing.shift();
        }
        if (t.includes("status = $")) {
          const statusValue = trailing.find((v) => v === "active" || v === "archived");
          if (statusValue !== undefined) {
            companies[idx] = {
              ...companies[idx]!,
              status: statusValue as "active" | "archived",
              updatedAt: "2026-05-23T08:05:00.000Z"
            };
          }
        }
        return { rows: [companies[idx]! as unknown as T] };
      }

      return { rows: [] };
    }
  };
  return { db, companies };
}

const tenantHeaders = {
  "x-organization-id": "00000000-0000-0000-0000-000000000001",
  "x-user-identity-id": "00000000-0000-0000-0000-000000000aaa"
} as const;

describe("CRM /crm/companies HTTP surface", () => {
  it("POST /crm/companies creates and returns 201 + body", async () => {
    const { db } = makeFakeDb();
    const app = buildApp({ db, resolveTenant: headerTenantResolver });
    const res = await app.request("/crm/companies", {
      method: "POST",
      headers: { "content-type": "application/json", ...tenantHeaders },
      body: JSON.stringify({ displayName: "Northwind" })
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toMatchObject({ displayName: "Northwind", status: "active" });
    expect(body.id).toBeDefined();
  });

  it("POST /crm/companies rejects missing displayName with 400 INVALID_INPUT", async () => {
    const { db } = makeFakeDb();
    const app = buildApp({ db, resolveTenant: headerTenantResolver });
    const res = await app.request("/crm/companies", {
      method: "POST",
      headers: { "content-type": "application/json", ...tenantHeaders },
      body: JSON.stringify({ legalName: "Acme Inc." })
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe("INVALID_INPUT");
    expect(body.errors.displayName).toBe("REQUIRED");
  });

  it("GET /crm/companies returns { items: [] } when no records", async () => {
    const { db } = makeFakeDb();
    const app = buildApp({ db, resolveTenant: headerTenantResolver });
    const res = await app.request("/crm/companies", {
      headers: tenantHeaders
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ items: [] });
  });

  it("GET /crm/companies returns sorted list and PATCH updates record", async () => {
    const { db } = makeFakeDb();
    const app = buildApp({ db, resolveTenant: headerTenantResolver });

    const create = (name: string) =>
      app.request("/crm/companies", {
        method: "POST",
        headers: { "content-type": "application/json", ...tenantHeaders },
        body: JSON.stringify({ displayName: name })
      });

    await create("Bravo");
    const created = (await (await create("Alpha")).json()) as Company;

    const list = await app.request("/crm/companies", { headers: tenantHeaders });
    expect((await list.json()).items.map((c: Company) => c.displayName)).toEqual([
      "Alpha",
      "Bravo"
    ]);

    const patch = await app.request(`/crm/companies/${created.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json", ...tenantHeaders },
      body: JSON.stringify({ status: "archived" })
    });
    expect(patch.status).toBe(200);
    expect((await patch.json()).status).toBe("archived");
  });

  it("PATCH /crm/companies/:id returns 404 when company is missing", async () => {
    const { db } = makeFakeDb();
    const app = buildApp({ db, resolveTenant: headerTenantResolver });
    const res = await app.request("/crm/companies/co_missing", {
      method: "PATCH",
      headers: { "content-type": "application/json", ...tenantHeaders },
      body: JSON.stringify({ displayName: "x" })
    });
    expect(res.status).toBe(404);
  });

  it("PATCH /crm/companies/:id rejects invalid status with 400", async () => {
    const { db } = makeFakeDb();
    const app = buildApp({ db, resolveTenant: headerTenantResolver });
    const res = await app.request("/crm/companies/co_x", {
      method: "PATCH",
      headers: { "content-type": "application/json", ...tenantHeaders },
      body: JSON.stringify({ status: "deleted" })
    });
    expect(res.status).toBe(400);
    expect((await res.json()).errors.status).toBe("INVALID");
  });

  it("rejects requests without a tenant context (401)", async () => {
    const { db } = makeFakeDb();
    const app = buildApp({ db, resolveTenant: headerTenantResolver });
    const res = await app.request("/crm/companies", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ displayName: "X" })
    });
    expect(res.status).toBe(401);
  });
});
