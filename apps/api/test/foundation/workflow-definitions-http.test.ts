import { describe, expect, it } from "vitest";

import type { WorkflowDefinition, WorkflowRun } from "@sentropic/openerp-domain/workflow";
import type { Queryable } from "../../src/db/client";
import { buildApp, headerTenantResolver } from "../../src/http/app";

function makeFakeDb() {
  const defs: (WorkflowDefinition & { _deleted?: boolean })[] = [];
  const runs: WorkflowRun[] = [];
  const audits: unknown[] = [];
  const notifications: Array<{ id: string; recipientUserId: string }> = [];

  let auditId = 0;
  let runId = 0;
  let notifId = 0;

  const db: Queryable = {
    async query<T = unknown>(text: string, values: unknown[] = []): Promise<{ rows: T[] }> {
      const t = text;

      if (t.includes("insert into audit_events")) {
        const id = `audit_${++auditId}`;
        audits.push({ id, action: values[3] });
        return { rows: [{ id } as unknown as T] };
      }

      if (t.includes("insert into notifications")) {
        const id = `notif_${++notifId}`;
        notifications.push({ id, recipientUserId: values[1] as string });
        return {
          rows: [{
            id,
            organizationId: values[0],
            recipientUserId: values[1],
            channel: "in_app",
            subjectKey: values[3],
            bodyKey: values[4],
            payload: {},
            readAt: null,
            createdAt: new Date().toISOString()
          } as unknown as T]
        };
      }

      if (t.includes("insert into workflow_definitions")) {
        const def: WorkflowDefinition = {
          id: `wf_${defs.length + 1}`,
          organizationId: values[0] as string,
          ownerUserId: values[1] as string | null,
          name: values[2] as string,
          description: values[3] as string | null,
          triggerType: values[4] as string,
          triggerConfig: JSON.parse(values[5] as string) as Record<string, unknown>,
          actionType: values[6] as string,
          actionConfig: JSON.parse(values[7] as string) as Record<string, unknown>,
          isActive: values[8] as boolean,
          isShared: values[9] as boolean,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        defs.push(def);
        return { rows: [def as unknown as T] };
      }

      if (t.includes("from workflow_definitions") && t.includes("where id = $1")) {
        const [id, orgId] = values as [string, string];
        const found = defs.find((d) => d.id === id && d.organizationId === orgId && !d._deleted);
        return { rows: found ? [found as unknown as T] : [] };
      }

      if (t.includes("from workflow_definitions") && t.includes("trigger_type = $2")) {
        const [orgId, triggerType] = values as [string, string];
        const found = defs.filter((d) => d.organizationId === orgId && d.triggerType === triggerType && d.isActive && !d._deleted);
        return { rows: found as unknown as T[] };
      }

      if (t.includes("from workflow_definitions") && !t.includes("workflow_runs") && !t.includes("insert")) {
        const [orgId] = values as [string];
        const found = defs.filter((d) => d.organizationId === orgId && !d._deleted);
        return { rows: found as unknown as T[] };
      }

      if (t.includes("update workflow_definitions") && t.includes("deleted_at = now()")) {
        const id = values[0] as string;
        const orgId = values[1] as string;
        const def = defs.find((d) => d.id === id && d.organizationId === orgId && !d._deleted);
        if (!def) return { rows: [] };
        def._deleted = true;
        return { rows: [def as unknown as T] };
      }

      if (t.includes("update workflow_definitions") && t.includes("set")) {
        const id = values[values.length - 2] as string;
        const orgId = values[values.length - 1] as string;
        const def = defs.find((d) => d.id === id && d.organizationId === orgId && !d._deleted);
        if (!def) return { rows: [] };
        def.updatedAt = new Date().toISOString();
        return { rows: [def as unknown as T] };
      }

      if (t.includes("insert into workflow_runs") || t.includes("from workflow_runs")) {
        if (t.includes("insert into workflow_runs")) {
          const run: WorkflowRun = {
            id: `run_${++runId}`,
            organizationId: values[0] as string,
            workflowDefinitionId: values[1] as string,
            triggerAuditEventId: values[2] as string | null,
            triggerEventType: values[3] as string,
            triggerResourceType: values[4] as string | null,
            triggerResourceId: values[5] as string | null,
            triggeredBy: values[6] as "event" | "manual",
            status: values[7] as "completed" | "failed" | "skipped",
            createdResourceType: values[8] as string | null,
            createdResourceId: values[9] as string | null,
            actionResult: JSON.parse(values[10] as string) as Record<string, unknown>,
            errorDetail: values[11] as string | null,
            startedAt: values[12] as string | null,
            completedAt: values[13] as string | null,
            createdAt: new Date().toISOString()
          };
          runs.push(run);
          return { rows: [run as unknown as T] };
        }
        // listByDefinition
        const defId = values[1] as string;
        return { rows: runs.filter((r) => r.workflowDefinitionId === defId) as unknown as T[] };
      }

      return { rows: [] };
    }
  };

  return { db, defs, runs, audits };
}

const ORG = "org_wf_http";
const USER = "user_wf_http";

function makeApp(db: Queryable) {
  return buildApp({
    resolveTenant: headerTenantResolver,
    db
  });
}

function headers() {
  return {
    "x-organization-id": ORG,
    "x-user-identity-id": USER,
    "content-type": "application/json"
  };
}

describe("workflow HTTP handlers (DS 5.4)", () => {
  it("GET /workflows/catalog returns triggers and actions", async () => {
    const { db } = makeFakeDb();
    const app = makeApp(db);
    const res = await app.request("/workflows/catalog", { headers: headers() });
    expect(res.status).toBe(200);
    const body = await res.json() as { triggers: unknown[]; actions: unknown[] };
    expect(body.triggers.length).toBeGreaterThan(0);
    expect(body.actions.length).toBeGreaterThan(0);
  });

  it("POST /workflows returns 201 with valid input", async () => {
    const { db } = makeFakeDb();
    const app = makeApp(db);
    const res = await app.request("/workflows", {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({
        name: "Test workflow",
        triggerType: "project.task.completed",
        actionType: "create_notification",
        actionConfig: { recipientUserId: USER, subjectKey: "s", bodyKey: "b" }
      })
    });
    expect(res.status).toBe(201);
    const body = await res.json() as WorkflowDefinition;
    expect(body.id).toBeTruthy();
    expect(body.triggerType).toBe("project.task.completed");
  });

  it("POST /workflows returns 400 for unknown trigger", async () => {
    const { db } = makeFakeDb();
    const app = makeApp(db);
    const res = await app.request("/workflows", {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({
        name: "Bad",
        triggerType: "unknown.thing.created",
        actionType: "create_notification",
        actionConfig: { subjectKey: "s", bodyKey: "b" }
      })
    });
    expect(res.status).toBe(400);
    const body = await res.json() as { code: string };
    expect(body.code).toBe("UNKNOWN_TRIGGER");
  });

  it("POST /workflows returns 400 for unknown action", async () => {
    const { db } = makeFakeDb();
    const app = makeApp(db);
    const res = await app.request("/workflows", {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({
        name: "Bad",
        triggerType: "project.task.completed",
        actionType: "unknown_action",
        actionConfig: {}
      })
    });
    expect(res.status).toBe(400);
    const body = await res.json() as { code: string };
    expect(body.code).toBe("UNKNOWN_ACTION");
  });

  it("GET /workflows returns 200 with items", async () => {
    const { db } = makeFakeDb();
    const app = makeApp(db);
    const res = await app.request("/workflows", { headers: headers() });
    expect(res.status).toBe(200);
    const body = await res.json() as { items: unknown[] };
    expect(Array.isArray(body.items)).toBe(true);
  });

  it("GET /workflows/:id returns 404 for missing", async () => {
    const { db } = makeFakeDb();
    const app = makeApp(db);
    const res = await app.request("/workflows/nonexistent", { headers: headers() });
    expect(res.status).toBe(404);
  });

  it("GET /workflows/:id returns 200 for existing", async () => {
    const { db, defs } = makeFakeDb();
    defs.push({
      id: "wf_http_1",
      organizationId: ORG,
      ownerUserId: USER,
      name: "HTTP test",
      description: null,
      triggerType: "project.task.completed",
      triggerConfig: {},
      actionType: "create_notification",
      actionConfig: { subjectKey: "s", bodyKey: "b" },
      isActive: true,
      isShared: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    const app = makeApp(db);
    const res = await app.request("/workflows/wf_http_1", { headers: headers() });
    expect(res.status).toBe(200);
    const body = await res.json() as WorkflowDefinition;
    expect(body.id).toBe("wf_http_1");
  });

  it("DELETE /workflows/:id returns 204", async () => {
    const { db, defs } = makeFakeDb();
    defs.push({
      id: "wf_del",
      organizationId: ORG,
      ownerUserId: USER,
      name: "Delete me",
      description: null,
      triggerType: "crm.opportunity.won",
      triggerConfig: {},
      actionType: "create_notification",
      actionConfig: { subjectKey: "s", bodyKey: "b" },
      isActive: true,
      isShared: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    const app = makeApp(db);
    const res = await app.request("/workflows/wf_del", {
      method: "DELETE",
      headers: headers()
    });
    expect(res.status).toBe(204);
  });

  it("DELETE /workflows/:id returns 404 for missing", async () => {
    const { db } = makeFakeDb();
    const app = makeApp(db);
    const res = await app.request("/workflows/nonexistent", {
      method: "DELETE",
      headers: headers()
    });
    expect(res.status).toBe(404);
  });

  it("POST /workflows/:id/run returns 200 with manual run", async () => {
    const { db, defs } = makeFakeDb();
    defs.push({
      id: "wf_run",
      organizationId: ORG,
      ownerUserId: USER,
      name: "Run me",
      description: null,
      triggerType: "project.task.completed",
      triggerConfig: {},
      actionType: "create_notification",
      actionConfig: { recipientUserId: USER, subjectKey: "s", bodyKey: "b" },
      isActive: true,
      isShared: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    const app = makeApp(db);
    const res = await app.request("/workflows/wf_run/run", {
      method: "POST",
      headers: headers()
    });
    expect(res.status).toBe(200);
    const body = await res.json() as WorkflowRun;
    expect(body.triggeredBy).toBe("manual");
    expect(body.status).toBe("completed");
  });

  it("POST /workflows/:id/run returns 404 for missing", async () => {
    const { db } = makeFakeDb();
    const app = makeApp(db);
    const res = await app.request("/workflows/nonexistent/run", {
      method: "POST",
      headers: headers()
    });
    expect(res.status).toBe(404);
  });

  it("GET /workflows/:id/runs returns 200 with items", async () => {
    const { db, defs } = makeFakeDb();
    defs.push({
      id: "wf_runs",
      organizationId: ORG,
      ownerUserId: USER,
      name: "Runs list",
      description: null,
      triggerType: "project.task.completed",
      triggerConfig: {},
      actionType: "create_notification",
      actionConfig: { subjectKey: "s", bodyKey: "b" },
      isActive: true,
      isShared: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    const app = makeApp(db);
    const res = await app.request("/workflows/wf_runs/runs", { headers: headers() });
    expect(res.status).toBe(200);
    const body = await res.json() as { items: unknown[] };
    expect(Array.isArray(body.items)).toBe(true);
  });

  it("GET /workflows/:id/runs returns 404 for missing definition", async () => {
    const { db } = makeFakeDb();
    const app = makeApp(db);
    const res = await app.request("/workflows/nonexistent/runs", { headers: headers() });
    expect(res.status).toBe(404);
  });

  it("returns 401 without tenant headers", async () => {
    const { db } = makeFakeDb();
    const app = makeApp(db);
    const res = await app.request("/workflows");
    expect(res.status).toBe(401);
  });

  it("PATCH /workflows/:id returns 403 for shared workflow owned by another user", async () => {
    const { db, defs } = makeFakeDb();
    const OTHER_USER = "user_other";
    defs.push({
      id: "wf_shared_403",
      organizationId: ORG,
      ownerUserId: OTHER_USER,
      name: "Shared 403 test",
      description: null,
      triggerType: "crm.opportunity.won",
      triggerConfig: {},
      actionType: "create_notification",
      actionConfig: { subjectKey: "s", bodyKey: "b" },
      isActive: true,
      isShared: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    const app = makeApp(db);
    const res = await app.request("/workflows/wf_shared_403", {
      method: "PATCH",
      headers: headers(), // USER tries to update, but OTHER_USER owns it
      body: JSON.stringify({ name: "Hacked" })
    });
    expect(res.status).toBe(403);
  });
});
