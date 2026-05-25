import type { Rate, CreateRateInput, UpdateRateInput } from "@sentropic/openerp-domain/project";

import type { Queryable, TenantContext } from "../db/client";
import { assertTenantContext } from "../db/client";
import { recordAuditEvent } from "../foundation/audit-emit";
import { emitProjectTimelineEntry } from "./project-timeline";
import {
  findRateById,
  insertRate,
  listRates as listRatesRepo,
  softDeleteRate,
  updateRate as updateRateRepo
} from "./rates";

// Service for the Rate entity. Each mutation emits an AuditEvent with the
// canonical project.rate.created / updated / deleted grammar and a
// TimelineEntry for the delivery activity stream.

export class RateNotFoundError extends Error {
  readonly code = "RATE_NOT_FOUND";
  constructor(rateId: string) {
    super(`Rate ${rateId} not found`);
  }
}

export async function createRate(
  db: Queryable,
  context: TenantContext,
  input: CreateRateInput
): Promise<Rate> {
  assertTenantContext(context);
  const created = await insertRate(db, context, input);
  await emitRateAudit(db, context, {
    action: "project.rate.created",
    rateId: created.id,
    beforeSummary: null,
    afterSummary: { name: created.name, amount: created.amount, effectiveFrom: created.effectiveFrom }
  });
  await emitProjectTimelineEntry(db, context, {
    resourceType: "rate",
    resourceId: created.id,
    entryType: "project.rate.created",
    payloadSummary: { name: created.name, effectiveFrom: created.effectiveFrom }
  });
  return created;
}

export async function updateRate(
  db: Queryable,
  context: TenantContext,
  id: string,
  patch: UpdateRateInput
): Promise<Rate> {
  assertTenantContext(context);
  const before = await findRateById(db, context, id);
  if (!before) throw new RateNotFoundError(id);
  const updated = await updateRateRepo(db, context, id, patch);
  if (!updated) throw new RateNotFoundError(id);
  await emitRateAudit(db, context, {
    action: "project.rate.updated",
    rateId: updated.id,
    beforeSummary: { name: before.name, amount: before.amount, active: before.active },
    afterSummary: { name: updated.name, amount: updated.amount, active: updated.active }
  });
  await emitProjectTimelineEntry(db, context, {
    resourceType: "rate",
    resourceId: updated.id,
    entryType: "project.rate.updated",
    payloadSummary: { name: updated.name, active: updated.active }
  });
  return updated;
}

export async function deleteRate(
  db: Queryable,
  context: TenantContext,
  id: string
): Promise<void> {
  assertTenantContext(context);
  const before = await findRateById(db, context, id);
  if (!before) throw new RateNotFoundError(id);
  const deleted = await softDeleteRate(db, context, id);
  if (!deleted) throw new RateNotFoundError(id);
  await emitRateAudit(db, context, {
    action: "project.rate.deleted",
    rateId: id,
    beforeSummary: { name: before.name, effectiveFrom: before.effectiveFrom },
    afterSummary: null
  });
  await emitProjectTimelineEntry(db, context, {
    resourceType: "rate",
    resourceId: id,
    entryType: "project.rate.deleted",
    payloadSummary: { name: before.name }
  });
}

export async function getRateById(
  db: Queryable,
  context: TenantContext,
  id: string
): Promise<Rate | null> {
  return findRateById(db, context, id);
}

export async function listRates(
  db: Queryable,
  context: TenantContext,
  options: {
    limit?: number;
    offset?: number;
    activeOnly?: boolean;
  } = {}
): Promise<Rate[]> {
  return listRatesRepo(db, context, options);
}

interface EmitRateAuditInput {
  action: string;
  rateId: string;
  beforeSummary: Record<string, unknown> | null;
  afterSummary: Record<string, unknown> | null;
}

async function emitRateAudit(
  db: Queryable,
  context: TenantContext,
  input: EmitRateAuditInput
): Promise<void> {
  await recordAuditEvent(db, context, {
    action: input.action,
    resourceType: "rate",
    resourceId: input.rateId,
    beforeSummary: input.beforeSummary,
    afterSummary: input.afterSummary
  });
}
