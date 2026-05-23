import { randomUUID } from "node:crypto";
import {
  appendJournalEntry,
  createJournalEntry,
  type H2AEnvelopeType,
  type H2AJournalEntry,
  type H2AJournalPayload,
  type H2ASignature
} from "@sentropic/h2a";

import type { Queryable, TenantContext } from "../db/client";
import {
  readAuditSigningConfig,
  signJournalPayload,
  type AuditSigningConfig
} from "./audit-signing";

// h2a bridge for ApprovalRequest (Lot 5 minimal). Maps OpenERP approval state
// transitions to @sentropic/h2a envelope types and journal entries chained by
// prevHash / contentHash. Stored inside audit_events.after_summary jsonb so
// the existing append-only audit table doubles as the h2a journal substrate.
// No ed25519 signing yet — A4 deferred.

export type ApprovalAction = "created" | "approved" | "rejected" | "escalated" | "expired";

export function approvalActionToEnvelopeType(action: ApprovalAction): H2AEnvelopeType {
  switch (action) {
    case "created":
      return "propose";
    case "approved":
      return "accept";
    case "rejected":
      return "reject";
    case "escalated":
      return "escalate";
    case "expired":
      return "event";
  }
}

export interface ApprovalJournalBody {
  approvalRequestId: string;
  action: ApprovalAction;
  status: string;
  reason?: string | null;
  subject?: { type: string; id: string };
}

interface BuildJournalEntryInput {
  approvalRequestId: string;
  actorInstance: string;
  action: ApprovalAction;
  body: ApprovalJournalBody;
  // Optional override; when omitted, falls back to readAuditSigningConfig() so
  // tests and runtime can both rely on env-driven signing.
  signing?: AuditSigningConfig | null;
}

export async function buildApprovalJournalEntry(
  db: Queryable,
  context: TenantContext,
  input: BuildJournalEntryInput
): Promise<H2AJournalEntry<ApprovalJournalBody>> {
  const payload: H2AJournalPayload<ApprovalJournalBody> = {
    id: randomUUID(),
    type: approvalActionToEnvelopeType(input.action),
    actor: {
      instance: input.actorInstance,
      role: input.action === "created" ? "PRINCIPAL" : "EXECUTIF",
      scope: `org:${context.organizationId}`
    },
    artifactKind: "ENGAGEMENT",
    engagementId: input.approvalRequestId,
    correlationId: input.approvalRequestId,
    body: input.body,
    createdAt: new Date().toISOString()
  };

  const signing = input.signing === undefined ? readAuditSigningConfig() : input.signing;
  let signedPayload: H2AJournalPayload<ApprovalJournalBody> = payload;
  if (signing) {
    const signature: H2ASignature = signJournalPayload({
      payloadWithoutSignatures: payload as unknown as Record<string, unknown>,
      signing
    });
    signedPayload = { ...payload, signatures: [signature] };
  }

  const prev = await findPreviousJournalEntry(db, context, input.approvalRequestId);
  return prev ? appendJournalEntry(prev, signedPayload) : createJournalEntry(signedPayload);
}

// Both helpers sort by the h2a journal sequence stored inside after_summary
// rather than created_at: a transaction-bound insert chain shares the same
// transaction start timestamp, which would otherwise leave ordering ambiguous.

export async function findPreviousJournalEntry(
  db: Queryable,
  context: TenantContext,
  approvalRequestId: string
): Promise<H2AJournalEntry<ApprovalJournalBody> | null> {
  const res = await db.query<{ entry: H2AJournalEntry<ApprovalJournalBody> | null }>(
    `select (after_summary->'journalEntry')::jsonb as entry
       from audit_events
      where organization_id = $1
        and approval_request_id = $2
        and after_summary ? 'journalEntry'
      order by ((after_summary->'journalEntry'->>'sequence')::int) desc
      limit 1`,
    [context.organizationId, approvalRequestId]
  );
  return res.rows[0]?.entry ?? null;
}

export async function readApprovalJournalChain(
  db: Queryable,
  context: TenantContext,
  approvalRequestId: string
): Promise<H2AJournalEntry<ApprovalJournalBody>[]> {
  const res = await db.query<{ entry: H2AJournalEntry<ApprovalJournalBody> }>(
    `select (after_summary->'journalEntry')::jsonb as entry
       from audit_events
      where organization_id = $1
        and approval_request_id = $2
        and after_summary ? 'journalEntry'
      order by ((after_summary->'journalEntry'->>'sequence')::int) asc`,
    [context.organizationId, approvalRequestId]
  );
  return res.rows.map((row) => row.entry);
}

// ---------------------------------------------------------------------------
// Generic resource-keyed helpers (DS 2.6+). Any module can chain h2a journal
// entries on a (resource_type, resource_id) pair by reusing these primitives.
// ApprovalRequest stays on its dedicated lookup above (approval_request_id FK)
// for backward compatibility; new modules use the generic path.
// ---------------------------------------------------------------------------

export interface BuildResourceJournalEntryInput<TBody> {
  resourceType: string;
  resourceId: string;
  actorInstance: string;
  actorRole?: "PRINCIPAL" | "EXECUTIF" | "CONDUCTOR" | "AGENTS" | "CONTROL" | "MANDATAIRE";
  type: H2AEnvelopeType;
  artifactKind?: string;
  body: TBody;
  signing?: AuditSigningConfig | null;
}

export async function buildResourceJournalEntry<TBody>(
  db: Queryable,
  context: TenantContext,
  input: BuildResourceJournalEntryInput<TBody>
): Promise<H2AJournalEntry<TBody>> {
  const payload: H2AJournalPayload<TBody> = {
    id: randomUUID(),
    type: input.type,
    actor: {
      instance: input.actorInstance,
      role: input.actorRole ?? "EXECUTIF",
      scope: `org:${context.organizationId}`
    },
    artifactKind: input.artifactKind ?? "ENGAGEMENT",
    engagementId: input.resourceId,
    correlationId: input.resourceId,
    body: input.body,
    createdAt: new Date().toISOString()
  };

  const signing = input.signing === undefined ? readAuditSigningConfig() : input.signing;
  let signedPayload: H2AJournalPayload<TBody> = payload;
  if (signing) {
    const signature: H2ASignature = signJournalPayload({
      payloadWithoutSignatures: payload as unknown as Record<string, unknown>,
      signing
    });
    signedPayload = { ...payload, signatures: [signature] };
  }

  const prev = await findPreviousJournalEntryByResource<TBody>(
    db,
    context,
    input.resourceType,
    input.resourceId
  );
  return prev ? appendJournalEntry(prev, signedPayload) : createJournalEntry(signedPayload);
}

export async function findPreviousJournalEntryByResource<TBody>(
  db: Queryable,
  context: TenantContext,
  resourceType: string,
  resourceId: string
): Promise<H2AJournalEntry<TBody> | null> {
  const res = await db.query<{ entry: H2AJournalEntry<TBody> | null }>(
    `select (after_summary->'journalEntry')::jsonb as entry
       from audit_events
      where organization_id = $1
        and resource_type = $2
        and resource_id = $3
        and after_summary ? 'journalEntry'
      order by ((after_summary->'journalEntry'->>'sequence')::int) desc
      limit 1`,
    [context.organizationId, resourceType, resourceId]
  );
  return res.rows[0]?.entry ?? null;
}

export async function readJournalChainByResource<TBody>(
  db: Queryable,
  context: TenantContext,
  resourceType: string,
  resourceId: string
): Promise<H2AJournalEntry<TBody>[]> {
  const res = await db.query<{ entry: H2AJournalEntry<TBody> }>(
    `select (after_summary->'journalEntry')::jsonb as entry
       from audit_events
      where organization_id = $1
        and resource_type = $2
        and resource_id = $3
        and after_summary ? 'journalEntry'
      order by ((after_summary->'journalEntry'->>'sequence')::int) asc`,
    [context.organizationId, resourceType, resourceId]
  );
  return res.rows.map((row) => row.entry);
}
