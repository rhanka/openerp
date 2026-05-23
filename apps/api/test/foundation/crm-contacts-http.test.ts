import { describe, expect, it } from "vitest";

import type { Contact } from "@sentropic/openerp-domain/crm";

import type { Queryable } from "../../src/db/client";
import { buildApp, headerTenantResolver } from "../../src/http/app";

function makeFakeDb() {
  const contacts: Contact[] = [];

  const db: Queryable = {
    async query<T = unknown>(text: string, values: unknown[] = []): Promise<{ rows: T[] }> {
      const t = text;

      if (t.includes("insert into contacts")) {
        const [
          organizationId,
          companyId,
          displayName,
          firstName,
          lastName,
          title,
          email,
          phone,
          language,
          ownerUserId
        ] = values as [
          string,
          string | null,
          string,
          string | null,
          string | null,
          string | null,
          string | null,
          string | null,
          "en" | "fr" | null,
          string | null
        ];
        const row: Contact = {
          id: `ct_${contacts.length + 1}`,
          organizationId,
          companyId,
          displayName,
          firstName,
          lastName,
          title,
          email,
          phone,
          language,
          status: "active",
          ownerUserId,
          createdAt: "2026-05-23T08:00:00.000Z",
          updatedAt: "2026-05-23T08:00:00.000Z"
        };
        contacts.push(row);
        return { rows: [row as unknown as T] };
      }

      if (t.includes("from contacts") && t.includes("where id = $1")) {
        const [id, organizationId] = values as [string, string];
        const found = contacts.find((c) => c.id === id && c.organizationId === organizationId);
        return { rows: found ? [found as unknown as T] : [] };
      }

      if (t.includes("from contacts") && t.includes("order by display_name")) {
        const [organizationId, status, companyIdFilter, limit, offset] = values as [
          string,
          string | null,
          string | null,
          number,
          number
        ];
        const filtered = contacts
          .filter((c) => c.organizationId === organizationId)
          .filter((c) => (status ? c.status === status : true))
          .filter((c) => (companyIdFilter ? c.companyId === companyIdFilter : true))
          .sort((a, b) => a.displayName.localeCompare(b.displayName))
          .slice(offset, offset + limit);
        return { rows: filtered as unknown as T[] };
      }

      if (t.includes("update contacts")) {
        const [id, organizationId] = values as [string, string];
        const idx = contacts.findIndex((c) => c.id === id && c.organizationId === organizationId);
        if (idx === -1) return { rows: [] };
        const trailing = values.slice(2);
        if (t.includes("display_name = $")) {
          contacts[idx] = {
            ...contacts[idx]!,
            displayName: String(trailing[0]),
            updatedAt: "2026-05-23T08:05:00.000Z"
          };
          trailing.shift();
        }
        if (t.includes("status = $")) {
          const statusValue = trailing.find((v) => v === "active" || v === "inactive");
          if (statusValue !== undefined) {
            contacts[idx] = {
              ...contacts[idx]!,
              status: statusValue as Contact["status"],
              updatedAt: "2026-05-23T08:05:00.000Z"
            };
          }
        }
        return { rows: [contacts[idx]! as unknown as T] };
      }

      return { rows: [] };
    }
  };
  return { db, contacts };
}

const tenantHeaders = {
  "x-organization-id": "00000000-0000-0000-0000-000000000001",
  "x-user-identity-id": "00000000-0000-0000-0000-000000000aaa"
} as const;

describe("CRM /crm/contacts HTTP surface", () => {
  it("POST /crm/contacts creates and returns 201", async () => {
    const { db } = makeFakeDb();
    const app = buildApp({ db, resolveTenant: headerTenantResolver });
    const res = await app.request("/crm/contacts", {
      method: "POST",
      headers: { "content-type": "application/json", ...tenantHeaders },
      body: JSON.stringify({ displayName: "Alice", email: "a@b.com" })
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toMatchObject({ displayName: "Alice", status: "active" });
  });

  it("POST /crm/contacts rejects missing displayName with 400", async () => {
    const { db } = makeFakeDb();
    const app = buildApp({ db, resolveTenant: headerTenantResolver });
    const res = await app.request("/crm/contacts", {
      method: "POST",
      headers: { "content-type": "application/json", ...tenantHeaders },
      body: JSON.stringify({ email: "x@y.z" })
    });
    expect(res.status).toBe(400);
    expect((await res.json()).errors.displayName).toBe("REQUIRED");
  });

  it("GET /crm/contacts filters by companyId", async () => {
    const { db } = makeFakeDb();
    const app = buildApp({ db, resolveTenant: headerTenantResolver });
    const create = (name: string, companyId: string | null) =>
      app.request("/crm/contacts", {
        method: "POST",
        headers: { "content-type": "application/json", ...tenantHeaders },
        body: JSON.stringify({ displayName: name, companyId })
      });
    await create("Alpha", "co_1");
    await create("Bravo", "co_2");

    const scoped = await app.request("/crm/contacts?companyId=co_1", { headers: tenantHeaders });
    expect((await scoped.json()).items.map((c: Contact) => c.displayName)).toEqual(["Alpha"]);
  });

  it("PATCH /crm/contacts/:id flips status and returns updated body", async () => {
    const { db } = makeFakeDb();
    const app = buildApp({ db, resolveTenant: headerTenantResolver });
    const created = (await (await app.request("/crm/contacts", {
      method: "POST",
      headers: { "content-type": "application/json", ...tenantHeaders },
      body: JSON.stringify({ displayName: "Carol" })
    })).json()) as Contact;

    const res = await app.request(`/crm/contacts/${created.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json", ...tenantHeaders },
      body: JSON.stringify({ status: "inactive" })
    });
    expect(res.status).toBe(200);
    expect((await res.json()).status).toBe("inactive");
  });

  it("PATCH /crm/contacts/:id returns 404 on missing id", async () => {
    const { db } = makeFakeDb();
    const app = buildApp({ db, resolveTenant: headerTenantResolver });
    const res = await app.request("/crm/contacts/ct_missing", {
      method: "PATCH",
      headers: { "content-type": "application/json", ...tenantHeaders },
      body: JSON.stringify({ displayName: "x" })
    });
    expect(res.status).toBe(404);
  });
});
