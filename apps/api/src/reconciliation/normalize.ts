/**
 * Adapter: bank-connector normalized transactions (FDX-inspired, amount in major units) → the
 * reconciliation engine's input (amountMinor, integer). This is the seam between the read-only
 * bank-connector output and matchTransactions/suggestReconciliation. Pure, no side effects.
 *
 * The input shape is declared locally (not imported from @sentropic/openerp-bank-connector) so the
 * API stays decoupled from the connector package; it mirrors NormalizedTransaction's fields.
 */
import type { ReconBankTransaction } from "./match";

export interface NormalizedBankTransactionInput {
  readonly id: string;
  /** ISO 8601 timestamp or YYYY-MM-DD. */
  readonly postedAt: string;
  /** Amount in MAJOR units (e.g. 45.99), signed: positive = credit — the FDX convention. */
  readonly amount: number;
  readonly currency: string;
  readonly description: string;
}

/** Converts a major-unit amount to integer minor units at the given scale (default 2). */
export function toMinorUnits(amount: number, scale = 2): number {
  const minor = Math.round(amount * 10 ** scale);
  return Object.is(minor, -0) ? 0 : minor;
}

/** Maps one normalized bank transaction to a reconciliation transaction. */
export function toReconTransaction(
  txn: NormalizedBankTransactionInput,
  scale = 2
): ReconBankTransaction {
  return {
    id: txn.id,
    postedAt: txn.postedAt,
    amountMinor: toMinorUnits(txn.amount, scale),
    currency: txn.currency,
    description: txn.description
  };
}

/** Maps a list of normalized bank transactions to reconciliation transactions. */
export function toReconTransactions(
  txns: readonly NormalizedBankTransactionInput[],
  scale = 2
): ReconBankTransaction[] {
  return txns.map((txn) => toReconTransaction(txn, scale));
}
