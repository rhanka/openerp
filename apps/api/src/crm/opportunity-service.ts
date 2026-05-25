import type {
  CreateOpportunityInput,
  Opportunity,
  UpdateOpportunityInput
} from "@sentropic/openerp-domain/crm";

import type { Queryable, TenantContext } from "../db/client";
import { assertTenantContext } from "../db/client";
import { recordAuditEvent } from "../foundation/audit-emit";
import { emitCrmTimelineEntry } from "./crm-timeline";
import {
  buildOpportunityJournalEntry,
  type OpportunityAction,
  type OpportunityJournalBody
} from "./h2a-opportunity-bridge";
import {
  findOpportunityById,
  insertOpportunity,
  listOpportunities as listOpportunitiesRepo,
  softDeleteOpportunity,
  updateOpportunity as updateOpportunityRepo
} from "./opportunities";

export class OpportunityNotFoundError extends Error {
  readonly code = "OPPORTUNITY_NOT_FOUND";
  constructor(id: string) {
    super(`Opportunity ${id} not found`);
  }
}

export class LossReasonRequiredError extends Error {
  readonly code = "LOSS_REASON_REQUIRED";
  constructor() {
    super("Closing an opportunity as lost requires a loss_reason");
  }
}

export async function createOpportunity(
  db: Queryable,
  context: TenantContext,
  input: CreateOpportunityInput
): Promise<Opportunity> {
  assertTenantContext(context);
  const created = await insertOpportunity(db, context, input);
  await emitOpportunityTransition(db, context, created, "created", null, {
    opportunityId: created.id,
    action: "created",
    status: created.status,
    stageId: created.stageId,
    expectedValue: created.expectedValue,
    name: created.name
  });
  return created;
}

export async function updateOpportunity(
  db: Queryable,
  context: TenantContext,
  id: string,
  patch: UpdateOpportunityInput
): Promise<Opportunity> {
  assertTenantContext(context);
  const before = await findOpportunityById(db, context, id);
  if (!before) throw new OpportunityNotFoundError(id);

  // Business rule (spec line 145): lost opportunities require a reason. Apply
  // the constraint at the service layer so it covers HTTP, scripts, and tests.
  if (patch.status === "lost") {
    const candidateReason = patch.lossReason ?? before.lossReason;
    if (!candidateReason || candidateReason.trim() === "") {
      throw new LossReasonRequiredError();
    }
  }

  const updated = await updateOpportunityRepo(db, context, id, patch);
  if (!updated) throw new OpportunityNotFoundError(id);

  const stageChanged = patch.stageId !== undefined && patch.stageId !== before.stageId;
  const statusChanged = patch.status !== undefined && patch.status !== before.status;

  // Always emit the canonical updated event. Meaningful transitions
  // (stage_changed / won / lost / archived) get an additional audit row WITH a
  // chained h2a journal entry so the H2AEngagement lifecycle is verifiable
  // end-to-end. Plain updated rows stay audit-only — no journal entry — and
  // are filtered out of the chain lookup by `after_summary ? 'journalEntry'`.
  await recordAuditEvent(db, context, {
    action: "crm.opportunity.updated",
    resourceType: "opportunity",
    resourceId: updated.id,
    beforeSummary: {
      name: before.name,
      stageId: before.stageId,
      status: before.status
    },
    afterSummary: {
      name: updated.name,
      stageId: updated.stageId,
      status: updated.status
    }
  });

  if (stageChanged) {
    await emitOpportunityTransition(db, context, updated, "stage_changed", before, {
      opportunityId: updated.id,
      action: "stage_changed",
      status: updated.status,
      stageId: updated.stageId,
      fromStageId: before.stageId
    });
  }

  if (statusChanged && updated.status === "won") {
    await emitOpportunityTransition(db, context, updated, "won", before, {
      opportunityId: updated.id,
      action: "won",
      status: "won",
      stageId: updated.stageId,
      expectedValue: updated.expectedValue
    });
  }
  if (statusChanged && updated.status === "lost") {
    await emitOpportunityTransition(db, context, updated, "lost", before, {
      opportunityId: updated.id,
      action: "lost",
      status: "lost",
      stageId: updated.stageId,
      lossReason: updated.lossReason
    });
  }
  if (statusChanged && updated.status === "archived") {
    await emitOpportunityTransition(db, context, updated, "archived", before, {
      opportunityId: updated.id,
      action: "archived",
      status: "archived",
      stageId: updated.stageId
    });
  }

  return updated;
}

async function emitOpportunityTransition(
  db: Queryable,
  context: TenantContext,
  opp: Opportunity,
  action: OpportunityAction,
  before: Opportunity | null,
  body: OpportunityJournalBody
): Promise<void> {
  const journalEntry = await buildOpportunityJournalEntry(db, context, {
    opportunityId: opp.id,
    actorInstance: context.actorUserId,
    action,
    body
  });

  const auditAction =
    action === "created"
      ? "crm.opportunity.created"
      : action === "stage_changed"
        ? "crm.opportunity.stage_changed"
        : action === "won"
          ? "crm.opportunity.won"
          : action === "lost"
            ? "crm.opportunity.lost"
            : "crm.opportunity.updated";

  const beforeSummary: Record<string, unknown> | null = before
    ? action === "stage_changed"
      ? { stageId: before.stageId }
      : { status: before.status }
    : null;
  const afterCore: Record<string, unknown> =
    action === "created"
      ? { name: opp.name, stageId: opp.stageId, status: opp.status, expectedValue: opp.expectedValue }
      : action === "stage_changed"
        ? { stageId: opp.stageId }
        : action === "won"
          ? { status: "won", expectedValue: opp.expectedValue }
          : action === "lost"
            ? { status: "lost", lossReason: opp.lossReason }
            : { status: opp.status };

  await recordAuditEvent(db, context, {
    action: auditAction,
    resourceType: "opportunity",
    resourceId: opp.id,
    beforeSummary,
    afterSummary: { ...afterCore, journalEntry },
    correlationId: journalEntry.id
  });

  // Mirror the meaningful transition into the human-readable timeline. The
  // grammar validator (foundation/entry-type-grammar.ts) accepts the same
  // `<crm>.<entity>.<verb>` shape we use for audit_events.
  await emitCrmTimelineEntry(db, context, {
    resourceType: "opportunity",
    resourceId: opp.id,
    entryType: auditAction,
    payloadSummary: afterCore as Record<string, unknown> as import("@sentropic/openerp-domain").PayloadSummary
  });
}

export async function deleteOpportunity(
  db: Queryable,
  context: TenantContext,
  id: string
): Promise<void> {
  assertTenantContext(context);
  const before = await findOpportunityById(db, context, id);
  if (!before) throw new OpportunityNotFoundError(id);
  const deleted = await softDeleteOpportunity(db, context, id);
  if (!deleted) throw new OpportunityNotFoundError(id);
  await recordAuditEvent(db, context, {
    action: "crm.opportunity.deleted",
    resourceType: "opportunity",
    resourceId: id,
    beforeSummary: { name: before.name, status: before.status },
    afterSummary: null
  });
  await emitCrmTimelineEntry(db, context, {
    resourceType: "opportunity",
    resourceId: id,
    entryType: "crm.opportunity.deleted",
    payloadSummary: { name: before.name, status: before.status }
  });
}

export async function getOpportunityById(
  db: Queryable,
  context: TenantContext,
  id: string
): Promise<Opportunity | null> {
  return findOpportunityById(db, context, id);
}

export async function listOpportunities(
  db: Queryable,
  context: TenantContext,
  options: {
    limit?: number;
    offset?: number;
    status?: "open" | "won" | "lost" | "archived";
    companyId?: string | null;
    stageId?: string | null;
  } = {}
): Promise<Opportunity[]> {
  return listOpportunitiesRepo(db, context, options);
}
