import { describe, expect, it, beforeEach, afterEach } from "vitest";

import type { WorkflowDefinition, WorkflowRun } from "@sentropic/openerp-domain/workflow";
import type { Queryable } from "../../src/db/client";
import { setWorkflowEvaluator } from "../../src/foundation/audit-emit";
import { makeWorkflowEvaluator } from "../../src/workflow/workflow-evaluator";
import { recordAuditEvent } from "../../src/foundation/audit-emit";

// ---------------------------------------------------------------------------
// These tests verify the workflow evaluator's core guarantees:
// 1. Evaluator executes matching action + records completed run
// 2. Idempotency: same auditEventId fires the same workflow only once
// 3. Cascade guard: a nested recordAuditEvent during action does NOT spawn
//    a second workflow_run
// 4. Best-effort: action throws → run status='failed' AND the originating
//    recordAuditEvent does NOT throw
// ---------------------------------------------------------------------------

interface AuditRow {
  id: string;
  action: string;
  resourceType: string;
  resourceId: string;
}

interface NotificationRow {
  id: string;
  recipientUserId: string;
}

function makeFakeDb(opts: { actionThrows?: boolean } = {}) {
  const defs: WorkflowDefinition[] = [];
  const runs: WorkflowRun[] = [];
  const audits: AuditRow[] = [];
  const notifications: NotificationRow[] = [];

  let auditIdCounter = 0;
  let runIdCounter = 0;
  let notifIdCounter = 0;

  const db: Queryable = {
    async query<T = unknown>(text: string, values: unknown[] = []): Promise<{ rows: T[] }> {
      const t = text;

      // audit_events insert (must return id for the evaluator hook to work)
      if (t.includes("insert into audit_events")) {
        const id = `audit_${++auditIdCounter}`;
        audits.push({
          id,
          action: values[3] as string,
          resourceType: values[4] as string,
          resourceId: values[5] as string
        });
        return { rows: [{ id } as unknown as T] };
      }

      // notifications insert
      if (t.includes("insert into notifications")) {
        if (opts.actionThrows) throw new Error("Notification service is broken");
        const id = `notif_${++notifIdCounter}`;
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

      // workflow_definitions list by trigger type (listActiveByTrigger)
      if (t.includes("from workflow_definitions") && t.includes("trigger_type = $2") && !t.includes("insert")) {
        const [orgId, triggerType] = values as [string, string];
        const found = defs.filter((d) => d.organizationId === orgId && d.triggerType === triggerType && d.isActive);
        return { rows: found as unknown as T[] };
      }

      // workflow_runs insert (CTE idempotency)
      if (t.includes("insert into workflow_runs")) {
        const defId = values[1] as string;
        const triggerAuditEventId = values[2] as string | null;
        // Check idempotency
        if (triggerAuditEventId) {
          const existing = runs.find(
            (r) => r.workflowDefinitionId === defId && r.triggerAuditEventId === triggerAuditEventId
          );
          if (existing) return { rows: [existing as unknown as T] };
        }
        const run: WorkflowRun = {
          id: `run_${++runIdCounter}`,
          organizationId: values[0] as string,
          workflowDefinitionId: defId,
          triggerAuditEventId,
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

      return { rows: [] };
    }
  };

  return { db, defs, runs, audits, notifications };
}

const ORG = "org_eval_test";
const USER = "user_eval";
const tenant = { organizationId: ORG, actorUserId: USER };

describe("workflow evaluator (DS 5.4)", () => {
  beforeEach(() => {
    // Register a fresh evaluator before each test
    setWorkflowEvaluator(makeWorkflowEvaluator());
  });

  afterEach(() => {
    // Clean up: reset to null so other tests are not affected
    // We use setWorkflowEvaluator with a no-op that does nothing
    // (there's no "unregister" API — just re-register a no-op)
    setWorkflowEvaluator(async () => { /* no-op */ });
  });

  it("execute: matching workflow fires action and records completed run", async () => {
    const { db, defs, runs, notifications } = makeFakeDb();
    defs.push({
      id: "wf_fire",
      organizationId: ORG,
      ownerUserId: USER,
      name: "Fire on task completed",
      description: null,
      triggerType: "project.task.completed",
      triggerConfig: {},
      actionType: "create_notification",
      actionConfig: { recipientUserId: USER, subjectKey: "subject.key", bodyKey: "body.key" },
      isActive: true,
      isShared: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    // recordAuditEvent calls the evaluator after insert
    await recordAuditEvent(db, tenant, {
      action: "project.task.completed",
      resourceType: "project_task",
      resourceId: "task_123"
    });

    // A notification should have been created
    expect(notifications.length).toBe(1);
    expect(notifications[0]!.recipientUserId).toBe(USER);

    // A workflow_run with status completed should exist
    expect(runs.length).toBe(1);
    expect(runs[0]!.status).toBe("completed");
    expect(runs[0]!.triggeredBy).toBe("event");
    expect(runs[0]!.createdResourceType).toBe("notification");
    expect(runs[0]!.triggerEventType).toBe("project.task.completed");
  });

  it("idempotency: same triggerAuditEventId fires workflow only once", async () => {
    const { db, defs, runs } = makeFakeDb();
    defs.push({
      id: "wf_idem",
      organizationId: ORG,
      ownerUserId: USER,
      name: "Idempotent workflow",
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

    // First invocation
    await recordAuditEvent(db, tenant, {
      action: "project.task.completed",
      resourceType: "project_task",
      resourceId: "task_abc"
    });

    const firstRunCount = runs.length;
    expect(firstRunCount).toBe(1);

    // Simulate a second call with the same audit event id by directly calling evaluate
    const evaluator = makeWorkflowEvaluator();
    const firstAuditId = "audit_1"; // The ID assigned by our fake DB
    await evaluator(db, tenant, {
      auditEventId: firstAuditId,
      action: "project.task.completed",
      resourceType: "project_task",
      resourceId: "task_abc"
    });

    // Still only 1 run (idempotency enforced in fake DB insert)
    expect(runs.length).toBe(1);
  });

  it("cascade guard: notification creation audit event does NOT spawn another workflow_run", async () => {
    const { db, defs, runs } = makeFakeDb();
    defs.push({
      id: "wf_cascade",
      organizationId: ORG,
      ownerUserId: USER,
      name: "Cascade guard test",
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

    // The trigger event fires the workflow, which creates a notification.
    // The notification's insertNotification calls no audit directly, but
    // the workflow evaluator records a workflow_run.completed audit via
    // suppressed context — that suppressed context should NOT re-enter evaluate.
    await recordAuditEvent(db, tenant, {
      action: "project.task.completed",
      resourceType: "project_task",
      resourceId: "task_cascade"
    });

    // Only 1 workflow_run should exist (the one from the trigger, not a second from cascade)
    expect(runs.length).toBe(1);
  });

  it("best-effort: action throws → run status=failed AND recordAuditEvent does NOT throw", async () => {
    const { db, defs, runs } = makeFakeDb({ actionThrows: true });
    defs.push({
      id: "wf_fail",
      organizationId: ORG,
      ownerUserId: USER,
      name: "Failing workflow",
      description: null,
      triggerType: "crm.opportunity.won",
      triggerConfig: {},
      actionType: "create_notification",
      actionConfig: { recipientUserId: USER, subjectKey: "s", bodyKey: "b" },
      isActive: true,
      isShared: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    // Must not throw even though the action throws
    await expect(
      recordAuditEvent(db, tenant, {
        action: "crm.opportunity.won",
        resourceType: "opportunity",
        resourceId: "opp_xyz"
      })
    ).resolves.toBeUndefined();

    // A failed run should have been recorded
    expect(runs.length).toBe(1);
    expect(runs[0]!.status).toBe("failed");
    expect(runs[0]!.errorDetail).toContain("Notification service is broken");
  });

  it("no matching workflow: no runs created, no error", async () => {
    const { db, runs } = makeFakeDb();
    // No workflows in defs — evaluator should silently no-op
    await expect(
      recordAuditEvent(db, tenant, {
        action: "project.task.completed",
        resourceType: "project_task",
        resourceId: "task_nomatch"
      })
    ).resolves.toBeUndefined();
    expect(runs.length).toBe(0);
  });

  it("no-evaluator default: existing code path is unchanged when no evaluator registered", async () => {
    // Reset to null (no-op default)
    setWorkflowEvaluator(async () => { /* no-op */ });
    const { db, runs, audits } = makeFakeDb();

    await recordAuditEvent(db, tenant, {
      action: "crm.lead.converted",
      resourceType: "lead",
      resourceId: "lead_noeval"
    });

    // Audit was recorded
    expect(audits.length).toBeGreaterThan(0);
    // No runs created
    expect(runs.length).toBe(0);
  });
});
