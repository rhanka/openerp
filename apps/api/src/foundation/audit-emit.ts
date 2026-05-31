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

  // Invoke the workflow evaluator (if registered) unless we are already inside
  // a workflow action (depth guard prevents cascade re-entrancy).
  const depth = (context as AuditTenantContext).__workflowDepth ?? 0;
  if (_workflowEvaluator !== null && depth < 1) {
    const auditEventId = result.rows[0]?.id;
    if (auditEventId) {
      // Best-effort: swallow all errors so workflow failures never fail the
      // originating mutation.
      try {
        await _workflowEvaluator(db, context, {
          auditEventId,
          action: input.action,
          resourceType: input.resourceType,
          resourceId: input.resourceId
        });
      } catch {
        // Intentionally swallowed — best-effort guarantee.
      }
    }
  }
}
