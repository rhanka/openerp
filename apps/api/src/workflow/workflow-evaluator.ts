import type { Queryable, TenantContext } from "../db/client";
import type { WorkflowEvaluatorFn, WorkflowTriggerPayload, AuditTenantContext } from "../foundation/audit-emit";
import { recordAuditEvent } from "../foundation/audit-emit";
import { listActiveByTrigger, insertWorkflowRun } from "./workflow-definitions";
import { getActionEntry } from "./workflow-catalog";

// ---------------------------------------------------------------------------
// makeWorkflowEvaluator — returns the evaluator function to register via
// setWorkflowEvaluator() in audit-emit.ts at buildApp startup.
//
// This module MUST NOT be imported by foundation code. The dependency direction
// is: foundation→registration-hook (no import), workflow→foundation.
//
// Guards implemented here:
// 1. BEST-EFFORT — entire evaluate body is wrapped try/catch; errors swallowed.
// 2. RE-ENTRANCY/CASCADE GUARD — suppressed context (__workflowDepth = 1) is
//    passed to action execution so actions' own audit events don't re-enter.
// 3. IDEMPOTENCY — insertWorkflowRun uses ON CONFLICT DO NOTHING per
//    (workflow_definition_id, trigger_audit_event_id).
// 4. AUDIT — each run records the created resource (type+id).
// ---------------------------------------------------------------------------

export function makeWorkflowEvaluator(): WorkflowEvaluatorFn {
  return async function evaluate(
    db: Queryable,
    context: TenantContext,
    payload: WorkflowTriggerPayload
  ): Promise<void> {
    // Build a suppressed context so action execution does not re-enter the evaluator.
    const suppressedContext: AuditTenantContext = {
      ...context,
      __workflowDepth: 1
    };

    // Outer try/catch: best-effort guarantee — never throws to caller.
    try {
      // Find all active workflows matching this trigger type.
      const definitions = await listActiveByTrigger(db, context, payload.action);

      for (const def of definitions) {
        const actionEntry = getActionEntry(def.actionType);
        if (!actionEntry) {
          // Unknown action — record failed run and continue.
          await safeInsertFailedRun(db, context, suppressedContext, def.id, payload, "Unknown action type: " + def.actionType);
          continue;
        }

        const startedAt = new Date().toISOString();

        try {
          const result = await actionEntry.execute(
            db,
            suppressedContext,
            {
              eventType: payload.action,
              resourceType: payload.resourceType,
              resourceId: payload.resourceId
            },
            def.actionConfig
          );
          const completedAt = new Date().toISOString();

          const run = await insertWorkflowRun(db, context, {
            workflowDefinitionId: def.id,
            triggerAuditEventId: payload.auditEventId,
            triggerEventType: payload.action,
            triggerResourceType: payload.resourceType,
            triggerResourceId: payload.resourceId,
            triggeredBy: "event",
            status: "completed",
            createdResourceType: result.createdResourceType,
            createdResourceId: result.createdResourceId,
            actionResult: result.result,
            errorDetail: null,
            startedAt,
            completedAt
          });

          // Emit the workflow_run.completed audit event using suppressed context
          // so it does NOT trigger further workflow evaluation.
          try {
            await recordAuditEvent(db, suppressedContext, {
              action: "workflow.workflow_run.completed",
              resourceType: "workflow_run",
              resourceId: run.id,
              afterSummary: {
                workflowDefinitionId: def.id,
                triggeredBy: "event",
                triggerAuditEventId: payload.auditEventId,
                createdResourceType: result.createdResourceType,
                createdResourceId: result.createdResourceId
              }
            });
          } catch {
            // Best-effort audit — do not propagate.
          }
        } catch (actionErr) {
          // Action failed — record a failed run and continue to the next definition.
          const errorDetail = actionErr instanceof Error ? actionErr.message : String(actionErr);
          await safeInsertFailedRun(
            db, context, suppressedContext, def.id, payload, errorDetail
          );
        }
      }
    } catch {
      // Outer best-effort guard — swallow all errors.
    }
  };
}

async function safeInsertFailedRun(
  db: Queryable,
  context: TenantContext,
  suppressedContext: AuditTenantContext,
  workflowDefinitionId: string,
  payload: WorkflowTriggerPayload,
  errorDetail: string
): Promise<void> {
  try {
    const now = new Date().toISOString();
    const run = await insertWorkflowRun(db, context, {
      workflowDefinitionId,
      triggerAuditEventId: payload.auditEventId,
      triggerEventType: payload.action,
      triggerResourceType: payload.resourceType,
      triggerResourceId: payload.resourceId,
      triggeredBy: "event",
      status: "failed",
      createdResourceType: null,
      createdResourceId: null,
      actionResult: {},
      errorDetail,
      startedAt: now,
      completedAt: now
    });
    try {
      await recordAuditEvent(db, suppressedContext, {
        action: "workflow.workflow_run.failed",
        resourceType: "workflow_run",
        resourceId: run.id,
        afterSummary: {
          workflowDefinitionId,
          triggeredBy: "event",
          errorDetail
        }
      });
    } catch {
      // Best-effort.
    }
  } catch {
    // Best-effort — do not propagate.
  }
}
