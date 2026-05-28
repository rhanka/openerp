import { describe, expect, it } from "vitest";

import type { TimeEntry } from "@sentropic/openerp-domain/project";

import type { Queryable } from "../../src/db/client";
import { buildApp, headerTenantResolver } from "../../src/http/app";

function makeFakeDb() {
  const entries: TimeEntry[] = [];

  const db: Queryable = {
    async query<T = unknown>(text: string, values: unknown[] = []): Promise<{ rows: T[] }> {
      const t = text;

      if (t.includes("insert into time_entries")) {
        const [
          organizationId,
          projectId,
          projectTaskId,
          userId,
          entryDate,
          minutes,
          description,
          billable,
          status
        ] = values as [
          string,
          string,
          string | null,
          string,
          string,
          number,
          string | null,
          boolean,
          string
        ];
        const row: TimeEntry = {
          id: `te_${entries.length + 1}`,
          organizationId,
          projectId,
          projectTaskId,
          userId,
          entryDate,
          minutes,
          description,
          billable,
          status: status as TimeEntry["status"],
          approvalRequestId: null,
          createdAt: "2026-05-25T08:00:00.000Z",
          updatedAt: "2026-05-25T08:00:00.000Z"
        };
        entries.push(row);
        return { rows: [row as unknown as T] };
      }

      if (t.includes("from time_entries") && t.includes("where id = $1")) {
        const [id, organizationId] = values as [string, string];
        const found = entries.find(
          (e) =>
            e.id === id &&
            e.organizationId === organizationId &&
            !(e as unknown as { _deleted?: boolean })._deleted
        );
        return { rows: found ? [found as unknown as T] : [] };
      }

      if (t.includes("from time_entries") && t.includes("order by entry_date desc")) {
        const [organizationId, projectIdFilter, projectTaskIdFilter, userIdFilter, statusFilter, billableFilter, limit, offset] =
          values as [string, string | null, string | null, string | null, string | null, boolean | null, number, number];
        const filtered = entries
          .filter((e) => e.organizationId === organizationId)
          .filter((e) => !(e as unknown as { _deleted?: boolean })._deleted)
          .filter((e) => (projectIdFilter ? e.projectId === projectIdFilter : true))
          .filter((e) => (projectTaskIdFilter ? e.projectTaskId === projectTaskIdFilter : true))
          .filter((e) => (userIdFilter ? e.userId === userIdFilter : true))
          .filter((e) => (statusFilter ? e.status === statusFilter : true))
          .filter((e) => (billableFilter !== null ? e.billable === billableFilter : true))
          .slice(offset, offset + limit);
        return { rows: filtered as unknown as T[] };
      }

      if (t.includes("update time_entries") && t.includes("deleted_at = now()")) {
        const [id, organizationId] = values as [string, string];
        const idx = entries.findIndex(
          (e) =>
            e.id === id &&
            e.organizationId === organizationId &&
            !(e as unknown as { _deleted?: boolean })._deleted
        );
        if (idx === -1) return { rows: [] };
        (entries[idx] as unknown as { _deleted: boolean })._deleted = true;
        return { rows: [{ id: entries[idx]!.id } as unknown as T] };
      }

      // linkApprovalRequestToTimeEntry
      if (t.includes("update time_entries") && t.includes("approval_request_id = $3")) {
        const [id, organizationId, approvalRequestId] = values as [string, string, string];
        const idx = entries.findIndex(
          (e) => e.id === id && e.organizationId === organizationId
        );
        if (idx === -1) return { rows: [] };
        entries[idx] = { ...entries[idx]!, approvalRequestId, updatedAt: "2026-05-28T10:00:00.000Z" };
        return { rows: [entries[idx]! as unknown as T] };
      }

      if (t.includes("update time_entries")) {
        const [id, organizationId] = values as [string, string];
        const idx = entries.findIndex(
          (e) => e.id === id && e.organizationId === organizationId
        );
        if (idx === -1) return { rows: [] };
        const trailing = values.slice(2);
        const patch: Partial<TimeEntry> = {};
        if (t.includes("status = $")) {
          const statusVal = trailing.find((v) =>
            ["draft", "submitted", "approved", "rejected"].includes(v as string)
          );
          if (statusVal !== undefined) patch.status = statusVal as TimeEntry["status"];
        }
        entries[idx] = { ...entries[idx]!, ...patch, updatedAt: "2026-05-25T08:05:00.000Z" };
        return { rows: [entries[idx]! as unknown as T] };
      }

      // ApprovalRequest operations (DS 3.5 submit/approve/reject routes)
      if (t.includes("insert into approval_requests")) {
        const approvalRow = {
          id: `approval_${Date.now()}`,
          organizationId: (values[0] as string),
          requesterUserIdentityId: (values[1] as string),
          approverUserIdentityId: (values[2] as string | null),
          approverRoleId: (values[3] as string | null),
          subjectType: (values[4] as string),
          subjectId: (values[5] as string),
          reason: (values[6] as string),
          urgency: (values[7] as string),
          status: "pending",
          decisionReason: null,
          decidedAt: null,
          expiresAt: (values[8] as string | null),
          createdAt: new Date().toISOString()
        };
        return { rows: [approvalRow as unknown as T] };
      }

      if (t.includes("from approval_requests") && t.includes("where id = $1")) {
        // Return a pending approval for any lookup
        const approvalRow = {
          id: (values[0] as string),
          organizationId: (values[1] as string),
          requesterUserIdentityId: "req",
          approverUserIdentityId: "approver",
          approverRoleId: null,
          subjectType: "time_entry",
          subjectId: "te_1",
          reason: "test",
          urgency: "normal",
          status: "pending",
          decisionReason: null,
          decidedAt: null,
          expiresAt: null,
          createdAt: new Date().toISOString()
        };
        return { rows: [approvalRow as unknown as T] };
      }

      if (t.includes("update approval_requests")) {
        const approvalRow = {
          id: (values[0] as string),
          organizationId: (values[1] as string),
          status: (values[2] as string),
          decisionReason: (values[3] as string),
          decidedAt: (values[4] as string),
          requesterUserIdentityId: "req",
          approverUserIdentityId: (values[5] as string),
          approverRoleId: null,
          subjectType: "time_entry",
          subjectId: "te_1",
          reason: "test",
          urgency: "normal",
          expiresAt: null,
          createdAt: new Date().toISOString()
        };
        return { rows: [approvalRow as unknown as T] };
      }

      // h2a journal chain lookup (returns empty prev chain)
      if (t.includes("approval_request_id = $2") && t.includes("after_summary ? 'journalEntry'")) {
        return { rows: [] };
      }

      if (t.includes("insert into audit_events") || t.includes("insert into timeline_entries")) {
        return { rows: [] };
      }

      return { rows: [] };
    }
  };
  return { db, entries };
}

const tenantHeaders = {
  "x-organization-id": "00000000-0000-0000-0000-000000000001",
  "x-user-identity-id": "00000000-0000-0000-0000-000000000aaa"
} as const;

describe("project /project/time-entries HTTP surface (DS 3.2)", () => {
  it("POST /project/time-entries creates and returns 201", async () => {
    const { db } = makeFakeDb();
    const app = buildApp({ db, resolveTenant: headerTenantResolver });
    const res = await app.request("/project/time-entries", {
      method: "POST",
      headers: { "content-type": "application/json", ...tenantHeaders },
      body: JSON.stringify({
        projectId: "proj_1",
        userId: "user_1",
        entryDate: "2026-05-25",
        minutes: 90
      })
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toMatchObject({
      projectId: "proj_1",
      userId: "user_1",
      minutes: 90,
      status: "draft",
      billable: true
    });
  });

  it("POST /project/time-entries rejects missing projectId with 400", async () => {
    const { db } = makeFakeDb();
    const app = buildApp({ db, resolveTenant: headerTenantResolver });
    const res = await app.request("/project/time-entries", {
      method: "POST",
      headers: { "content-type": "application/json", ...tenantHeaders },
      body: JSON.stringify({ userId: "user_1", entryDate: "2026-05-25", minutes: 60 })
    });
    expect(res.status).toBe(400);
    expect((await res.json()).errors.projectId).toBe("REQUIRED");
  });

  it("POST /project/time-entries rejects missing userId with 400", async () => {
    const { db } = makeFakeDb();
    const app = buildApp({ db, resolveTenant: headerTenantResolver });
    const res = await app.request("/project/time-entries", {
      method: "POST",
      headers: { "content-type": "application/json", ...tenantHeaders },
      body: JSON.stringify({ projectId: "proj_1", entryDate: "2026-05-25", minutes: 60 })
    });
    expect(res.status).toBe(400);
    expect((await res.json()).errors.userId).toBe("REQUIRED");
  });

  it("POST /project/time-entries rejects minutes <= 0 with 400", async () => {
    const { db } = makeFakeDb();
    const app = buildApp({ db, resolveTenant: headerTenantResolver });
    const res = await app.request("/project/time-entries", {
      method: "POST",
      headers: { "content-type": "application/json", ...tenantHeaders },
      body: JSON.stringify({ projectId: "proj_1", userId: "user_1", entryDate: "2026-05-25", minutes: 0 })
    });
    expect(res.status).toBe(400);
    expect((await res.json()).errors.minutes).toBeDefined();
  });

  it("PATCH /project/time-entries/:id rejects invalid status with 400", async () => {
    const { db } = makeFakeDb();
    const app = buildApp({ db, resolveTenant: headerTenantResolver });
    const created = (await (
      await app.request("/project/time-entries", {
        method: "POST",
        headers: { "content-type": "application/json", ...tenantHeaders },
        body: JSON.stringify({ projectId: "proj_1", userId: "user_1", entryDate: "2026-05-25", minutes: 60 })
      })
    ).json()) as TimeEntry;
    const res = await app.request(`/project/time-entries/${created.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json", ...tenantHeaders },
      body: JSON.stringify({ status: "invalid_status" })
    });
    expect(res.status).toBe(400);
    expect((await res.json()).errors.status).toBe("INVALID");
  });

  it("GET /project/time-entries filters by projectId", async () => {
    const { db } = makeFakeDb();
    const app = buildApp({ db, resolveTenant: headerTenantResolver });
    await app.request("/project/time-entries", {
      method: "POST",
      headers: { "content-type": "application/json", ...tenantHeaders },
      body: JSON.stringify({ projectId: "proj_1", userId: "user_1", entryDate: "2026-05-25", minutes: 60 })
    });
    await app.request("/project/time-entries", {
      method: "POST",
      headers: { "content-type": "application/json", ...tenantHeaders },
      body: JSON.stringify({ projectId: "proj_2", userId: "user_1", entryDate: "2026-05-25", minutes: 30 })
    });
    const res = await app.request("/project/time-entries?projectId=proj_1", { headers: tenantHeaders });
    const body = await res.json();
    expect(body.items).toHaveLength(1);
    expect(body.items[0].projectId).toBe("proj_1");
  });

  it("GET /project/time-entries/:id returns 404 for missing entry", async () => {
    const { db } = makeFakeDb();
    const app = buildApp({ db, resolveTenant: headerTenantResolver });
    const res = await app.request("/project/time-entries/te_missing", { headers: tenantHeaders });
    expect(res.status).toBe(404);
  });

  it("PATCH /project/time-entries/:id returns 404 on missing id", async () => {
    const { db } = makeFakeDb();
    const app = buildApp({ db, resolveTenant: headerTenantResolver });
    const res = await app.request("/project/time-entries/te_missing", {
      method: "PATCH",
      headers: { "content-type": "application/json", ...tenantHeaders },
      body: JSON.stringify({ status: "submitted" })
    });
    expect(res.status).toBe(404);
  });

  it("DELETE /project/time-entries/:id returns 204 on success", async () => {
    const { db } = makeFakeDb();
    const app = buildApp({ db, resolveTenant: headerTenantResolver });
    const created = (await (
      await app.request("/project/time-entries", {
        method: "POST",
        headers: { "content-type": "application/json", ...tenantHeaders },
        body: JSON.stringify({ projectId: "proj_1", userId: "user_1", entryDate: "2026-05-25", minutes: 60 })
      })
    ).json()) as TimeEntry;
    const res = await app.request(`/project/time-entries/${created.id}`, {
      method: "DELETE",
      headers: tenantHeaders
    });
    expect(res.status).toBe(204);
  });

  it("requires tenant headers — returns 401 when missing", async () => {
    const { db } = makeFakeDb();
    const app = buildApp({ db, resolveTenant: headerTenantResolver });
    const res = await app.request("/project/time-entries", { method: "GET" });
    expect(res.status).toBe(401);
  });
});
