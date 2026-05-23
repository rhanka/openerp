import type { H2AEnvelopeType, H2AJournalEntry } from "@sentropic/h2a";
import type {
  MoneySnapshot,
  OpportunityStatus
} from "@sentropic/openerp-domain/crm";

import type { Queryable, TenantContext } from "../db/client";
import {
  buildResourceJournalEntry,
  readJournalChainByResource
} from "../foundation/h2a-bridge";
import type { AuditSigningConfig } from "../foundation/audit-signing";

// DS 2.6 — Opportunity h2a engagement bridge. Maps the commercial pipeline
// transitions to h2a envelope types so the audit_events journal chain models
// the lifecycle as a single H2AEngagement artifact per opportunity.

export type OpportunityAction =
  | "created"
  | "stage_changed"
  | "won"
  | "lost"
  | "archived";

export function opportunityActionToEnvelopeType(action: OpportunityAction): H2AEnvelopeType {
  switch (action) {
    case "created":
      return "propose";
    case "stage_changed":
      return "counter";
    case "won":
      return "accept";
    case "lost":
      return "reject";
    case "archived":
      return "withdraw";
  }
}

export interface OpportunityJournalBody {
  opportunityId: string;
  action: OpportunityAction;
  status: OpportunityStatus;
  stageId: string;
  fromStageId?: string;
  expectedValue?: MoneySnapshot | null;
  lossReason?: string | null;
  name?: string;
}

interface BuildOpportunityJournalEntryInput {
  opportunityId: string;
  actorInstance: string;
  action: OpportunityAction;
  body: OpportunityJournalBody;
  signing?: AuditSigningConfig | null;
}

export async function buildOpportunityJournalEntry(
  db: Queryable,
  context: TenantContext,
  input: BuildOpportunityJournalEntryInput
): Promise<H2AJournalEntry<OpportunityJournalBody>> {
  return buildResourceJournalEntry<OpportunityJournalBody>(db, context, {
    resourceType: "opportunity",
    resourceId: input.opportunityId,
    actorInstance: input.actorInstance,
    actorRole: input.action === "created" ? "PRINCIPAL" : "EXECUTIF",
    type: opportunityActionToEnvelopeType(input.action),
    artifactKind: "ENGAGEMENT",
    body: input.body,
    ...(input.signing !== undefined ? { signing: input.signing } : {})
  });
}

export async function readOpportunityJournalChain(
  db: Queryable,
  context: TenantContext,
  opportunityId: string
): Promise<H2AJournalEntry<OpportunityJournalBody>[]> {
  return readJournalChainByResource<OpportunityJournalBody>(
    db,
    context,
    "opportunity",
    opportunityId
  );
}
