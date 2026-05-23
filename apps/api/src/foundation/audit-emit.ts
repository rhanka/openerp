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
  await db.query(
    `insert into audit_events (${columns.join(", ")}) values (${placeholders.join(", ")})`,
    values
  );
}
