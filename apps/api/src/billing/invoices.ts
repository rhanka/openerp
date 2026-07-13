import type {
  BillingMoney,
  Invoice,
  InvoiceLine,
  InvoiceStatus,
  TaxBreakdownLine
} from "@sentropic/openerp-domain/billing";

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
  tax_category_id as "taxCategoryId",
  tax_breakdown as "taxBreakdown",
  issue_date as "issueDate",
  due_date as "dueDate",
  issued_at as "issuedAt",
  notes,
  po_number as "poNumber",
  payment_terms_days as "paymentTermsDays",
  issuer_snapshot as "issuerSnapshot",
  customer_snapshot as "customerSnapshot",
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
    taxCategoryId?: string | null;
    issueDate: string | null;
    dueDate: string | null;
    notes?: string | null;
    poNumber?: string | null;
    paymentTermsDays?: number | null;
  }
): Promise<Invoice> {
  assertTenantContext(context);
  const result = await db.query<Invoice>(
    `insert into invoices (
       organization_id, company_id, project_id, invoice_proposal_id,
       invoice_number, status, currency, subtotal, tax_total, total,
       tax_category_id, issue_date, due_date, notes, po_number, payment_terms_days
     ) values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::jsonb, $10::jsonb, $11, $12, $13, $14, $15, $16)
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
      input.taxCategoryId ?? null,
      input.issueDate ?? null,
      input.dueDate ?? null,
      input.notes ?? null,
      input.poNumber ?? null,
      input.paymentTermsDays ?? null
    ]
  );
  return result.rows[0]!;
}

/** Update tax totals and breakdown on an invoice (used by computeInvoiceTaxes). */
export async function updateInvoiceTaxes(
  db: Queryable,
  context: TenantContext,
  id: string,
  input: {
    taxTotal: BillingMoney;
    total: BillingMoney;
    taxBreakdown: TaxBreakdownLine[];
  }
): Promise<Invoice | null> {
  assertTenantContext(context);
  const result = await db.query<Invoice>(
    `update invoices
        set tax_total = $3::jsonb,
            total = $4::jsonb,
            tax_breakdown = $5::jsonb,
            updated_at = now()
      where id = $1 and organization_id = $2 and deleted_at is null
      returning ${INVOICE_RETURN_COLUMNS}`,
    [
      id,
      context.organizationId,
      JSON.stringify(input.taxTotal),
      JSON.stringify(input.total),
      JSON.stringify(input.taxBreakdown)
    ]
  );
  return result.rows[0] ?? null;
}

/** Update the tax_category_id on an invoice. */
export async function updateInvoiceTaxCategory(
  db: Queryable,
  context: TenantContext,
  id: string,
  taxCategoryId: string | null
): Promise<Invoice | null> {
  assertTenantContext(context);
  const result = await db.query<Invoice>(
    `update invoices
        set tax_category_id = $3,
            updated_at = now()
      where id = $1 and organization_id = $2 and deleted_at is null
      returning ${INVOICE_RETURN_COLUMNS}`,
    [id, context.organizationId, taxCategoryId]
  );
  return result.rows[0] ?? null;
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
  extra: { issuedAt?: string | null; issueDate?: string | null; dueDate?: string | null } = {}
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
  if (extra.dueDate !== undefined) {
    sets.push(`due_date = $${values.length + 1}`);
    values.push(extra.dueDate);
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

export async function issueInvoiceWithSnapshots(
  db: Queryable,
  context: TenantContext,
  id: string
): Promise<Invoice | null> {
  assertTenantContext(context);
  // The invoice FK is the statutory source of customer identity. Intentionally
  // retain access to that tenant-scoped row after company soft deletion.
  const result = await db.query<Invoice>(
    `with updated_invoice as (
       update invoices invoice
        set status = $3,
            issued_at = now(),
            issue_date = current_date,
            due_date = case
              when invoice.payment_terms_days is null then invoice.due_date
              else current_date + invoice.payment_terms_days
            end,
            issuer_snapshot = jsonb_build_object(
              'legalName', organization.legal_name,
              'gstRegistrationNumber', settings.gst_registration_number,
              'qstRegistrationNumber', settings.qst_registration_number,
              'issuerAddress', settings.issuer_address
            ),
            customer_snapshot = jsonb_build_object(
              'legalName', customer.legal_name,
              'displayName', customer.display_name,
              'billingAddress', customer.billing_address,
              'email', customer.email
            ),
            updated_at = now()
       from organizations organization
       join companies customer
         on customer.organization_id = organization.id
       left join tenant_settings settings
         on settings.organization_id = organization.id
      where invoice.id = $1
        and invoice.organization_id = $2
        and invoice.organization_id = organization.id
        and invoice.company_id = customer.id
        and invoice.deleted_at is null
        and invoice.status = 'draft'
        and invoice.issuer_snapshot is null
        and invoice.customer_snapshot is null
      returning invoice.*
     )
     select ${INVOICE_RETURN_COLUMNS}
       from updated_invoice`,
    [id, context.organizationId, "issued"]
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
