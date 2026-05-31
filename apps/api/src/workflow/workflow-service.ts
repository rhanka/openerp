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
