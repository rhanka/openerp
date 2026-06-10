import type {
  WorkflowDefinition,
  WorkflowRun,
  CreateWorkflowDefinitionInput,
  UpdateWorkflowDefinitionInput
} from "@sentropic/openerp-domain/workflow";
import type { Queryable, TenantContext } from "../db/client";
import { assertTenantContext } from "../db/client";
import { recordAuditEvent } from "../foundation/audit-emit";
import { TRIGGER_TYPE_SET, ACTION_TYPE_SET, getActionEntry } from "./workflow-catalog";
import {
  insertWorkflowDefinition,
  findWorkflowDefinitionById,
  listWorkflowDefinitions as listWorkflowDefinitionsRepo,
  updateWorkflowDefinitionRepo,
  softDeleteWorkflowDefinition,
  insertWorkflowRun,
  findWorkflowRunById as findWorkflowRunByIdRepo,
  listWorkflowRunsByDefinition
} from "./workflow-definitions";

// ---------------------------------------------------------------------------
// Error types
// ---------------------------------------------------------------------------

export class WorkflowNotFoundError extends Error {
  readonly code = "WORKFLOW_NOT_FOUND";
  constructor(id: string) {
    super(`WorkflowDefinition ${id} not found`);
  }
}

export class UnknownWorkflowTriggerError extends Error {
  readonly code = "UNKNOWN_WORKFLOW_TRIGGER";
  constructor(triggerType: string) {
    super(`Unknown workflow trigger type: ${triggerType}`);
  }
}

export class UnknownWorkflowActionError extends Error {
  readonly code = "UNKNOWN_WORKFLOW_ACTION";
  constructor(actionType: string) {
    super(`Unknown workflow action type: ${actionType}`);
  }
}

export class InvalidWorkflowConfigError extends Error {
  readonly code = "INVALID_WORKFLOW_CONFIG";
  constructor(message: string) {
    super(message);
  }
}

export class WorkflowForbiddenError extends Error {
  readonly code = "FORBIDDEN";
  constructor(message = "Access denied") {
    super(message);
  }
}

// ---------------------------------------------------------------------------
// Ownership enforcement
// A shared WorkflowDefinition may only be mutated by its owner.
// ---------------------------------------------------------------------------

function enforceOwnership(def: WorkflowDefinition, context: TenantContext): void {
  if (def.isShared && def.ownerUserId !== null && def.ownerUserId !== context.actorUserId) {
    throw new WorkflowForbiddenError(
      `Only the owner of shared WorkflowDefinition ${def.id} may modify it`
    );
  }
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

function validateCatalog(input: { triggerType: string; actionType: string; actionConfig: Record<string, unknown> }): void {
  if (!TRIGGER_TYPE_SET.has(input.triggerType)) {
    throw new UnknownWorkflowTriggerError(input.triggerType);
  }
  if (!ACTION_TYPE_SET.has(input.actionType)) {
    throw new UnknownWorkflowActionError(input.actionType);
  }
  const actionEntry = getActionEntry(input.actionType);
  if (actionEntry) {
    const error = actionEntry.validateConfig(input.actionConfig);
    if (error) {
      throw new InvalidWorkflowConfigError(error);
    }
  }
}

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

export async function createWorkflowDefinition(
  db: Queryable,
  context: TenantContext,
  input: CreateWorkflowDefinitionInput
): Promise<WorkflowDefinition> {
  assertTenantContext(context);
  validateCatalog({
    triggerType: input.triggerType,
    actionType: input.actionType,
    actionConfig: input.actionConfig
  });
  const created = await insertWorkflowDefinition(db, context, input);
  await recordAuditEvent(db, context, {
    action: "workflow.workflow_definition.created",
    resourceType: "workflow_definition",
    resourceId: created.id,
    afterSummary: {
      name: created.name,
      triggerType: created.triggerType,
      actionType: created.actionType,
      isActive: created.isActive,
      isShared: created.isShared
    }
  });
  return created;
}

export async function updateWorkflowDefinition(
  db: Queryable,
  context: TenantContext,
  id: string,
  patch: UpdateWorkflowDefinitionInput
): Promise<WorkflowDefinition> {
  assertTenantContext(context);
  const before = await findWorkflowDefinitionById(db, context, id);
  if (!before) throw new WorkflowNotFoundError(id);
  enforceOwnership(before, context);
  if (patch.actionConfig !== undefined) {
    const actionEntry = getActionEntry(before.actionType);
    if (actionEntry) {
      const error = actionEntry.validateConfig(patch.actionConfig);
      if (error) throw new InvalidWorkflowConfigError(error);
    }
  }
  const updated = await updateWorkflowDefinitionRepo(db, context, id, patch);
  if (!updated) throw new WorkflowNotFoundError(id);
  await recordAuditEvent(db, context, {
    action: "workflow.workflow_definition.updated",
    resourceType: "workflow_definition",
    resourceId: updated.id,
    beforeSummary: { name: before.name, isActive: before.isActive, isShared: before.isShared },
    afterSummary: { name: updated.name, isActive: updated.isActive, isShared: updated.isShared }
  });
  return updated;
}

export async function deleteWorkflowDefinition(
  db: Queryable,
  context: TenantContext,
  id: string
): Promise<void> {
  assertTenantContext(context);
  const before = await findWorkflowDefinitionById(db, context, id);
  if (!before) throw new WorkflowNotFoundError(id);
  enforceOwnership(before, context);
  const deleted = await softDeleteWorkflowDefinition(db, context, id);
  if (!deleted) throw new WorkflowNotFoundError(id);
  await recordAuditEvent(db, context, {
    action: "workflow.workflow_definition.deleted",
    resourceType: "workflow_definition",
    resourceId: id,
    beforeSummary: { name: before.name, triggerType: before.triggerType, actionType: before.actionType }
  });
}

export async function getWorkflowDefinitionById(
  db: Queryable,
  context: TenantContext,
  id: string
): Promise<WorkflowDefinition | null> {
  return findWorkflowDefinitionById(db, context, id);
}

export async function listWorkflowDefinitions(
  db: Queryable,
  context: TenantContext,
  options: {
    triggerType?: string;
    ownerUserId?: string | null;
    isShared?: boolean;
    isActive?: boolean;
    limit?: number;
    offset?: number;
  } = {}
): Promise<WorkflowDefinition[]> {
  return listWorkflowDefinitionsRepo(db, context, options);
}

export async function getWorkflowRunById(
  db: Queryable,
  context: TenantContext,
  id: string
): Promise<WorkflowRun | null> {
  return findWorkflowRunByIdRepo(db, context, id);
}

export async function listWorkflowRuns(
  db: Queryable,
  context: TenantContext,
  workflowDefinitionId: string,
  options: { limit?: number; offset?: number } = {}
): Promise<WorkflowRun[]> {
  // Verify the definition exists and belongs to this org
  const def = await findWorkflowDefinitionById(db, context, workflowDefinitionId);
  if (!def) throw new WorkflowNotFoundError(workflowDefinitionId);
  return listWorkflowRunsByDefinition(db, context, workflowDefinitionId, options);
}

// ---------------------------------------------------------------------------
// Scheduled run — worker tick entry point
// ---------------------------------------------------------------------------

/**
 * Run all due scheduled workflow definitions for a tenant.
 *
 * Selects workflow_definitions rows where cadence IS NOT NULL and
 * next_run_at <= asOf, locks them with FOR UPDATE SKIP LOCKED (up to 100
 * at a time) so concurrent workers never double-fire the same workflow.
 *
 * Cadence formula: after a successful execution, next_run_at is advanced by
 * 1 day as a safe placeholder. A future slice (A0-5) will replace this with
 * proper cron/calendar arithmetic matching the cadence field value. Using
 * a fixed +1 day means overdue workflows are retried at most once per day
 * rather than spinning indefinitely, which is the safe failure mode.
 *
 * Returns { processed, succeeded, failed, skipped, asOf }.
 */
export async function runDueScheduledWorkflows(
  db: Queryable,
  tenant: TenantContext,
  asOf?: Date
): Promise<{ processed: number; succeeded: number; failed: number; skipped: number; asOf: Date }> {
  assertTenantContext(tenant);
  const now = asOf ?? new Date();

  // SELECT due workflows with advisory row lock — skip any locked by peer workers.
  const dueResult = await db.query<{
    id: string;
    triggerType: string;
    actionType: string;
    actionConfig: Record<string, unknown>;
  }>(
    `select id,
            trigger_type  as "triggerType",
            action_type   as "actionType",
            action_config as "actionConfig"
       from workflow_definitions
      where organization_id = $1
        and cadence is not null
        and next_run_at <= $2
        and is_active = true
        and deleted_at is null
      order by next_run_at asc
      limit 100
      for update skip locked`,
    [tenant.organizationId, now.toISOString()]
  );

  const defs = dueResult.rows;
  let processed = 0;
  let succeeded = 0;
  let failed = 0;
  const skipped = 0;

  for (const def of defs) {
    processed += 1;
    const startedAt = new Date().toISOString();

    const actionEntry = getActionEntry(def.actionType);
    if (!actionEntry) {
      // Unknown action — mark failed and advance schedule so it doesn't block.
      failed += 1;
      await db.query(
        `update workflow_definitions
            set last_run_at  = $1,
                next_run_at  = $1::timestamptz + interval '1 day',
                updated_at   = now()
          where id = $2
            and organization_id = $3`,
        [now.toISOString(), def.id, tenant.organizationId]
      );
      continue;
    }

    try {
      const result = await actionEntry.execute(db, tenant, {
        eventType: def.triggerType,
        resourceType: null,
        resourceId: null
      }, def.actionConfig);
      const completedAt = new Date().toISOString();
      await insertWorkflowRun(db, tenant, {
        workflowDefinitionId: def.id,
        triggerAuditEventId: null,
        triggerEventType: def.triggerType,
        triggerResourceType: null,
        triggerResourceId: null,
        triggeredBy: "schedule",
        status: "completed",
        createdResourceType: result.createdResourceType,
        createdResourceId: result.createdResourceId,
        actionResult: result.result,
        errorDetail: null,
        startedAt,
        completedAt
      });
      succeeded += 1;
    } catch (err) {
      const completedAt = new Date().toISOString();
      const errorDetail = err instanceof Error ? err.message : String(err);
      // eslint-disable-next-line no-console
      console.error(`[workflow-scheduler] def ${def.id} failed: ${errorDetail}`);
      try {
        await insertWorkflowRun(db, tenant, {
          workflowDefinitionId: def.id,
          triggerAuditEventId: null,
          triggerEventType: def.triggerType,
          triggerResourceType: null,
          triggerResourceId: null,
          triggeredBy: "schedule",
          status: "failed",
          createdResourceType: null,
          createdResourceId: null,
          actionResult: {},
          errorDetail,
          startedAt,
          completedAt
        });
      } catch {
        // best-effort insert
      }
      failed += 1;
    }

    // Advance schedule: placeholder +1 day. A0-5 will implement proper cadence math.
    await db.query(
      `update workflow_definitions
          set last_run_at  = $1,
              next_run_at  = $1::timestamptz + interval '1 day',
              updated_at   = now()
        where id = $2
          and organization_id = $3`,
      [now.toISOString(), def.id, tenant.organizationId]
    );
  }

  return { processed, succeeded, failed, skipped, asOf: now };
}

// ---------------------------------------------------------------------------
// Manual run
// ---------------------------------------------------------------------------

export async function runWorkflowNow(
  db: Queryable,
  context: TenantContext,
  id: string
): Promise<WorkflowRun> {
  assertTenantContext(context);
  const def = await findWorkflowDefinitionById(db, context, id);
  if (!def) throw new WorkflowNotFoundError(id);

  const actionEntry = getActionEntry(def.actionType);
  if (!actionEntry) throw new UnknownWorkflowActionError(def.actionType);

  const startedAt = new Date().toISOString();

  try {
    const result = await actionEntry.execute(db, context, {
      eventType: def.triggerType,
      resourceType: null,
      resourceId: null
    }, def.actionConfig);
    const completedAt = new Date().toISOString();
    const run = await insertWorkflowRun(db, context, {
      workflowDefinitionId: def.id,
      triggerAuditEventId: null,
      triggerEventType: def.triggerType,
      triggerResourceType: null,
      triggerResourceId: null,
      triggeredBy: "manual",
      status: "completed",
      createdResourceType: result.createdResourceType,
      createdResourceId: result.createdResourceId,
      actionResult: result.result,
      errorDetail: null,
      startedAt,
      completedAt
    });
    await recordAuditEvent(db, context, {
      action: "workflow.workflow_run.completed",
      resourceType: "workflow_run",
      resourceId: run.id,
      afterSummary: {
        workflowDefinitionId: def.id,
        triggeredBy: "manual",
        createdResourceType: result.createdResourceType,
        createdResourceId: result.createdResourceId
      }
    });
    return run;
  } catch (err) {
    const completedAt = new Date().toISOString();
    const errorDetail = err instanceof Error ? err.message : String(err);
    const run = await insertWorkflowRun(db, context, {
      workflowDefinitionId: def.id,
      triggerAuditEventId: null,
      triggerEventType: def.triggerType,
      triggerResourceType: null,
      triggerResourceId: null,
      triggeredBy: "manual",
      status: "failed",
      createdResourceType: null,
      createdResourceId: null,
      actionResult: {},
      errorDetail,
      startedAt,
      completedAt
    });
    await recordAuditEvent(db, context, {
      action: "workflow.workflow_run.failed",
      resourceType: "workflow_run",
      resourceId: run.id,
      afterSummary: {
        workflowDefinitionId: def.id,
        triggeredBy: "manual",
        errorDetail
      }
    });
    return run;
  }
}
