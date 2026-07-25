import type {
  WorkflowDefinition,
  WorkflowRun,
  CreateWorkflowDefinitionInput,
  UpdateWorkflowDefinitionInput
} from "@sentropic/openerp-domain/workflow";
import type { Queryable, TenantContext } from "../db/client";
import { assertTenantContext } from "../db/client";

// Repository for WorkflowDefinition and WorkflowRun entities.

const WORKFLOW_DEFINITION_RETURN_COLUMNS = `
  id,
  organization_id as "organizationId",
  owner_user_id as "ownerUserId",
  name,
  description,
  trigger_type as "triggerType",
  trigger_config as "triggerConfig",
  action_type as "actionType",
  action_config as "actionConfig",
  is_active as "isActive",
  is_shared as "isShared",
  to_char(created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "createdAt",
  to_char(updated_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "updatedAt"
`;

const WORKFLOW_RUN_RETURN_COLUMNS = `
  id,
  organization_id as "organizationId",
  workflow_definition_id as "workflowDefinitionId",
  trigger_audit_event_id as "triggerAuditEventId",
  trigger_event_type as "triggerEventType",
  trigger_resource_type as "triggerResourceType",
  trigger_resource_id as "triggerResourceId",
  triggered_by as "triggeredBy",
  status,
  created_resource_type as "createdResourceType",
  created_resource_id as "createdResourceId",
  action_result as "actionResult",
  error_detail as "errorDetail",
  to_char(started_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "startedAt",
  to_char(completed_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "completedAt",
  to_char(created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "createdAt"
`;

// ---------------------------------------------------------------------------
// WorkflowDefinition repository
// ---------------------------------------------------------------------------

export async function insertWorkflowDefinition(
  db: Queryable,
  context: TenantContext,
  input: CreateWorkflowDefinitionInput
): Promise<WorkflowDefinition> {
  assertTenantContext(context);
  const result = await db.query<WorkflowDefinition>(
    `insert into workflow_definitions (
       organization_id, owner_user_id, name, description,
       trigger_type, trigger_config, action_type, action_config,
       is_active, is_shared
     ) values ($1, $2, $3, $4, $5, $6::jsonb, $7, $8::jsonb, $9, $10)
     returning ${WORKFLOW_DEFINITION_RETURN_COLUMNS}`,
    [
      context.organizationId,
      input.ownerUserId ?? null,
      input.name,
      input.description ?? null,
      input.triggerType,
      JSON.stringify(input.triggerConfig ?? {}),
      input.actionType,
      JSON.stringify(input.actionConfig),
      input.isActive ?? true,
      input.isShared ?? false
    ]
  );
  return result.rows[0]!;
}

export async function findWorkflowDefinitionById(
  db: Queryable,
  context: TenantContext,
  id: string
): Promise<WorkflowDefinition | null> {
  assertTenantContext(context);
  const result = await db.query<WorkflowDefinition>(
    `select ${WORKFLOW_DEFINITION_RETURN_COLUMNS}
       from workflow_definitions
      where id = $1
        and organization_id = $2
        and deleted_at is null`,
    [id, context.organizationId]
  );
  return result.rows[0] ?? null;
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
  assertTenantContext(context);
  const conditions: string[] = ["organization_id = $1", "deleted_at is null"];
  const values: unknown[] = [context.organizationId];
  let idx = 2;

  if (options.triggerType !== undefined) {
    conditions.push(`trigger_type = $${idx++}`);
    values.push(options.triggerType);
  }
  if (options.ownerUserId !== undefined) {
    if (options.ownerUserId === null) {
      conditions.push("owner_user_id is null");
    } else {
      conditions.push(`owner_user_id = $${idx++}`);
      values.push(options.ownerUserId);
    }
  }
  if (options.isShared !== undefined) {
    conditions.push(`is_shared = $${idx++}`);
    values.push(options.isShared);
  }
  if (options.isActive !== undefined) {
    conditions.push(`is_active = $${idx++}`);
    values.push(options.isActive);
  }

  const limit = options.limit ?? 100;
  const offset = options.offset ?? 0;
  values.push(limit, offset);

  const result = await db.query<WorkflowDefinition>(
    `select ${WORKFLOW_DEFINITION_RETURN_COLUMNS}
       from workflow_definitions
      where ${conditions.join(" and ")}
      order by created_at desc
      limit $${idx++} offset $${idx++}`,
    values
  );
  return result.rows;
}

export async function listActiveByTrigger(
  db: Queryable,
  context: TenantContext,
  eventType: string
): Promise<WorkflowDefinition[]> {
  assertTenantContext(context);
  const result = await db.query<WorkflowDefinition>(
    `select ${WORKFLOW_DEFINITION_RETURN_COLUMNS}
       from workflow_definitions
      where organization_id = $1
        and trigger_type = $2
        and is_active = true
        and deleted_at is null
      order by created_at asc`,
    [context.organizationId, eventType]
  );
  return result.rows;
}

export async function updateWorkflowDefinitionRepo(
  db: Queryable,
  context: TenantContext,
  id: string,
  patch: UpdateWorkflowDefinitionInput
): Promise<WorkflowDefinition | null> {
  assertTenantContext(context);
  const updates: string[] = ["updated_at = now()"];
  const values: unknown[] = [];
  let idx = 1;

  if (patch.name !== undefined) {
    updates.push(`name = $${idx++}`);
    values.push(patch.name);
  }
  if (patch.description !== undefined) {
    updates.push(`description = $${idx++}`);
    values.push(patch.description);
  }
  if (patch.triggerConfig !== undefined) {
    updates.push(`trigger_config = $${idx++}::jsonb`);
    values.push(JSON.stringify(patch.triggerConfig));
  }
  if (patch.actionConfig !== undefined) {
    updates.push(`action_config = $${idx++}::jsonb`);
    values.push(JSON.stringify(patch.actionConfig));
  }
  if (patch.isActive !== undefined) {
    updates.push(`is_active = $${idx++}`);
    values.push(patch.isActive);
  }
  if (patch.isShared !== undefined) {
    updates.push(`is_shared = $${idx++}`);
    values.push(patch.isShared);
  }

  if (updates.length === 1) {
    // Only updated_at changed — still do the update
  }

  values.push(id, context.organizationId);
  const result = await db.query<WorkflowDefinition>(
    `update workflow_definitions
        set ${updates.join(", ")}
      where id = $${idx++}
        and organization_id = $${idx++}
        and deleted_at is null
     returning ${WORKFLOW_DEFINITION_RETURN_COLUMNS}`,
    values
  );
  return result.rows[0] ?? null;
}

export async function softDeleteWorkflowDefinition(
  db: Queryable,
  context: TenantContext,
  id: string
): Promise<WorkflowDefinition | null> {
  assertTenantContext(context);
  const result = await db.query<WorkflowDefinition>(
    `update workflow_definitions
        set deleted_at = now(), updated_at = now()
      where id = $1
        and organization_id = $2
        and deleted_at is null
     returning ${WORKFLOW_DEFINITION_RETURN_COLUMNS}`,
    [id, context.organizationId]
  );
  return result.rows[0] ?? null;
}

// ---------------------------------------------------------------------------
// WorkflowRun repository
// ---------------------------------------------------------------------------

export interface InsertWorkflowRunInput {
  workflowDefinitionId: string;
  triggerAuditEventId: string | null;
  triggerEventType: string;
  triggerResourceType: string | null;
  triggerResourceId: string | null;
  triggeredBy: "event" | "manual" | "schedule";
  status: "completed" | "failed" | "skipped";
  createdResourceType: string | null;
  createdResourceId: string | null;
  actionResult: Record<string, unknown>;
  errorDetail: string | null;
  startedAt: string | null;
  completedAt: string | null;
}

export async function insertWorkflowRun(
  db: Queryable,
  context: TenantContext,
  input: InsertWorkflowRunInput
): Promise<WorkflowRun> {
  assertTenantContext(context);
  // ON CONFLICT DO NOTHING for idempotency — if the same audit event already
  // triggered this workflow, silently return the existing run.
  // We use a CTE to return the existing row if the insert was skipped.
  const result = await db.query<WorkflowRun>(
    `with inserted as (
       insert into workflow_runs (
         organization_id, workflow_definition_id,
         trigger_audit_event_id, trigger_event_type,
         trigger_resource_type, trigger_resource_id,
         triggered_by, status,
         created_resource_type, created_resource_id,
         action_result, error_detail,
         started_at, completed_at
       ) values ($1, $2, $3, $4, $5, $6::uuid, $7, $8, $9, $10::uuid, $11::jsonb, $12, $13, $14)
       on conflict (workflow_definition_id, trigger_audit_event_id)
       where trigger_audit_event_id is not null
       do nothing
       returning ${WORKFLOW_RUN_RETURN_COLUMNS}
     )
     select * from inserted
     union all
     select ${WORKFLOW_RUN_RETURN_COLUMNS}
       from workflow_runs
      where workflow_definition_id = $2
        and trigger_audit_event_id = $3
        and $3 is not null
        and not exists (select 1 from inserted)
     limit 1`,
    [
      context.organizationId,
      input.workflowDefinitionId,
      input.triggerAuditEventId ?? null,
      input.triggerEventType,
      input.triggerResourceType ?? null,
      input.triggerResourceId ?? null,
      input.triggeredBy,
      input.status,
      input.createdResourceType ?? null,
      input.createdResourceId ?? null,
      JSON.stringify(input.actionResult),
      input.errorDetail ?? null,
      input.startedAt ?? null,
      input.completedAt ?? null
    ]
  );
  return result.rows[0]!;
}

export async function findWorkflowRunById(
  db: Queryable,
  context: TenantContext,
  id: string
): Promise<WorkflowRun | null> {
  assertTenantContext(context);
  const result = await db.query<WorkflowRun>(
    `select ${WORKFLOW_RUN_RETURN_COLUMNS}
       from workflow_runs
      where id = $1
        and organization_id = $2`,
    [id, context.organizationId]
  );
  return result.rows[0] ?? null;
}

export async function listWorkflowRunsByDefinition(
  db: Queryable,
  context: TenantContext,
  workflowDefinitionId: string,
  options: { limit?: number; offset?: number } = {}
): Promise<WorkflowRun[]> {
  assertTenantContext(context);
  const result = await db.query<WorkflowRun>(
    `select ${WORKFLOW_RUN_RETURN_COLUMNS}
       from workflow_runs
      where organization_id = $1
        and workflow_definition_id = $2
      order by created_at desc
      limit $3 offset $4`,
    [
      context.organizationId,
      workflowDefinitionId,
      options.limit ?? 50,
      options.offset ?? 0
    ]
  );
  return result.rows;
}
