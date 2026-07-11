/**
 * Reconciliation service — read-only, mono-tenant (bank-connector C2).
 *
 * Loads the tenant's payments and proposes matches against a set of normalized bank transactions
 * supplied by the caller (from the bank-connector: ofx-upload or plaid-sandbox, synthetic/clean data
 * only at this stage). It READS payments and WRITES nothing — persisting a confirmed match is a later
 * lot, gated by the architect. No credentials, no cross-org access.
 */
import type { Payment } from "@sentropic/openerp-domain/billing";

import type { Queryable, TenantContext } from "../db/client";
import { assertTenantContext } from "../db/client";
import { listPayments } from "../billing/payments";
import {
  matchTransactions,
  type MatchOptions,
  type ReconBankTransaction,
  type ReconCandidate,
  type ReconResult
} from "./match";

export interface SuggestReconciliationOptions extends MatchOptions {
  /** Max number of payments to consider as candidates (defaults to the repo cap). */
  readonly candidateLimit?: number;
}

/** Maps a persisted Payment to a reconciliation candidate (no sensitive fields beyond amount/ref). */
export function paymentToCandidate(payment: Payment): ReconCandidate {
  const candidate: ReconCandidate = {
    id: payment.id,
    kind: "payment",
    date: payment.paymentDate,
    amountMinor: payment.amount.amountMinor,
    currency: payment.amount.currency
  };
  return {
    ...candidate,
    ...(payment.reference ? { reference: payment.reference } : {}),
    ...(payment.invoiceId ? { label: payment.invoiceId } : {})
  };
}

/**
 * Proposes reconciliation matches between the tenant's payments and the given bank transactions.
 * Pure with respect to the database (read-only). The result is a suggestion set — nothing is
 * persisted here.
 */
export async function suggestReconciliation(
  db: Queryable,
  context: TenantContext,
  bankTransactions: readonly ReconBankTransaction[],
  options: SuggestReconciliationOptions = {}
): Promise<ReconResult> {
  assertTenantContext(context);

  const { candidateLimit, ...matchOptions } = options;
  const payments = await listPayments(db, context, { limit: candidateLimit ?? 200 });
  const candidates = payments.map(paymentToCandidate);

  return matchTransactions(bankTransactions, candidates, matchOptions);
}
