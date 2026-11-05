import type {
  InvoiceProposal,
  InvoiceProposalLine,
  InvoiceProposalStatus,
  ProposalMoney
} from "@sentropic/openerp-domain/project";

import type { Queryable, TenantContext } from "../db/client";
import { assertTenantContext } from "../db/client";

// Repository for the InvoiceProposal + InvoiceProposalLine entities.
// InvoiceProposal supports soft-delete via deleted_at.
// InvoiceProposalLine has no individual soft-delete; lines are cascaded.

const PROPOSAL_RETURN_COLUMNS = `
  id,
  organization_id as "organizationId",
  project_id as "projectId",
  company_id as "companyId",
  status,
  period_start as "periodStart",
  period_end as "periodEnd",
  total,
  currency,
  to_char(submitted_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "submittedAt",
  to_char(created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "createdAt",
  to_char(updated_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "updatedAt"
`;

const LINE_RETURN_COLUMNS = `
  id,
  organization_id as "organizationId",
  invoice_proposal_id as "invoiceProposalId",
  source_type as "sourceType",
  source_id as "sourceId",
  description,
  quantity_minutes as "quantityMinutes",
  unit_rate as "unitRate",
  amount,
  to_char(created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "createdAt"
`;

export async function insertInvoiceProposal(
  db: Queryable,
  context: TenantContext,
  input: {
    projectId: string;
    companyId: string | null;
    status: InvoiceProposalStatus;
    periodStart: string | null;
    periodEnd: string | null;
    total: ProposalMoney;
    currency: string;
  }
): Promise<InvoiceProposal> {
  assertTenantContext(context);
  const result = await db.query<InvoiceProposal>(
    `insert into invoice_proposals (
       organization_id, project_id, company_id, status,
       period_start, period_end, total, currency
     ) values ($1, $2, $3, $4, $5, $6, $7::jsonb, $8)
     returning ${PROPOSAL_RETURN_COLUMNS}`,
    [
      context.organizationId,
      input.projectId,
      input.companyId,
      input.status,
      input.periodStart ?? null,
      input.periodEnd ?? null,
      JSON.stringify(input.total),
      input.currency
    ]
  );
  return result.rows[0]!;
}

export async function findInvoiceProposalById(
  db: Queryable,
  context: TenantContext,
  id: string
): Promise<InvoiceProposal | null> {
  assertTenantContext(context);
  const result = await db.query<InvoiceProposal>(
    `select ${PROPOSAL_RETURN_COLUMNS}
       from invoice_proposals
      where id = $1 and organization_id = $2 and deleted_at is null`,
    [id, context.organizationId]
  );
  return result.rows[0] ?? null;
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
  assertTenantContext(context);
  const limit = Math.min(Math.max(options.limit ?? 50, 1), 200);
  const offset = Math.max(options.offset ?? 0, 0);
  const filterProjectId = options.projectId ?? null;
  const filterStatus = options.status ?? null;
  const result = await db.query<InvoiceProposal>(
    `select ${PROPOSAL_RETURN_COLUMNS}
       from invoice_proposals
      where organization_id = $1
        and ($2::uuid is null or project_id = $2)
        and ($3::text is null or status = $3)
        and deleted_at is null
      order by created_at desc
      limit $4 offset $5`,
    [context.organizationId, filterProjectId, filterStatus, limit, offset]
  );
  return result.rows;
}

export async function updateInvoiceProposalStatus(
  db: Queryable,
  context: TenantContext,
  id: string,
  status: InvoiceProposalStatus,
  extra: { submittedAt?: string | null } = {}
): Promise<InvoiceProposal | null> {
  assertTenantContext(context);
  const sets = ["status = $3", "updated_at = now()"];
  const values: unknown[] = [id, context.organizationId, status];
  if (extra.submittedAt !== undefined) {
    sets.push(`submitted_at = $${values.length + 1}`);
    values.push(extra.submittedAt);
  }
  const result = await db.query<InvoiceProposal>(
    `update invoice_proposals
        set ${sets.join(", ")}
      where id = $1 and organization_id = $2 and deleted_at is null
      returning ${PROPOSAL_RETURN_COLUMNS}`,
    values
  );
  return result.rows[0] ?? null;
}

export async function softDeleteInvoiceProposal(
  db: Queryable,
  context: TenantContext,
  id: string
): Promise<{ id: string } | null> {
  assertTenantContext(context);
  const result = await db.query<{ id: string }>(
    `update invoice_proposals
        set deleted_at = now(), updated_at = now()
      where id = $1 and organization_id = $2 and deleted_at is null
      returning id`,
    [id, context.organizationId]
  );
  return result.rows[0] ?? null;
}

export async function insertInvoiceProposalLine(
  db: Queryable,
  context: TenantContext,
  input: {
    invoiceProposalId: string;
    sourceType: string;
    sourceId: string | null;
    description: string | null;
    quantityMinutes: number;
    unitRate: ProposalMoney;
    amount: ProposalMoney;
  }
): Promise<InvoiceProposalLine> {
  assertTenantContext(context);
  const result = await db.query<InvoiceProposalLine>(
    `insert into invoice_proposal_lines (
       organization_id, invoice_proposal_id, source_type, source_id,
       description, quantity_minutes, unit_rate, amount
     ) values ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb)
     returning ${LINE_RETURN_COLUMNS}`,
    [
      context.organizationId,
      input.invoiceProposalId,
      input.sourceType,
      input.sourceId ?? null,
      input.description ?? null,
      input.quantityMinutes,
      JSON.stringify(input.unitRate),
      JSON.stringify(input.amount)
    ]
  );
  return result.rows[0]!;
}

export async function listLinesForProposal(
  db: Queryable,
  context: TenantContext,
  invoiceProposalId: string
): Promise<InvoiceProposalLine[]> {
  assertTenantContext(context);
  const result = await db.query<InvoiceProposalLine>(
    `select ${LINE_RETURN_COLUMNS}
       from invoice_proposal_lines
      where invoice_proposal_id = $1 and organization_id = $2
      order by created_at asc`,
    [invoiceProposalId, context.organizationId]
  );
  return result.rows;
}
