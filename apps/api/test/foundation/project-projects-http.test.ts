import { describe, expect, it } from "vitest";

import type { Project } from "@sentropic/openerp-domain/project";

import type { Queryable } from "../../src/db/client";
import { buildApp, headerTenantResolver } from "../../src/http/app";

function makeFakeDb() {
  const projects: Project[] = [];

  const db: Queryable = {
    async query<T = unknown>(text: string, values: unknown[] = []): Promise<{ rows: T[] }> {
      const t = text;

      if (t.includes("insert into projects")) {
        const [organizationId, name, description, code, companyId, ownerUserId, startDate, endDate] =
          values as [string, string, string | null, string | null, string | null, string | null, string | null, string | null];
        const row: Project = {
          id: `pr_${projects.length + 1}`,
          organizationId,
          name,
          description,
          status: "active",
          code,
          companyId,
          ownerUserId,
          startDate,
          endDate,
          createdAt: "2026-05-25T08:00:00.000Z",
          updatedAt: "2026-05-25T08:00:00.000Z"
        };
        projects.push(row);
        return { rows: [row as unknown as T] };
      }

      if (t.includes("from projects") && t.includes("where id = $1")) {
        const [id, organizationId] = values as [string, string];
        const found = projects.find((p) => p.id === id && p.organizationId === organizationId);
        return { rows: found ? [found as unknown as T] : [] };
      }

      if (t.includes("from projects") && t.includes("order by created_at")) {
        const [organizationId, status, limit, offset] = values as [string, string | null, number, number];
        const filtered = projects
          .filter((p) => p.organizationId === organizationId)
          .filter((p) => (status ? p.status === status : true))
          .slice(offset, offset + limit);
        return { rows: filtered as unknown as T[] };
      }

      if (t.includes("update projects")) {
        const [id, organizationId] = values as [string, string];
        const idx = projects.findIndex((p) => p.id === id && p.organizationId === organizationId);
        if (idx === -1) return { rows: [] };
        const trailing = values.slice(2);
        if (t.includes("name = $")) {
          projects[idx] = { ...projects[idx]!, name: String(trailing[0]), updatedAt: "2026-05-25T08:05:00.000Z" };
          trailing.shift();
        }
        if (t.includes("status = $")) {
          const statusValue = trailing.find(
            (v) => v === "draft" || v === "active" || v === "on_hold" || v === "completed" || v === "cancelled"
          );
          if (statusValue !== undefined) {
            projects[idx] = { ...projects[idx]!, status: statusValue as Project["status"], updatedAt: "2026-05-25T08:05:00.000Z" };
          }
        }
        return { rows: [projects[idx]! as unknown as T] };
      }

      return { rows: [] };
    }
  };
  return { db, projects };
}

const tenantHeaders = {
  "x-organization-id": "00000000-0000-0000-0000-000000000001",
  "x-user-identity-id": "00000000-0000-0000-0000-000000000aaa"
} as const;

describe("Project /project/projects HTTP surface", () => {
  it("POST /project/projects creates and returns 201 + body", async () => {
    const { db } = makeFakeDb();
    const app = buildApp({ db, resolveTenant: headerTenantResolver });
    const res = await app.request("/project/projects", {
      method: "POST",
      headers: { "content-type": "application/json", ...tenantHeaders },
      body: JSON.stringify({ name: "Northwind Delivery" })
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toMatchObject({ name: "Northwind Delivery", status: "active" });
    expect(body.id).toBeDefined();
  });

  it("POST /project/projects rejects missing name with 400 INVALID_INPUT", async () => {
    const { db } = makeFakeDb();
    const app = buildApp({ db, resolveTenant: headerTenantResolver });
    const res = await app.request("/project/projects", {
      method: "POST",
      headers: { "content-type": "application/json", ...tenantHeaders },
      body: JSON.stringify({ description: "No name" })
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe("INVALID_INPUT");
    expect(body.errors.name).toBe("REQUIRED");
  });

  it("GET /project/projects returns { items: [] } when no records", async () => {
    const { db } = makeFakeDb();
    const app = buildApp({ db, resolveTenant: headerTenantResolver });
    const res = await app.request("/project/projects", { headers: tenantHeaders });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ items: [] });
  });

  it("GET /project/projects returns list and PATCH updates record", async () => {
    const { db } = makeFakeDb();
    const app = buildApp({ db, resolveTenant: headerTenantResolver });

    const created = (await (
      await app.request("/project/projects", {
        method: "POST",
        headers: { "content-type": "application/json", ...tenantHeaders },
        body: JSON.stringify({ name: "Alpha Project" })
      })
    ).json()) as Project;

    const list = await app.request("/project/projects", { headers: tenantHeaders });
    expect((await list.json()).items).toHaveLength(1);

    const patch = await app.request(`/project/projects/${created.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json", ...tenantHeaders },
      body: JSON.stringify({ status: "on_hold" })
    });
    expect(patch.status).toBe(200);
    expect((await patch.json()).status).toBe("on_hold");
  });

  it("PATCH /project/projects/:id returns 404 when project is missing", async () => {
    const { db } = makeFakeDb();
    const app = buildApp({ db, resolveTenant: headerTenantResolver });
    const res = await app.request("/project/projects/pr_missing", {
      method: "PATCH",
      headers: { "content-type": "application/json", ...tenantHeaders },
      body: JSON.stringify({ name: "x" })
    });
    expect(res.status).toBe(404);
  });

  it("PATCH /project/projects/:id rejects invalid status with 400", async () => {
    const { db } = makeFakeDb();
    const app = buildApp({ db, resolveTenant: headerTenantResolver });
    const res = await app.request("/project/projects/pr_x", {
      method: "PATCH",
      headers: { "content-type": "application/json", ...tenantHeaders },
      body: JSON.stringify({ status: "deleted" })
    });
    expect(res.status).toBe(400);
    expect((await res.json()).errors.status).toBe("INVALID");
  });

  it("DELETE /project/projects/:id returns 204 on success", async () => {
    const { db } = makeFakeDb();
    const app = buildApp({ db, resolveTenant: headerTenantResolver });
    // Insert a project directly into fake db
    const createRes = await app.request("/project/projects", {
      method: "POST",
      headers: { "content-type": "application/json", ...tenantHeaders },
      body: JSON.stringify({ name: "To Delete" })
    });
    const created = (await createRes.json()) as Project;
    const deleteRes = await app.request(`/project/projects/${created.id}`, {
      method: "DELETE",
      headers: tenantHeaders
    });
    expect(deleteRes.status).toBe(204);
  });

  it("rejects requests without a tenant context (401)", async () => {
    const { db } = makeFakeDb();
    const app = buildApp({ db, resolveTenant: headerTenantResolver });
    const res = await app.request("/project/projects", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "X" })
    });
    expect(res.status).toBe(401);
  });
});
