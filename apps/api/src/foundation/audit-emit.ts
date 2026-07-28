import type { Queryable, TenantContext } from "../db/client";
import { assertTenantContext } from "../db/client";

// Shared audit emission helper. Centralizes the dynamic INSERT into the
// partitioned audit_events table so every service uses identical column
// resolution and the canon Article 2.2 optional referents (correlation_id,
// approval_request_id, agent_* and RFC 8693 columns) can be populated without
// duplicating SQL.

export type AuditActorType = "human" | "agent" | "system" | "user";
export type AuditSource = "human" | "agent" | "system";

export interface RecordAuditEventInput {
  action: string;
  resourceType: string;
  resourceId: string;
  beforeSummary?: Record<string, unknown> | null;
  afterSummary?: Record<string, unknown> | null;
  /** Defaults to "user" for HTTP-driven flows. */
  actorType?: AuditActorType;
  // Canon Article 2.2 — nullable referents. Provide as null/undefined to skip.
  correlationId?: string | null;
  approvalRequestId?: string | null;
  idempotencyRecordId?: string | null;
  agentId?: string | null;
  agentRunId?: string | null;
  toolCallId?: string | null;
  policyDecisionId?: string | null;
  delegationId?: string | null;
  source?: AuditSource | null;
  actingPrincipal?: string | null;
  onBehalfOf?: string | null;
}

/**
 * Authentication happens before a tenant and a human actor have been selected.
 * Those events must be explicit system records, rather than forged tenant rows.
 */
export interface RecordSystemAuditEventInput {
  action: string;
  resourceType: string;
  resourceId: string;
  afterSummary?: Record<string, unknown> | null;
}

// ---------------------------------------------------------------------------
// Workflow evaluator registration.
//
// CRITICAL layering rule: audit-emit.ts must NOT import the workflow module
// (that would be a foundation→feature dependency cycle). Instead we use a
// registration pattern: the workflow module registers its evaluator at startup
// via setWorkflowEvaluator(); the default is null (no-op) so all unit tests
// that don't go through buildApp keep unmodified behaviour.
//
// The evaluator receives the inserted audit event id so it can write
// workflow_runs with a foreign-key reference to the originating event.
//
// Suppression: the context may carry __workflowDepth to signal that we are
// already inside a workflow action. When depth >= 1, the evaluator is not
// called, preventing cascade re-entrancy.
// ---------------------------------------------------------------------------

export interface WorkflowTriggerPayload {
  auditEventId: string;
  action: string;
  resourceType: string;
  resourceId: string;
}

export type WorkflowEvaluatorFn = (
  db: Queryable,
  context: TenantContext,
  payload: WorkflowTriggerPayload
) => Promise<void>;

let _workflowEvaluator: WorkflowEvaluatorFn | null = null;

export function setWorkflowEvaluator(fn: WorkflowEvaluatorFn): void {
  _workflowEvaluator = fn;
}

// ---------------------------------------------------------------------------
// Webhook evaluator registration.
//
// Mirror of the workflow evaluator pattern. audit-emit.ts must NOT import the
// webhook module (foundation→feature cycle). The webhook module registers its
// evaluator at buildApp startup via setWebhookEvaluator(); the default is null
// (no-op) so all tests that don't go through buildApp keep unmodified behaviour.
//
// Suppression: same depth guard as the workflow evaluator — when depth >= 1,
// the webhook evaluator is also not called (prevents cascade fan-out from
// workflow actions' own audit events).
// ---------------------------------------------------------------------------

export type WebhookTriggerPayload = WorkflowTriggerPayload;

export type WebhookEvaluatorFn = (
  db: Queryable,
  context: TenantContext,
  payload: WebhookTriggerPayload
) => Promise<void>;

let _webhookEvaluator: WebhookEvaluatorFn | null = null;

export function setWebhookEvaluator(fn: WebhookEvaluatorFn): void {
  _webhookEvaluator = fn;
}

// ---------------------------------------------------------------------------
// Extended TenantContext with workflow suppression marker.
// We extend the base TenantContext with an optional depth counter so that
// workflow actions can pass a "suppressed" context that prevents re-entrancy.
// ---------------------------------------------------------------------------

export interface AuditTenantContext extends TenantContext {
  /** Set to 1+ inside workflow action execution to suppress nested evaluation. */
  __workflowDepth?: number;
}

export async function recordAuditEvent(
  db: Queryable,
  context: TenantContext,
  input: RecordAuditEventInput
): Promise<void> {
  assertTenantContext(context);

  const columns: string[] = [
    "organization_id",
    "actor_user_id",
    "actor_type",
    "action",
    "resource_type",
    "resource_id",
    "before_summary",
    "after_summary"
  ];
  const values: unknown[] = [
    context.organizationId,
    context.actorUserId,
    input.actorType ?? "user",
    input.action,
    input.resourceType,
    input.resourceId,
    input.beforeSummary ?? null,
    input.afterSummary ?? null
  ];

  const optional: Array<[string, unknown]> = [
    ["correlation_id", input.correlationId],
    ["approval_request_id", input.approvalRequestId],
    ["idempotency_record_id", input.idempotencyRecordId],
    ["agent_id", input.agentId],
    ["agent_run_id", input.agentRunId],
    ["tool_call_id", input.toolCallId],
    ["policy_decision_id", input.policyDecisionId],
    ["delegation_id", input.delegationId],
    ["source", input.source],
    ["acting_principal", input.actingPrincipal],
    ["on_behalf_of", input.onBehalfOf]
  ];
  for (const [col, val] of optional) {
    if (val !== undefined && val !== null) {
      columns.push(col);
      values.push(val);
    }
  }

  const placeholders = values.map((_, i) => `$${i + 1}`);
  const result = await db.query<{ id: string }>(
    `insert into audit_events (${columns.join(", ")}) values (${placeholders.join(", ")}) returning id`,
    values
  );

  // Invoke evaluators (if registered) unless we are already inside a workflow
  // action (depth guard prevents cascade re-entrancy for both evaluators).
  const depth = (context as AuditTenantContext).__workflowDepth ?? 0;
  if (depth < 1) {
    const auditEventId = result.rows[0]?.id;
    if (auditEventId) {
      const triggerPayload = {
        auditEventId,
        action: input.action,
        resourceType: input.resourceType,
        resourceId: input.resourceId
      };

      if (_workflowEvaluator !== null) {
        // Best-effort: swallow all errors so workflow failures never fail the
        // originating mutation.
        try {
          await _workflowEvaluator(db, context, triggerPayload);
        } catch {
          // Intentionally swallowed — best-effort guarantee.
        }
      }

      if (_webhookEvaluator !== null) {
        // Best-effort: swallow all errors so webhook failures never fail the
        // originating mutation.
        try {
          await _webhookEvaluator(db, context, triggerPayload);
        } catch {
          // Intentionally swallowed — best-effort guarantee.
        }
      }
    }
  }
}

/**
 * Append a non-tenant system event. The auth migration exposes a narrow
 * SECURITY DEFINER function for this representation, so regular app-role
 * table access remains tenant-scoped and failures stay observable.
 */
export async function recordSystemAuditEvent(
  db: Queryable,
  input: RecordSystemAuditEventInput
): Promise<void> {
  await db.query<{ id: string }>(
    `select auth_system_audit_record($1, $2, $3, $4::jsonb) as id`,
    [
      input.action,
      input.resourceType,
      input.resourceId,
      JSON.stringify(input.afterSummary ?? null)
    ]
  );
}
