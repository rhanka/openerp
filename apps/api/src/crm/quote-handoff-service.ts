import type {
  CreateQuoteHandoffInput,
  QuoteHandoff,
  QuoteHandoffStatus
} from "@sentropic/openerp-domain/crm";

import type { Queryable, TenantContext } from "../db/client";
import { assertTenantContext } from "../db/client";
import { recordAuditEvent } from "../foundation/audit-emit";
import { emitCrmTimelineEntry } from "./crm-timeline";
import {
  findQuoteHandoffById,
  insertQuoteHandoff,
  listQuoteHandoffs as listQuoteHandoffsRepo,
  softDeleteQuoteHandoff,
  updateQuoteHandoffStatus
} from "./quote-handoffs";

export class QuoteHandoffNotFoundError extends Error {
  readonly code = "QUOTE_HANDOFF_NOT_FOUND";
  constructor(id: string) {
    super(`QuoteHandoff ${id} not found`);
  }
}

export class QuoteHandoffTransitionError extends Error {
  readonly code = "QUOTE_HANDOFF_ILLEGAL_TRANSITION";
  constructor(currentStatus: string, targetStatus: string) {
    super(
      `Cannot transition QuoteHandoff from '${currentStatus}' to '${targetStatus}': only pending can move to accepted/rejected`
    );
  }
}

export async function createQuoteHandoff(
  db: Queryable,
  context: TenantContext,
  input: CreateQuoteHandoffInput
): Promise<QuoteHandoff> {
  assertTenantContext(context);
  const handoff = await insertQuoteHandoff(db, context, input);
  await recordAuditEvent(db, context, {
    action: "crm.quote_handoff.requested",
    resourceType: "quote_handoff",
    resourceId: handoff.id,
    beforeSummary: null,
    afterSummary: {
      opportunityId: handoff.opportunityId,
      targetType: handoff.targetType,
      status: handoff.status
    }
  });
  await emitCrmTimelineEntry(db, context, {
    resourceType: "opportunity",
    resourceId: handoff.opportunityId,
    entryType: "crm.quote_handoff.requested",
    payloadSummary: {
      quoteHandoffId: handoff.id,
      targetType: handoff.targetType,
      status: handoff.status
    }
  });
  return handoff;
}

export async function acceptQuoteHandoff(
  db: Queryable,
  context: TenantContext,
  id: string
): Promise<QuoteHandoff> {
  assertTenantContext(context);
  const before = await findQuoteHandoffById(db, context, id);
  if (!before) throw new QuoteHandoffNotFoundError(id);
  if (before.status !== "pending") {
    throw new QuoteHandoffTransitionError(before.status, "accepted");
  }
  const acceptedAt = new Date().toISOString();
  const updated = await updateQuoteHandoffStatus(db, context, id, "accepted", { acceptedAt });
  if (!updated) throw new QuoteHandoffNotFoundError(id);
  await recordAuditEvent(db, context, {
    action: "crm.quote_handoff.accepted",
    resourceType: "quote_handoff",
    resourceId: id,
    beforeSummary: { status: before.status },
    afterSummary: { status: "accepted", acceptedAt }
  });
  await emitCrmTimelineEntry(db, context, {
    resourceType: "opportunity",
    resourceId: updated.opportunityId,
    entryType: "crm.quote_handoff.accepted",
    payloadSummary: { quoteHandoffId: id, acceptedAt }
  });
  return updated;
}

export async function rejectQuoteHandoff(
  db: Queryable,
  context: TenantContext,
  id: string
): Promise<QuoteHandoff> {
  assertTenantContext(context);
  const before = await findQuoteHandoffById(db, context, id);
  if (!before) throw new QuoteHandoffNotFoundError(id);
  if (before.status !== "pending") {
    throw new QuoteHandoffTransitionError(before.status, "rejected");
  }
  const updated = await updateQuoteHandoffStatus(db, context, id, "rejected");
  if (!updated) throw new QuoteHandoffNotFoundError(id);
  await recordAuditEvent(db, context, {
    action: "crm.quote_handoff.rejected",
    resourceType: "quote_handoff",
    resourceId: id,
    beforeSummary: { status: before.status },
    afterSummary: { status: "rejected" }
  });
  await emitCrmTimelineEntry(db, context, {
    resourceType: "opportunity",
    resourceId: updated.opportunityId,
    entryType: "crm.quote_handoff.rejected",
    payloadSummary: { quoteHandoffId: id }
  });
  return updated;
}

export async function getQuoteHandoffById(
  db: Queryable,
  context: TenantContext,
  id: string
): Promise<QuoteHandoff | null> {
  return findQuoteHandoffById(db, context, id);
}

export async function listQuoteHandoffs(
  db: Queryable,
  context: TenantContext,
  options: {
    opportunityId?: string;
    status?: QuoteHandoffStatus;
    limit?: number;
    offset?: number;
  } = {}
): Promise<QuoteHandoff[]> {
  return listQuoteHandoffsRepo(db, context, options);
}

export async function deleteQuoteHandoff(
  db: Queryable,
  context: TenantContext,
  id: string
): Promise<void> {
  assertTenantContext(context);
  const before = await findQuoteHandoffById(db, context, id);
  if (!before) throw new QuoteHandoffNotFoundError(id);
  const deleted = await softDeleteQuoteHandoff(db, context, id);
  if (!deleted) throw new QuoteHandoffNotFoundError(id);
}
