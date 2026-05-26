import type { Invoice, InvoiceLine, InvoiceStatus, BillingMoney } from "@sentropic/openerp-domain/billing";

import type { Queryable, TenantContext } from "../db/client";
import { assertTenantContext } from "../db/client";

// Repository for Invoice + InvoiceLine entities.
// Invoice supports soft-delete via deleted_at.

const INVOICE_RETURN_COLUMNS = `
  id,
  organization_id as "organizationId",
  company_id as "companyId",
  project_id as "projectId",
  invoice_proposal_id as "invoiceProposalId",
  invoice_number as "invoiceNumber",
  status,
  currency,
  subtotal,
  tax_total as "taxTotal",
  total,
  issue_date as "issueDate",
  due_date as "dueDate",
  issued_at as "issuedAt",
  created_at as "createdAt",
  updated_at as "updatedAt"
`;

const LINE_RETURN_COLUMNS = `
  id,
  organization_id as "organizationId",
  invoice_id as "invoiceId",
  source_type as "sourceType",
  source_id as "sourceId",
  description,
  quantity,
  unit_price as "unitPrice",
  amount,
  created_at as "createdAt"
`;

export async function insertInvoice(
  db: Queryable,
  context: TenantContext,
  input: {
    companyId: string;
    projectId: string | null;
    invoiceProposalId: string | null;
    invoiceNumber: string;
    status: InvoiceStatus;
    currency: string;
    subtotal: BillingMoney;
    taxTotal: BillingMoney;
    total: BillingMoney;
    issueDate: string | null;
    dueDate: string | null;
  }
): Promise<Invoice> {
  assertTenantContext(context);
  const result = await db.query<Invoice>(
    `insert into invoices (
       organization_id, company_id, project_id, invoice_proposal_id,
       invoice_number, status, currency, subtotal, tax_total, total,
       issue_date, due_date
     ) values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::jsonb, $10::jsonb, $11, $12)
     returning ${INVOICE_RETURN_COLUMNS}`,
    [
      context.organizationId,
      input.companyId,
      input.projectId ?? null,
      input.invoiceProposalId ?? null,
      input.invoiceNumber,
      input.status,
      input.currency,
      JSON.stringify(input.subtotal),
      JSON.stringify(input.taxTotal),
      JSON.stringify(input.total),
      input.issueDate ?? null,
      input.dueDate ?? null
    ]
  );
  return result.rows[0]!;
}

export async function findInvoiceById(
  db: Queryable,
  context: TenantContext,
  id: string
): Promise<Invoice | null> {
  assertTenantContext(context);
  const result = await db.query<Invoice>(
    `select ${INVOICE_RETURN_COLUMNS}
       from invoices
      where id = $1 and organization_id = $2 and deleted_at is null`,
    [id, context.organizationId]
  );
  return result.rows[0] ?? null;
}

export async function listInvoices(
  db: Queryable,
  context: TenantContext,
  options: {
    limit?: number;
    offset?: number;
    companyId?: string;
    projectId?: string;
    status?: InvoiceStatus;
  } = {}
): Promise<Invoice[]> {
  assertTenantContext(context);
  const limit = Math.min(Math.max(options.limit ?? 50, 1), 200);
  const offset = Math.max(options.offset ?? 0, 0);
  const filterCompanyId = options.companyId ?? null;
  const filterProjectId = options.projectId ?? null;
  const filterStatus = options.status ?? null;
  const result = await db.query<Invoice>(
    `select ${INVOICE_RETURN_COLUMNS}
       from invoices
      where organization_id = $1
        and ($2::uuid is null or company_id = $2)
        and ($3::uuid is null or project_id = $3)
        and ($4::text is null or status = $4)
        and deleted_at is null
      order by created_at desc
      limit $5 offset $6`,
    [context.organizationId, filterCompanyId, filterProjectId, filterStatus, limit, offset]
  );
  return result.rows;
}

export async function updateInvoiceStatus(
  db: Queryable,
  context: TenantContext,
  id: string,
  status: InvoiceStatus,
  extra: { issuedAt?: string | null; issueDate?: string | null } = {}
): Promise<Invoice | null> {
  assertTenantContext(context);
  const sets = ["status = $3", "updated_at = now()"];
  const values: unknown[] = [id, context.organizationId, status];
  if (extra.issuedAt !== undefined) {
    sets.push(`issued_at = $${values.length + 1}`);
    values.push(extra.issuedAt);
  }
  if (extra.issueDate !== undefined) {
    sets.push(`issue_date = $${values.length + 1}`);
    values.push(extra.issueDate);
  }
  const result = await db.query<Invoice>(
    `update invoices
        set ${sets.join(", ")}
      where id = $1 and organization_id = $2 and deleted_at is null
      returning ${INVOICE_RETURN_COLUMNS}`,
    values
  );
  return result.rows[0] ?? null;
}

export async function softDeleteInvoice(
  db: Queryable,
  context: TenantContext,
  id: string
): Promise<{ id: string } | null> {
  assertTenantContext(context);
  const result = await db.query<{ id: string }>(
    `update invoices
        set deleted_at = now(), updated_at = now()
      where id = $1 and organization_id = $2 and deleted_at is null
      returning id`,
    [id, context.organizationId]
  );
  return result.rows[0] ?? null;
}

export async function countInvoicesForOrg(
  db: Queryable,
  context: TenantContext
): Promise<number> {
  assertTenantContext(context);
  const result = await db.query<{ count: string }>(
    `select count(*)::text as count from invoices where organization_id = $1`,
    [context.organizationId]
  );
  return parseInt(result.rows[0]?.count ?? "0", 10);
}

export async function insertInvoiceLine(
  db: Queryable,
  context: TenantContext,
  input: {
    invoiceId: string;
    sourceType: string;
    sourceId: string | null;
    description: string | null;
    quantity: number;
    unitPrice: BillingMoney;
    amount: BillingMoney;
  }
): Promise<InvoiceLine> {
  assertTenantContext(context);
  const result = await db.query<InvoiceLine>(
    `insert into invoice_lines (
       organization_id, invoice_id, source_type, source_id,
       description, quantity, unit_price, amount
     ) values ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb)
     returning ${LINE_RETURN_COLUMNS}`,
    [
      context.organizationId,
      input.invoiceId,
      input.sourceType,
      input.sourceId ?? null,
      input.description ?? null,
      input.quantity,
      JSON.stringify(input.unitPrice),
      JSON.stringify(input.amount)
    ]
  );
  return result.rows[0]!;
}

export async function listLinesForInvoice(
  db: Queryable,
  context: TenantContext,
  invoiceId: string
): Promise<InvoiceLine[]> {
  assertTenantContext(context);
  const result = await db.query<InvoiceLine>(
    `select ${LINE_RETURN_COLUMNS}
       from invoice_lines
      where invoice_id = $1 and organization_id = $2
      order by created_at asc`,
    [invoiceId, context.organizationId]
  );
  return result.rows;
}
