import { describe, expect, it } from "vitest";

import type { ProjectTask } from "@sentropic/openerp-domain/project";

import type { Queryable } from "../../src/db/client";
import { buildApp, headerTenantResolver } from "../../src/http/app";

function makeFakeDb() {
  const tasks: ProjectTask[] = [];

  const db: Queryable = {
    async query<T = unknown>(text: string, values: unknown[] = []): Promise<{ rows: T[] }> {
      const t = text;

      if (t.includes("insert into project_tasks")) {
        const [
          organizationId,
          projectId,
          title,
          description,
          status,
          assigneeUserId,
          dueDate,
          parentTaskId
        ] = values as [
          string,
          string,
          string,
          string | null,
          string,
          string | null,
          string | null,
          string | null
        ];
        const row: ProjectTask = {
          id: `tk_${tasks.length + 1}`,
          organizationId,
          projectId,
          title,
          description,
          status: status as ProjectTask["status"],
          assigneeUserId,
          dueDate,
          completedAt: null,
          parentTaskId,
          createdAt: "2026-05-25T08:00:00.000Z",
          updatedAt: "2026-05-25T08:00:00.000Z"
        };
        tasks.push(row);
        return { rows: [row as unknown as T] };
      }

      if (t.includes("from project_tasks") && t.includes("where id = $1")) {
        const [id, organizationId] = values as [string, string];
        const found = tasks.find(
          (tk) =>
            tk.id === id &&
            tk.organizationId === organizationId &&
            !(tk as unknown as { _deleted?: boolean })._deleted
        );
        return { rows: found ? [found as unknown as T] : [] };
      }

      if (t.includes("from project_tasks") && t.includes("order by created_at desc")) {
        const [organizationId, projectIdFilter, statusFilter, limit, offset] = values as [
          string,
          string | null,
          string | null,
          number,
          number
        ];
        const filtered = tasks
          .filter((tk) => tk.organizationId === organizationId)
          .filter((tk) => !(tk as unknown as { _deleted?: boolean })._deleted)
          .filter((tk) => (projectIdFilter ? tk.projectId === projectIdFilter : true))
          .filter((tk) => (statusFilter ? tk.status === statusFilter : true))
          .slice(offset, offset + limit);
        return { rows: filtered as unknown as T[] };
      }

      if (t.includes("update project_tasks") && t.includes("deleted_at = now()")) {
        const [id, organizationId] = values as [string, string];
        const idx = tasks.findIndex(
          (tk) =>
            tk.id === id &&
            tk.organizationId === organizationId &&
            !(tk as unknown as { _deleted?: boolean })._deleted
        );
        if (idx === -1) return { rows: [] };
        (tasks[idx] as unknown as { _deleted: boolean })._deleted = true;
        return { rows: [{ id: tasks[idx]!.id } as unknown as T] };
      }

      if (t.includes("update project_tasks")) {
        const [id, organizationId] = values as [string, string];
        const idx = tasks.findIndex((tk) => tk.id === id && tk.organizationId === organizationId);
        if (idx === -1) return { rows: [] };
        const trailing = values.slice(2);
        const patch: Partial<ProjectTask> = {};
        if (t.includes("status = $")) {
          const statusVal = trailing.find((v) =>
            ["todo", "in_progress", "blocked", "done", "cancelled"].includes(v as string)
          );
          if (statusVal !== undefined) patch.status = statusVal as ProjectTask["status"];
        }
        tasks[idx] = { ...tasks[idx]!, ...patch, updatedAt: "2026-05-25T08:05:00.000Z" };
        return { rows: [tasks[idx]! as unknown as T] };
      }

      return { rows: [] };
    }
  };
  return { db, tasks };
}

const tenantHeaders = {
  "x-organization-id": "00000000-0000-0000-0000-000000000001",
  "x-user-identity-id": "00000000-0000-0000-0000-000000000aaa"
} as const;

describe("project /project/tasks HTTP surface (DS 3.1)", () => {
  it("POST /project/tasks creates and returns 201", async () => {
    const { db } = makeFakeDb();
    const app = buildApp({ db, resolveTenant: headerTenantResolver });
    const res = await app.request("/project/tasks", {
      method: "POST",
      headers: { "content-type": "application/json", ...tenantHeaders },
      body: JSON.stringify({ projectId: "proj_1", title: "First task" })
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toMatchObject({ title: "First task", projectId: "proj_1", status: "todo" });
  });

  it("POST /project/tasks rejects missing projectId with 400", async () => {
    const { db } = makeFakeDb();
    const app = buildApp({ db, resolveTenant: headerTenantResolver });
    const res = await app.request("/project/tasks", {
      method: "POST",
      headers: { "content-type": "application/json", ...tenantHeaders },
      body: JSON.stringify({ title: "No project" })
    });
    expect(res.status).toBe(400);
    expect((await res.json()).errors.projectId).toBe("REQUIRED");
  });

  it("POST /project/tasks rejects missing title with 400", async () => {
    const { db } = makeFakeDb();
    const app = buildApp({ db, resolveTenant: headerTenantResolver });
    const res = await app.request("/project/tasks", {
      method: "POST",
      headers: { "content-type": "application/json", ...tenantHeaders },
      body: JSON.stringify({ projectId: "proj_1" })
    });
    expect(res.status).toBe(400);
    expect((await res.json()).errors.title).toBe("REQUIRED");
  });

  it("GET /project/tasks filters by projectId", async () => {
    const { db } = makeFakeDb();
    const app = buildApp({ db, resolveTenant: headerTenantResolver });
    await app.request("/project/tasks", {
      method: "POST",
      headers: { "content-type": "application/json", ...tenantHeaders },
      body: JSON.stringify({ projectId: "proj_1", title: "Task A" })
    });
    await app.request("/project/tasks", {
      method: "POST",
      headers: { "content-type": "application/json", ...tenantHeaders },
      body: JSON.stringify({ projectId: "proj_2", title: "Task B" })
    });
    const res = await app.request("/project/tasks?projectId=proj_1", { headers: tenantHeaders });
    const body = await res.json();
    expect(body.items.map((t: ProjectTask) => t.title)).toEqual(["Task A"]);
  });

  it("GET /project/tasks/:id returns 404 for missing task", async () => {
    const { db } = makeFakeDb();
    const app = buildApp({ db, resolveTenant: headerTenantResolver });
    const res = await app.request("/project/tasks/tk_missing", { headers: tenantHeaders });
    expect(res.status).toBe(404);
  });

  it("PATCH /project/tasks/:id returns 404 on missing id", async () => {
    const { db } = makeFakeDb();
    const app = buildApp({ db, resolveTenant: headerTenantResolver });
    const res = await app.request("/project/tasks/tk_missing", {
      method: "PATCH",
      headers: { "content-type": "application/json", ...tenantHeaders },
      body: JSON.stringify({ status: "done" })
    });
    expect(res.status).toBe(404);
  });

  it("DELETE /project/tasks/:id returns 204 on success", async () => {
    const { db } = makeFakeDb();
    const app = buildApp({ db, resolveTenant: headerTenantResolver });
    const created = (await (
      await app.request("/project/tasks", {
        method: "POST",
        headers: { "content-type": "application/json", ...tenantHeaders },
        body: JSON.stringify({ projectId: "proj_1", title: "Delete me" })
      })
    ).json()) as ProjectTask;
    const res = await app.request(`/project/tasks/${created.id}`, {
      method: "DELETE",
      headers: tenantHeaders
    });
    expect(res.status).toBe(204);
  });

  it("requires tenant headers — returns 401 when missing", async () => {
    const { db } = makeFakeDb();
    const app = buildApp({ db, resolveTenant: headerTenantResolver });
    const res = await app.request("/project/tasks", { method: "GET" });
    expect(res.status).toBe(401);
  });
});
