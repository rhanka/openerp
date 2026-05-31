import { describe, expect, it } from "vitest";

import type { WorkflowDefinition, WorkflowRun } from "@sentropic/openerp-domain/workflow";
import type { Queryable } from "../../src/db/client";
import {
  WorkflowNotFoundError,
  WorkflowForbiddenError,
  UnknownWorkflowTriggerError,
  UnknownWorkflowActionError,
  InvalidWorkflowConfigError,
  createWorkflowDefinition,
  updateWorkflowDefinition,
  deleteWorkflowDefinition,
  getWorkflowDefinitionById,
  listWorkflowDefinitions,
  runWorkflowNow
} from "../../src/workflow/workflow-service";

// ---------------------------------------------------------------------------
// Fake DB for unit tests (no Postgres required)
// ---------------------------------------------------------------------------

interface AuditRow {
  action: string;
  resourceType: string;
  resourceId: string;
}

function makeFakeDb() {
  const defs: (WorkflowDefinition & { _deleted?: boolean })[] = [];
  const runs: WorkflowRun[] = [];
  const audits: AuditRow[] = [];
  // Track notifications created
  const notifications: Array<{ recipientUserId: string; subjectKey: string; bodyKey: string; id: string }> = [];

  const db: Queryable = {
    async query<T = unknown>(text: string, values: unknown[] = []): Promise<{ rows: T[] }> {
      const t = text;

      // audit_events insert (returns id)
      if (t.includes("insert into audit_events")) {
        const id = `audit_${audits.length + 1}`;
        const actionIdx = t.includes("action") ? 4 : -1;
        if (actionIdx >= 0 && values[3]) {
          audits.push({
            action: values[3] as string,
            resourceType: values[4] as string,
            resourceId: values[5] as string
          });
        }
        return { rows: [{ id } as unknown as T] };
      }

      // notifications insert
      if (t.includes("insert into notifications")) {
        const notif = {
          id: `notif_${notifications.length + 1}`,
          organizationId: values[0] as string,
          recipientUserId: values[1] as string,
          channel: "in_app" as const,
          subjectKey: values[3] as string,
          bodyKey: values[4] as string,
          payload: {},
          readAt: null,
          createdAt: new Date().toISOString()
        };
        notifications.push({ recipientUserId: notif.recipientUserId, subjectKey: notif.subjectKey, bodyKey: notif.bodyKey, id: notif.id });
        return { rows: [notif as unknown as T] };
      }

      // workflow_definitions insert
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

      // workflow_definitions findById
      if (t.includes("from workflow_definitions") && t.includes("where id = $1")) {
        const [id, orgId] = values as [string, string];
        const found = defs.find((d) => d.id === id && d.organizationId === orgId && !d._deleted);
        return { rows: found ? [found as unknown as T] : [] };
      }

      // workflow_definitions list (active by trigger)
      if (t.includes("from workflow_definitions") && t.includes("trigger_type = $2")) {
        const [orgId, triggerType] = values as [string, string];
        const found = defs.filter((d) => d.organizationId === orgId && d.triggerType === triggerType && d.isActive && !d._deleted);
        return { rows: found as unknown as T[] };
      }

      // workflow_definitions list (general)
      if (t.includes("from workflow_definitions") && !t.includes("workflow_runs")) {
        const [orgId] = values as [string];
        const found = defs.filter((d) => d.organizationId === orgId && !d._deleted);
        return { rows: found as unknown as T[] };
      }

      // workflow_definitions update
      if (t.includes("update workflow_definitions") && t.includes("set")) {
        // Extract id and orgId from the values (last two params)
        const id = values[values.length - 2] as string;
        const orgId = values[values.length - 1] as string;
        const def = defs.find((d) => d.id === id && d.organizationId === orgId && !d._deleted);
        if (!def) return { rows: [] };
        // Apply patches from text/values
        if (t.includes("name = $")) {
          const nameIdx = t.split("$").findIndex((s) => s.startsWith("1") || s.includes("name")) - 1;
          if (values[0] !== undefined) def.name = values[0] as string;
        }
        if (t.includes("is_active = $")) def.isActive = !def.isActive; // simplified toggle
        if (t.includes("is_shared = $")) def.isShared = !def.isShared; // simplified toggle
        def.updatedAt = new Date().toISOString();
        return { rows: [def as unknown as T] };
      }

      // workflow_definitions soft delete
      if (t.includes("update workflow_definitions") && t.includes("deleted_at = now()")) {
        const id = values[0] as string;
        const orgId = values[1] as string;
        const def = defs.find((d) => d.id === id && d.organizationId === orgId && !d._deleted);
        if (!def) return { rows: [] };
        def._deleted = true;
        return { rows: [def as unknown as T] };
      }

      // workflow_runs insert (CTE with ON CONFLICT)
      if (t.includes("insert into workflow_runs")) {
        const run: WorkflowRun = {
          id: `wr_${runs.length + 1}`,
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
        // Idempotency: check for existing run with same def+auditEvent
        if (run.triggerAuditEventId) {
          const existing = runs.find(
            (r) => r.workflowDefinitionId === run.workflowDefinitionId &&
              r.triggerAuditEventId === run.triggerAuditEventId
          );
          if (existing) return { rows: [existing as unknown as T] };
        }
        runs.push(run);
        return { rows: [run as unknown as T] };
      }

      return { rows: [] };
    }
  };

  return { db, defs, runs, audits, notifications };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

const ORG = "org_wf_test";
const USER_A = "user_a";
const USER_B = "user_b";
const tenantA = { organizationId: ORG, actorUserId: USER_A };
const tenantB = { organizationId: ORG, actorUserId: USER_B };

describe("workflow service (DS 5.4)", () => {
  it("createWorkflowDefinition: rejects unknown trigger type", async () => {
    const { db } = makeFakeDb();
    await expect(
      createWorkflowDefinition(db, tenantA, {
        name: "Bad trigger",
        triggerType: "unknown.thing.created",
        actionType: "create_notification",
        actionConfig: { subjectKey: "s", bodyKey: "b" }
      })
    ).rejects.toBeInstanceOf(UnknownWorkflowTriggerError);
  });

  it("createWorkflowDefinition: rejects unknown action type", async () => {
    const { db } = makeFakeDb();
    await expect(
      createWorkflowDefinition(db, tenantA, {
        name: "Bad action",
        triggerType: "project.task.completed",
        actionType: "unknown_action",
        actionConfig: {}
      })
    ).rejects.toBeInstanceOf(UnknownWorkflowActionError);
  });

  it("createWorkflowDefinition: rejects invalid actionConfig (missing subjectKey)", async () => {
    const { db } = makeFakeDb();
    await expect(
      createWorkflowDefinition(db, tenantA, {
        name: "Bad config",
        triggerType: "project.task.completed",
        actionType: "create_notification",
        actionConfig: { bodyKey: "b" } // missing subjectKey
      })
    ).rejects.toBeInstanceOf(InvalidWorkflowConfigError);
  });

  it("createWorkflowDefinition: creates and emits audit event", async () => {
    const { db, defs, audits } = makeFakeDb();
    const created = await createWorkflowDefinition(db, tenantA, {
      name: "Task done notification",
      triggerType: "project.task.completed",
      actionType: "create_notification",
      actionConfig: { subjectKey: "task.done.subject", bodyKey: "task.done.body" }
    });
    expect(created.id).toBeTruthy();
    expect(created.triggerType).toBe("project.task.completed");
    expect(defs.length).toBe(1);
    expect(audits.some((a) => a.action === "workflow.workflow_definition.created")).toBe(true);
  });

  it("updateWorkflowDefinition: not found throws WorkflowNotFoundError", async () => {
    const { db } = makeFakeDb();
    await expect(
      updateWorkflowDefinition(db, tenantA, "nonexistent", { name: "New name" })
    ).rejects.toBeInstanceOf(WorkflowNotFoundError);
  });

  it("updateWorkflowDefinition: shared workflow owner-only 403", async () => {
    const { db, defs } = makeFakeDb();
    // Seed a shared workflow owned by USER_A
    defs.push({
      id: "wf_shared",
      organizationId: ORG,
      ownerUserId: USER_A,
      name: "Shared",
      description: null,
      triggerType: "project.task.completed",
      triggerConfig: {},
      actionType: "create_notification",
      actionConfig: { subjectKey: "s", bodyKey: "b" },
      isActive: true,
      isShared: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    // USER_B tries to update
    await expect(
      updateWorkflowDefinition(db, tenantB, "wf_shared", { name: "Hacked" })
    ).rejects.toBeInstanceOf(WorkflowForbiddenError);
  });

  it("deleteWorkflowDefinition: not found throws WorkflowNotFoundError", async () => {
    const { db } = makeFakeDb();
    await expect(
      deleteWorkflowDefinition(db, tenantA, "nonexistent")
    ).rejects.toBeInstanceOf(WorkflowNotFoundError);
  });

  it("deleteWorkflowDefinition: shared owner-only 403", async () => {
    const { db, defs } = makeFakeDb();
    defs.push({
      id: "wf_to_del",
      organizationId: ORG,
      ownerUserId: USER_A,
      name: "Shared del",
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
    await expect(
      deleteWorkflowDefinition(db, tenantB, "wf_to_del")
    ).rejects.toBeInstanceOf(WorkflowForbiddenError);
  });

  it("listWorkflowDefinitions: returns definitions for org", async () => {
    const { db, defs } = makeFakeDb();
    defs.push({
      id: "wf_list1",
      organizationId: ORG,
      ownerUserId: null,
      name: "List 1",
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
    const items = await listWorkflowDefinitions(db, tenantA);
    expect(items.length).toBe(1);
  });

  it("getWorkflowDefinitionById: returns null for missing", async () => {
    const { db } = makeFakeDb();
    const result = await getWorkflowDefinitionById(db, tenantA, "nonexistent");
    expect(result).toBeNull();
  });

  it("runWorkflowNow: records manual run + creates notification", async () => {
    const { db, defs, runs, notifications } = makeFakeDb();
    defs.push({
      id: "wf_manual",
      organizationId: ORG,
      ownerUserId: USER_A,
      name: "Manual run",
      description: null,
      triggerType: "project.task.completed",
      triggerConfig: {},
      actionType: "create_notification",
      actionConfig: { recipientUserId: USER_A, subjectKey: "task.done.subject", bodyKey: "task.done.body" },
      isActive: true,
      isShared: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    const run = await runWorkflowNow(db, tenantA, "wf_manual");
    expect(run.triggeredBy).toBe("manual");
    expect(run.status).toBe("completed");
    expect(run.createdResourceType).toBe("notification");
    expect(run.createdResourceId).toBeTruthy();
    expect(notifications.length).toBe(1);
  });

  it("runWorkflowNow: not found throws WorkflowNotFoundError", async () => {
    const { db } = makeFakeDb();
    await expect(runWorkflowNow(db, tenantA, "nonexistent")).rejects.toBeInstanceOf(WorkflowNotFoundError);
  });
});
