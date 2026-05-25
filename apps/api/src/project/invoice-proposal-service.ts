import type {
  InvoiceProposal,
  InvoiceProposalLine,
  InvoiceProposalStatus,
  InvoiceProposalWithLines,
  ProposalMoney
} from "@sentropic/openerp-domain/project";

import type { Queryable, TenantContext } from "../db/client";
import { assertTenantContext } from "../db/client";
import { recordAuditEvent } from "../foundation/audit-emit";
import { emitProjectTimelineEntry } from "./project-timeline";
import {
  findInvoiceProposalById,
  insertInvoiceProposal,
  insertInvoiceProposalLine,
  listInvoiceProposals as listInvoiceProposalsRepo,
  listLinesForProposal,
  softDeleteInvoiceProposal,
  updateInvoiceProposalStatus
} from "./invoice-proposals";
import { listAssignments } from "./assignments";
import { findRateById, listRates } from "./rates";
import { listTimeEntries } from "./time-entries";
import { findProjectById as findProjectRow } from "./projects";

// Service for InvoiceProposal lifecycle. Handles:
//   - generate: aggregate approved billable TimeEntries × Rate into lines + total
//   - submit: draft → submitted
//   - approve: submitted → approved
//   - reject: submitted → rejected
//   - delete: soft-delete from any non-deleted state
// Illegal transitions return InvoiceProposalTransitionError (maps to 409).

export class InvoiceProposalNotFoundError extends Error {
  readonly code = "INVOICE_PROPOSAL_NOT_FOUND";
  constructor(id: string) {
    super(`InvoiceProposal ${id} not found`);
  }
}

export class InvoiceProposalTransitionError extends Error {
  readonly code = "INVOICE_PROPOSAL_ILLEGAL_TRANSITION";
  constructor(currentStatus: string, targetStatus: string) {
    super(`Cannot transition InvoiceProposal from '${currentStatus}' to '${targetStatus}'`);
  }
}

// ---------------------------------------------------------------------------
// Core: generate
// ---------------------------------------------------------------------------

export async function generateInvoiceProposal(
  db: Queryable,
  context: TenantContext,
  input: {
    projectId: string;
    periodStart?: string | null;
    periodEnd?: string | null;
    currency?: string;
  }
): Promise<InvoiceProposalWithLines> {
  assertTenantContext(context);

  // Load project to copy companyId
  const project = await findProjectRow(db, context, input.projectId);
  const companyId = project?.companyId ?? null;

  // Load approved + billable time entries for the project, optionally filtered by period.
  const allEntries = await listTimeEntries(db, context, {
    projectId: input.projectId,
    status: "approved",
    billable: true,
    limit: 200
  });

  const entries = allEntries.filter((e) => {
    if (input.periodStart && e.entryDate < input.periodStart) return false;
    if (input.periodEnd && e.entryDate > input.periodEnd) return false;
    return true;
  });

  // For each entry, resolve the applicable Rate via the user's assignment.
  const assignments = await listAssignments(db, context, {
    projectId: input.projectId,
    limit: 200
  });

  // Determine a fallback project-level rate (first active rate for the org).
  const allRates = await listRates(db, context, { activeOnly: true });
  const fallbackRate = allRates[0] ?? null;

  // Determine the default currency from input or from the first resolvable rate.
  let resolvedCurrency = input.currency ?? null;

  // Build lines with rate resolution
  const lines: Array<{
    entry: (typeof entries)[0];
    rate: { amountMinor: number; currency: string; scale: number };
  }> = [];

  for (const entry of entries) {
    // Look up assignment for (project, user)
    const assignment = assignments.find(
      (a) => a.projectId === input.projectId && a.userId === entry.userId
    );

    let rate: { amountMinor: number; currency: string; scale: number } | null = null;

    if (assignment?.billableRateId) {
      const rateRow = await findRateById(db, context, assignment.billableRateId);
      if (rateRow) {
        rate = rateRow.amount;
      }
    }

    if (!rate && fallbackRate) {
      rate = fallbackRate.amount;
    }

    if (!rate) {
      // No rate resolvable for this entry — skip it.
      continue;
    }

    if (!resolvedCurrency) {
      resolvedCurrency = rate.currency;
    }

    lines.push({ entry, rate });
  }

  const currency = resolvedCurrency ?? input.currency ?? "CAD";

  // Compute line amounts: amount = round(rate.amountMinor * minutes / 60), same scale
  const computedLines: Array<{
    entry: (typeof entries)[0];
    unitRate: ProposalMoney;
    amount: ProposalMoney;
  }> = lines.map(({ entry, rate }) => {
    const amountMinor = Math.round((rate.amountMinor * entry.minutes) / 60);
    return {
      entry,
      unitRate: { amountMinor: rate.amountMinor, currency: rate.currency, scale: rate.scale },
      amount: { amountMinor, currency: rate.currency, scale: rate.scale }
    };
  });

  // Sum total
  const totalMinor = computedLines.reduce((sum, l) => sum + l.amount.amountMinor, 0);
  const scale = computedLines[0]?.unitRate.scale ?? 2;
  const total: ProposalMoney = { amountMinor: totalMinor, currency, scale };

  // Persist proposal + lines in one transaction block (caller may already be in tx)
  const proposal = await insertInvoiceProposal(db, context, {
    projectId: input.projectId,
    companyId,
    status: "draft",
    periodStart: input.periodStart ?? null,
    periodEnd: input.periodEnd ?? null,
    total,
    currency
  });

  const persistedLines: InvoiceProposalLine[] = [];
  for (const cl of computedLines) {
    const line = await insertInvoiceProposalLine(db, context, {
      invoiceProposalId: proposal.id,
      sourceType: "time_entry",
      sourceId: cl.entry.id,
      description: cl.entry.description,
      quantityMinutes: cl.entry.minutes,
      unitRate: cl.unitRate,
      amount: cl.amount
    });
    persistedLines.push(line);
  }

  await emitProposalAudit(db, context, {
    action: "project.invoice_proposal.created",
    proposalId: proposal.id,
    beforeSummary: null,
    afterSummary: {
      projectId: proposal.projectId,
      status: proposal.status,
      lineCount: persistedLines.length,
      totalMinor: total.amountMinor,
      currency
    }
  });
  await emitProjectTimelineEntry(db, context, {
    resourceType: "invoice_proposal",
    resourceId: proposal.id,
    entryType: "project.invoice_proposal.created",
    payloadSummary: {
      projectId: proposal.projectId,
      lineCount: persistedLines.length,
      totalMinor: total.amountMinor,
      currency
    }
  });

  return { ...proposal, lines: persistedLines };
}

// ---------------------------------------------------------------------------
// Lifecycle transitions
// ---------------------------------------------------------------------------

export async function submitInvoiceProposal(
  db: Queryable,
  context: TenantContext,
  id: string
): Promise<InvoiceProposal> {
  assertTenantContext(context);
  const before = await findInvoiceProposalById(db, context, id);
  if (!before) throw new InvoiceProposalNotFoundError(id);
  if (before.status !== "draft") {
    throw new InvoiceProposalTransitionError(before.status, "submitted");
  }
  const updated = await updateInvoiceProposalStatus(db, context, id, "submitted", {
    submittedAt: new Date().toISOString()
  });
  if (!updated) throw new InvoiceProposalNotFoundError(id);
  await emitProposalAudit(db, context, {
    action: "project.invoice_proposal.submitted",
    proposalId: id,
    beforeSummary: { status: before.status },
    afterSummary: { status: "submitted" }
  });
  await emitProjectTimelineEntry(db, context, {
    resourceType: "invoice_proposal",
    resourceId: id,
    entryType: "project.invoice_proposal.submitted",
    payloadSummary: { projectId: before.projectId }
  });
  return updated;
}

export async function approveInvoiceProposal(
  db: Queryable,
  context: TenantContext,
  id: string
): Promise<InvoiceProposal> {
  assertTenantContext(context);
  const before = await findInvoiceProposalById(db, context, id);
  if (!before) throw new InvoiceProposalNotFoundError(id);
  if (before.status !== "submitted") {
    throw new InvoiceProposalTransitionError(before.status, "approved");
  }
  const updated = await updateInvoiceProposalStatus(db, context, id, "approved");
  if (!updated) throw new InvoiceProposalNotFoundError(id);
  await emitProposalAudit(db, context, {
    action: "project.invoice_proposal.approved",
    proposalId: id,
    beforeSummary: { status: before.status },
    afterSummary: { status: "approved" }
  });
  await emitProjectTimelineEntry(db, context, {
    resourceType: "invoice_proposal",
    resourceId: id,
    entryType: "project.invoice_proposal.approved",
    payloadSummary: { projectId: before.projectId }
  });
  return updated;
}

export async function rejectInvoiceProposal(
  db: Queryable,
  context: TenantContext,
  id: string
): Promise<InvoiceProposal> {
  assertTenantContext(context);
  const before = await findInvoiceProposalById(db, context, id);
  if (!before) throw new InvoiceProposalNotFoundError(id);
  if (before.status !== "submitted") {
    throw new InvoiceProposalTransitionError(before.status, "rejected");
  }
  const updated = await updateInvoiceProposalStatus(db, context, id, "rejected");
  if (!updated) throw new InvoiceProposalNotFoundError(id);
  await emitProposalAudit(db, context, {
    action: "project.invoice_proposal.rejected",
    proposalId: id,
    beforeSummary: { status: before.status },
    afterSummary: { status: "rejected" }
  });
  await emitProjectTimelineEntry(db, context, {
    resourceType: "invoice_proposal",
    resourceId: id,
    entryType: "project.invoice_proposal.rejected",
    payloadSummary: { projectId: before.projectId }
  });
  return updated;
}

export async function deleteInvoiceProposal(
  db: Queryable,
  context: TenantContext,
  id: string
): Promise<void> {
  assertTenantContext(context);
  const before = await findInvoiceProposalById(db, context, id);
  if (!before) throw new InvoiceProposalNotFoundError(id);
  const deleted = await softDeleteInvoiceProposal(db, context, id);
  if (!deleted) throw new InvoiceProposalNotFoundError(id);
  await emitProposalAudit(db, context, {
    action: "project.invoice_proposal.deleted",
    proposalId: id,
    beforeSummary: { projectId: before.projectId, status: before.status },
    afterSummary: null
  });
  await emitProjectTimelineEntry(db, context, {
    resourceType: "invoice_proposal",
    resourceId: id,
    entryType: "project.invoice_proposal.deleted",
    payloadSummary: { projectId: before.projectId }
  });
}

export async function getInvoiceProposalById(
  db: Queryable,
  context: TenantContext,
  id: string
): Promise<InvoiceProposalWithLines | null> {
  const proposal = await findInvoiceProposalById(db, context, id);
  if (!proposal) return null;
  const lines = await listLinesForProposal(db, context, id);
  return { ...proposal, lines };
}

export async function listInvoiceProposals(
  db: Queryable,
  context: TenantContext,
  options: {
    limit?: number;
    offset?: number;
    projectId?: string;
    status?: InvoiceProposalStatus;
  } = {}
): Promise<InvoiceProposal[]> {
  return listInvoiceProposalsRepo(db, context, options);
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

interface EmitProposalAuditInput {
  action: string;
  proposalId: string;
  beforeSummary: Record<string, unknown> | null;
  afterSummary: Record<string, unknown> | null;
}

async function emitProposalAudit(
  db: Queryable,
  context: TenantContext,
  input: EmitProposalAuditInput
): Promise<void> {
  await recordAuditEvent(db, context, {
    action: input.action,
    resourceType: "invoice_proposal",
    resourceId: input.proposalId,
    beforeSummary: input.beforeSummary,
    afterSummary: input.afterSummary
  });
}

