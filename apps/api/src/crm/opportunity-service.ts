import type {
  CreateOpportunityInput,
  Opportunity,
  UpdateOpportunityInput
} from "@sentropic/openerp-domain/crm";

import type { Queryable, TenantContext } from "../db/client";
import { assertTenantContext } from "../db/client";
import { recordAuditEvent } from "../foundation/audit-emit";
import {
  findOpportunityById,
  insertOpportunity,
  listOpportunities as listOpportunitiesRepo,
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
  await recordAuditEvent(db, context, {
    action: "crm.opportunity.created",
    resourceType: "opportunity",
    resourceId: created.id,
    afterSummary: {
      name: created.name,
      companyId: created.companyId,
      stageId: created.stageId,
      status: created.status,
      expectedValue: created.expectedValue
    }
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

  // Always emit the canonical updated event; stage_changed / won / lost are
  // emitted in addition so reporting / automation can subscribe to the
  // specific transitions without parsing diffs.
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
    await recordAuditEvent(db, context, {
      action: "crm.opportunity.stage_changed",
      resourceType: "opportunity",
      resourceId: updated.id,
      beforeSummary: { stageId: before.stageId },
      afterSummary: { stageId: updated.stageId }
    });
  }

  if (statusChanged && updated.status === "won") {
    await recordAuditEvent(db, context, {
      action: "crm.opportunity.won",
      resourceType: "opportunity",
      resourceId: updated.id,
      beforeSummary: { status: before.status },
      afterSummary: { status: "won", expectedValue: updated.expectedValue }
    });
  }
  if (statusChanged && updated.status === "lost") {
    await recordAuditEvent(db, context, {
      action: "crm.opportunity.lost",
      resourceType: "opportunity",
      resourceId: updated.id,
      beforeSummary: { status: before.status },
      afterSummary: { status: "lost", lossReason: updated.lossReason }
    });
  }

  return updated;
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
