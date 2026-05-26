import type { Payment, BillingMoney } from "@sentropic/openerp-domain/billing";

import type { Queryable, TenantContext } from "../db/client";
import { assertTenantContext } from "../db/client";

// Repository for Payment entity.
// Payments support soft-delete via deleted_at.

const PAYMENT_RETURN_COLUMNS = `
  id,
  organization_id as "organizationId",
  invoice_id as "invoiceId",
  company_id as "companyId",
  amount,
  payment_date as "paymentDate",
  method,
  reference,
  created_at as "createdAt",
  updated_at as "updatedAt"
`;

export async function insertPayment(
  db: Queryable,
  context: TenantContext,
  input: {
    invoiceId: string;
    companyId: string | null;
    amount: BillingMoney;
    paymentDate: string;
    method: string;
    reference: string | null;
  }
): Promise<Payment> {
  assertTenantContext(context);
  const result = await db.query<Payment>(
    `insert into payments (
       organization_id, invoice_id, company_id, amount, payment_date, method, reference
     ) values ($1, $2, $3, $4::jsonb, $5, $6, $7)
     returning ${PAYMENT_RETURN_COLUMNS}`,
    [
      context.organizationId,
      input.invoiceId,
      input.companyId ?? null,
      JSON.stringify(input.amount),
      input.paymentDate,
      input.method,
      input.reference ?? null
    ]
  );
  return result.rows[0]!;
}

export async function findPaymentById(
  db: Queryable,
  context: TenantContext,
  id: string
): Promise<Payment | null> {
  assertTenantContext(context);
  const result = await db.query<Payment>(
    `select ${PAYMENT_RETURN_COLUMNS}
       from payments
      where id = $1 and organization_id = $2 and deleted_at is null`,
    [id, context.organizationId]
  );
  return result.rows[0] ?? null;
}

export async function listPayments(
  db: Queryable,
  context: TenantContext,
  options: {
    limit?: number;
    offset?: number;
    invoiceId?: string;
    companyId?: string;
  } = {}
): Promise<Payment[]> {
  assertTenantContext(context);
  const limit = Math.min(Math.max(options.limit ?? 50, 1), 200);
  const offset = Math.max(options.offset ?? 0, 0);
  const filterInvoiceId = options.invoiceId ?? null;
  const filterCompanyId = options.companyId ?? null;
  const result = await db.query<Payment>(
    `select ${PAYMENT_RETURN_COLUMNS}
       from payments
      where organization_id = $1
        and ($2::uuid is null or invoice_id = $2)
        and ($3::uuid is null or company_id = $3)
        and deleted_at is null
      order by payment_date desc, created_at desc
      limit $4 offset $5`,
    [context.organizationId, filterInvoiceId, filterCompanyId, limit, offset]
  );
  return result.rows;
}

export async function softDeletePayment(
  db: Queryable,
  context: TenantContext,
  id: string
): Promise<{ id: string } | null> {
  assertTenantContext(context);
  const result = await db.query<{ id: string }>(
    `update payments
        set deleted_at = now(), updated_at = now()
      where id = $1 and organization_id = $2 and deleted_at is null
      returning id`,
    [id, context.organizationId]
  );
  return result.rows[0] ?? null;
}

export async function sumPaymentsForInvoice(
  db: Queryable,
  context: TenantContext,
  invoiceId: string
): Promise<number> {
  assertTenantContext(context);
  const result = await db.query<{ total: string }>(
    `select coalesce(sum((amount->>'amountMinor')::numeric), 0)::text as total
       from payments
      where invoice_id = $1 and organization_id = $2 and deleted_at is null`,
    [invoiceId, context.organizationId]
  );
  return parseInt(result.rows[0]?.total ?? "0", 10);
}
