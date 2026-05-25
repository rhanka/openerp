import { describe, expect, it } from "vitest";

import type { Rate } from "@sentropic/openerp-domain/project";

import type { Queryable } from "../../src/db/client";
import { buildApp, headerTenantResolver } from "../../src/http/app";

const DEMO_MONEY = { amountMinor: 15000, currency: "CAD", scale: 2 };

function makeFakeDb() {
  const rates: Rate[] = [];

  const db: Queryable = {
    async query<T = unknown>(text: string, values: unknown[] = []): Promise<{ rows: T[] }> {
      const t = text;

      if (t.includes("insert into rates")) {
        const [organizationId, name, amountJson, effectiveFrom, effectiveTo, active] = values as [
          string, string, string, string, string | null, boolean
        ];
        const row: Rate = {
          id: `rate_${rates.length + 1}`,
          organizationId,
          name,
          amount: JSON.parse(String(amountJson)),
          effectiveFrom,
          effectiveTo,
          active,
          createdAt: "2026-05-25T08:00:00.000Z",
          updatedAt: "2026-05-25T08:00:00.000Z"
        };
        rates.push(row);
        return { rows: [row as unknown as T] };
      }

      if (t.includes("from rates") && t.includes("where id = $1")) {
        const [id, organizationId] = values as [string, string];
        const found = rates.find(
          (r) =>
            r.id === id &&
            r.organizationId === organizationId &&
            !(r as unknown as { _deleted?: boolean })._deleted
        );
        return { rows: found ? [found as unknown as T] : [] };
      }

      if (t.includes("from rates") && t.includes("order by name asc")) {
        const [organizationId, activeFilter, limit, offset] = values as [string, boolean, number, number];
        const filtered = rates
          .filter((r) => r.organizationId === organizationId)
          .filter((r) => !(r as unknown as { _deleted?: boolean })._deleted)
          .filter((r) => (!activeFilter ? true : r.active))
          .slice(offset, offset + limit);
        return { rows: filtered as unknown as T[] };
      }

      if (t.includes("update rates") && t.includes("deleted_at = now()")) {
        const [id, organizationId] = values as [string, string];
        const idx = rates.findIndex(
          (r) =>
            r.id === id &&
            r.organizationId === organizationId &&
            !(r as unknown as { _deleted?: boolean })._deleted
        );
        if (idx === -1) return { rows: [] };
        (rates[idx] as unknown as { _deleted: boolean })._deleted = true;
        return { rows: [{ id: rates[idx]!.id } as unknown as T] };
      }

      if (t.includes("update rates")) {
        const [id, organizationId] = values as [string, string];
        const idx = rates.findIndex((r) => r.id === id && r.organizationId === organizationId);
        if (idx === -1) return { rows: [] };
        const trailing = values.slice(2);
        const patch: Partial<Rate> = {};
        if (t.includes("name = $")) {
          const nameVal = trailing.find((v) => typeof v === "string" && v.length > 0);
          if (nameVal !== undefined) patch.name = String(nameVal);
        }
        rates[idx] = { ...rates[idx]!, ...patch, updatedAt: "2026-05-25T08:05:00.000Z" };
        return { rows: [rates[idx]! as unknown as T] };
      }

      return { rows: [] };
    }
  };
  return { db, rates };
}

const tenantHeaders = {
  "x-organization-id": "00000000-0000-0000-0000-000000000001",
  "x-user-identity-id": "00000000-0000-0000-0000-000000000aaa"
} as const;

describe("project /project/rates HTTP surface (DS 3.3)", () => {
  it("POST /project/rates creates and returns 201", async () => {
    const { db } = makeFakeDb();
    const app = buildApp({ db, resolveTenant: headerTenantResolver });
    const res = await app.request("/project/rates", {
      method: "POST",
      headers: { "content-type": "application/json", ...tenantHeaders },
      body: JSON.stringify({ name: "Senior consultant", amount: DEMO_MONEY, effectiveFrom: "2026-01-01" })
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toMatchObject({ name: "Senior consultant", active: true });
  });

  it("POST /project/rates rejects missing name with 400", async () => {
    const { db } = makeFakeDb();
    const app = buildApp({ db, resolveTenant: headerTenantResolver });
    const res = await app.request("/project/rates", {
      method: "POST",
      headers: { "content-type": "application/json", ...tenantHeaders },
      body: JSON.stringify({ amount: DEMO_MONEY, effectiveFrom: "2026-01-01" })
    });
    expect(res.status).toBe(400);
    expect((await res.json()).errors.name).toBe("REQUIRED");
  });

  it("POST /project/rates rejects invalid amount with 400", async () => {
    const { db } = makeFakeDb();
    const app = buildApp({ db, resolveTenant: headerTenantResolver });
    const res = await app.request("/project/rates", {
      method: "POST",
      headers: { "content-type": "application/json", ...tenantHeaders },
      body: JSON.stringify({ name: "Bad", amount: { amountMinor: -1, currency: "CAD", scale: 2 }, effectiveFrom: "2026-01-01" })
    });
    expect(res.status).toBe(400);
    expect((await res.json()).errors.amount).toBe("INVALID_MONEY");
  });

  it("GET /project/rates returns list", async () => {
    const { db } = makeFakeDb();
    const app = buildApp({ db, resolveTenant: headerTenantResolver });
    await app.request("/project/rates", {
      method: "POST",
      headers: { "content-type": "application/json", ...tenantHeaders },
      body: JSON.stringify({ name: "Rate A", amount: DEMO_MONEY, effectiveFrom: "2026-01-01" })
    });
    const res = await app.request("/project/rates", { headers: tenantHeaders });
    const body = await res.json();
    expect(body.items).toHaveLength(1);
    expect(body.items[0].name).toBe("Rate A");
  });

  it("GET /project/rates/:id returns 404 for missing rate", async () => {
    const { db } = makeFakeDb();
    const app = buildApp({ db, resolveTenant: headerTenantResolver });
    const res = await app.request("/project/rates/rate_missing", { headers: tenantHeaders });
    expect(res.status).toBe(404);
  });

  it("PATCH /project/rates/:id returns 404 on missing id", async () => {
    const { db } = makeFakeDb();
    const app = buildApp({ db, resolveTenant: headerTenantResolver });
    const res = await app.request("/project/rates/rate_missing", {
      method: "PATCH",
      headers: { "content-type": "application/json", ...tenantHeaders },
      body: JSON.stringify({ name: "Updated" })
    });
    expect(res.status).toBe(404);
  });

  it("DELETE /project/rates/:id returns 204 on success", async () => {
    const { db } = makeFakeDb();
    const app = buildApp({ db, resolveTenant: headerTenantResolver });
    const created = (await (
      await app.request("/project/rates", {
        method: "POST",
        headers: { "content-type": "application/json", ...tenantHeaders },
        body: JSON.stringify({ name: "Delete me", amount: DEMO_MONEY, effectiveFrom: "2026-01-01" })
      })
    ).json()) as Rate;
    const res = await app.request(`/project/rates/${created.id}`, {
      method: "DELETE",
      headers: tenantHeaders
    });
    expect(res.status).toBe(204);
  });

  it("requires tenant headers — returns 401 when missing", async () => {
    const { db } = makeFakeDb();
    const app = buildApp({ db, resolveTenant: headerTenantResolver });
    const res = await app.request("/project/rates", { method: "GET" });
    expect(res.status).toBe(401);
  });
});
