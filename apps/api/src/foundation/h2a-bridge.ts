import { randomUUID } from "node:crypto";
import {
  appendJournalEntry,
  createJournalEntry,
  type H2AEnvelopeType,
  type H2AJournalEntry,
  type H2AJournalPayload
} from "@sentropic/h2a";

import type { Queryable, TenantContext } from "../db/client";

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

  const prev = await findPreviousJournalEntry(db, context, input.approvalRequestId);
  return prev ? appendJournalEntry(prev, payload) : createJournalEntry(payload);
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
