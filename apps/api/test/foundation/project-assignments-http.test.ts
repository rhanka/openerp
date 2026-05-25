import { describe, expect, it } from "vitest";

import type { Assignment } from "@sentropic/openerp-domain/project";

import type { Queryable } from "../../src/db/client";
import { buildApp, headerTenantResolver } from "../../src/http/app";

function makeFakeDb() {
  const assignments: Assignment[] = [];

  const db: Queryable = {
    async query<T = unknown>(text: string, values: unknown[] = []): Promise<{ rows: T[] }> {
      const t = text;

      if (t.includes("insert into assignments")) {
        const [organizationId, projectId, userId, roleLabel, allocationPercent, startDate, endDate, billableRateId] =
          values as [string, string, string, string | null, number | null, string | null, string | null, string | null];
        const row: Assignment = {
          id: `asgn_${assignments.length + 1}`,
          organizationId,
          projectId,
          userId,
          roleLabel,
          allocationPercent,
          startDate,
          endDate,
          billableRateId,
          createdAt: "2026-05-25T08:00:00.000Z",
          updatedAt: "2026-05-25T08:00:00.000Z"
        };
        assignments.push(row);
        return { rows: [row as unknown as T] };
      }

      if (t.includes("from assignments") && t.includes("where id = $1")) {
        const [id, organizationId] = values as [string, string];
        const found = assignments.find(
          (a) =>
            a.id === id &&
            a.organizationId === organizationId &&
            !(a as unknown as { _deleted?: boolean })._deleted
        );
        return { rows: found ? [found as unknown as T] : [] };
      }

      if (t.includes("from assignments") && t.includes("order by created_at desc")) {
        const [organizationId, projectIdFilter, userIdFilter, limit, offset] = values as [
          string, string | null, string | null, number, number
        ];
        const filtered = assignments
          .filter((a) => a.organizationId === organizationId)
          .filter((a) => !(a as unknown as { _deleted?: boolean })._deleted)
          .filter((a) => (projectIdFilter ? a.projectId === projectIdFilter : true))
          .filter((a) => (userIdFilter ? a.userId === userIdFilter : true))
          .slice(offset, offset + limit);
        return { rows: filtered as unknown as T[] };
      }

      if (t.includes("update assignments") && t.includes("deleted_at = now()")) {
        const [id, organizationId] = values as [string, string];
        const idx = assignments.findIndex(
          (a) =>
            a.id === id &&
            a.organizationId === organizationId &&
            !(a as unknown as { _deleted?: boolean })._deleted
        );
        if (idx === -1) return { rows: [] };
        (assignments[idx] as unknown as { _deleted: boolean })._deleted = true;
        return { rows: [{ id: assignments[idx]!.id } as unknown as T] };
      }

      if (t.includes("update assignments")) {
        const [id, organizationId] = values as [string, string];
        const idx = assignments.findIndex(
          (a) => a.id === id && a.organizationId === organizationId
        );
        if (idx === -1) return { rows: [] };
        assignments[idx] = { ...assignments[idx]!, updatedAt: "2026-05-25T08:05:00.000Z" };
        return { rows: [assignments[idx]! as unknown as T] };
      }

      return { rows: [] };
    }
  };
  return { db, assignments };
}

const tenantHeaders = {
  "x-organization-id": "00000000-0000-0000-0000-000000000001",
  "x-user-identity-id": "00000000-0000-0000-0000-000000000aaa"
} as const;

describe("project /project/assignments HTTP surface (DS 3.3)", () => {
  it("POST /project/assignments creates and returns 201", async () => {
    const { db } = makeFakeDb();
    const app = buildApp({ db, resolveTenant: headerTenantResolver });
    const res = await app.request("/project/assignments", {
      method: "POST",
      headers: { "content-type": "application/json", ...tenantHeaders },
      body: JSON.stringify({ projectId: "proj_1", userId: "user_1", roleLabel: "Developer", allocationPercent: 80 })
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toMatchObject({ projectId: "proj_1", userId: "user_1", allocationPercent: 80 });
  });

  it("POST /project/assignments rejects missing projectId with 400", async () => {
    const { db } = makeFakeDb();
    const app = buildApp({ db, resolveTenant: headerTenantResolver });
    const res = await app.request("/project/assignments", {
      method: "POST",
      headers: { "content-type": "application/json", ...tenantHeaders },
      body: JSON.stringify({ userId: "user_1" })
    });
    expect(res.status).toBe(400);
    expect((await res.json()).errors.projectId).toBe("REQUIRED");
  });

  it("POST /project/assignments rejects missing userId with 400", async () => {
    const { db } = makeFakeDb();
    const app = buildApp({ db, resolveTenant: headerTenantResolver });
    const res = await app.request("/project/assignments", {
      method: "POST",
      headers: { "content-type": "application/json", ...tenantHeaders },
      body: JSON.stringify({ projectId: "proj_1" })
    });
    expect(res.status).toBe(400);
    expect((await res.json()).errors.userId).toBe("REQUIRED");
  });

  it("POST /project/assignments rejects allocationPercent > 100 with 400", async () => {
    const { db } = makeFakeDb();
    const app = buildApp({ db, resolveTenant: headerTenantResolver });
    const res = await app.request("/project/assignments", {
      method: "POST",
      headers: { "content-type": "application/json", ...tenantHeaders },
      body: JSON.stringify({ projectId: "proj_1", userId: "user_1", allocationPercent: 150 })
    });
    expect(res.status).toBe(400);
    expect((await res.json()).errors.allocationPercent).toBe("MUST_BE_INTEGER_0_TO_100");
  });

  it("GET /project/assignments filters by projectId", async () => {
    const { db } = makeFakeDb();
    const app = buildApp({ db, resolveTenant: headerTenantResolver });
    await app.request("/project/assignments", {
      method: "POST",
      headers: { "content-type": "application/json", ...tenantHeaders },
      body: JSON.stringify({ projectId: "proj_1", userId: "user_1" })
    });
    await app.request("/project/assignments", {
      method: "POST",
      headers: { "content-type": "application/json", ...tenantHeaders },
      body: JSON.stringify({ projectId: "proj_2", userId: "user_2" })
    });
    const res = await app.request("/project/assignments?projectId=proj_1", { headers: tenantHeaders });
    const body = await res.json();
    expect(body.items.map((a: Assignment) => a.projectId)).toEqual(["proj_1"]);
  });

  it("GET /project/assignments/:id returns 404 for missing assignment", async () => {
    const { db } = makeFakeDb();
    const app = buildApp({ db, resolveTenant: headerTenantResolver });
    const res = await app.request("/project/assignments/asgn_missing", { headers: tenantHeaders });
    expect(res.status).toBe(404);
  });

  it("PATCH /project/assignments/:id returns 404 on missing id", async () => {
    const { db } = makeFakeDb();
    const app = buildApp({ db, resolveTenant: headerTenantResolver });
    const res = await app.request("/project/assignments/asgn_missing", {
      method: "PATCH",
      headers: { "content-type": "application/json", ...tenantHeaders },
      body: JSON.stringify({ roleLabel: "New role" })
    });
    expect(res.status).toBe(404);
  });

  it("DELETE /project/assignments/:id returns 204 on success", async () => {
    const { db } = makeFakeDb();
    const app = buildApp({ db, resolveTenant: headerTenantResolver });
    const created = (await (
      await app.request("/project/assignments", {
        method: "POST",
        headers: { "content-type": "application/json", ...tenantHeaders },
        body: JSON.stringify({ projectId: "proj_1", userId: "user_1" })
      })
    ).json()) as Assignment;
    const res = await app.request(`/project/assignments/${created.id}`, {
      method: "DELETE",
      headers: tenantHeaders
    });
    expect(res.status).toBe(204);
  });

  it("requires tenant headers — returns 401 when missing", async () => {
    const { db } = makeFakeDb();
    const app = buildApp({ db, resolveTenant: headerTenantResolver });
    const res = await app.request("/project/assignments", { method: "GET" });
    expect(res.status).toBe(401);
  });
});
