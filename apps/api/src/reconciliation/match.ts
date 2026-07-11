/**
 * Bank reconciliation matching — pure, side-effect-free (C2, read-only mono-tenant, synthetic data).
 *
 * Given normalized bank transactions and reconciliation candidates (payments/invoices), proposes
 * one-to-one match suggestions with a score and human-readable reasons. It NEVER writes to the DB,
 * mutates inputs, or touches real credentials — the caller decides what to persist. Design proposed
 * to the architect for double-consensus (SPEC_EVOL_BANK_CONNECTOR); conservative first cut.
 */

export interface ReconBankTransaction {
  readonly id: string;
  /** YYYY-MM-DD or ISO 8601. Only the date part is compared. */
  readonly postedAt: string;
  /** Signed minor units (positive = credit / money in), aligned with BillingMoney scale. */
  readonly amountMinor: number;
  readonly currency: string;
  readonly description: string;
}

export type ReconCandidateKind = "payment" | "invoice";

export interface ReconCandidate {
  readonly id: string;
  readonly kind: ReconCandidateKind;
  /** YYYY-MM-DD or ISO 8601. */
  readonly date: string;
  readonly amountMinor: number;
  readonly currency: string;
  readonly reference?: string;
  readonly label?: string;
}

export interface MatchSuggestion {
  readonly transactionId: string;
  readonly candidateId: string;
  readonly candidateKind: ReconCandidateKind;
  readonly score: number;
  readonly reasons: string[];
}

export interface ReconResult {
  readonly matched: MatchSuggestion[];
  readonly unmatchedTransactions: string[];
  readonly unmatchedCandidates: string[];
}

export interface MatchOptions {
  /** Max day gap that still earns date-proximity credit. Default 4. */
  readonly dateToleranceDays?: number;
  /** Minimum score to propose a match. Default 0.6 (exact amount + currency alone). */
  readonly minScore?: number;
}

const AMOUNT_BASE_SCORE = 0.6;
const DATE_MAX_BONUS = 0.25;
const REFERENCE_BONUS = 0.15;

function toDayNumber(date: string): number | null {
  const iso = date.slice(0, 10);
  const ms = Date.parse(`${iso}T00:00:00.000Z`);
  return Number.isNaN(ms) ? null : Math.floor(ms / 86_400_000);
}

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((token) => token.length >= 3)
  );
}

function referenceOverlap(txn: ReconBankTransaction, candidate: ReconCandidate): boolean {
  const haystack = `${txn.description}`.toLowerCase();
  if (candidate.reference && haystack.includes(candidate.reference.toLowerCase())) {
    return true;
  }
  const txnTokens = tokenize(txn.description);
  const candidateTokens = tokenize(`${candidate.reference ?? ""} ${candidate.label ?? ""}`);
  for (const token of candidateTokens) {
    if (txnTokens.has(token)) return true;
  }
  return false;
}

function scorePair(
  txn: ReconBankTransaction,
  candidate: ReconCandidate,
  dateToleranceDays: number
): MatchSuggestion | null {
  // Exact amount (by magnitude) and currency are required — otherwise not a candidate.
  if (candidate.currency !== txn.currency) return null;
  if (Math.abs(candidate.amountMinor) !== Math.abs(txn.amountMinor)) return null;

  const reasons: string[] = ["amount+currency exact"];
  let score = AMOUNT_BASE_SCORE;

  const txnDay = toDayNumber(txn.postedAt);
  const candidateDay = toDayNumber(candidate.date);
  if (txnDay !== null && candidateDay !== null) {
    const gap = Math.abs(txnDay - candidateDay);
    if (gap <= dateToleranceDays) {
      const proximity = 1 - gap / (dateToleranceDays + 1);
      score += DATE_MAX_BONUS * proximity;
      reasons.push(gap === 0 ? "same date" : `date within ${gap}d`);
    }
  }

  if (referenceOverlap(txn, candidate)) {
    score += REFERENCE_BONUS;
    reasons.push("reference/description overlap");
  }

  return {
    transactionId: txn.id,
    candidateId: candidate.id,
    candidateKind: candidate.kind,
    score: Math.min(1, Number(score.toFixed(4))),
    reasons
  };
}

/**
 * Proposes one-to-one matches. Greedy by score descending; ties broken deterministically by
 * (transactionId, candidateId) so the result is stable regardless of input order.
 */
export function matchTransactions(
  transactions: readonly ReconBankTransaction[],
  candidates: readonly ReconCandidate[],
  options: MatchOptions = {}
): ReconResult {
  const dateToleranceDays = options.dateToleranceDays ?? 4;
  const minScore = options.minScore ?? 0.6;

  const pairs: MatchSuggestion[] = [];
  for (const txn of transactions) {
    for (const candidate of candidates) {
      const suggestion = scorePair(txn, candidate, dateToleranceDays);
      if (suggestion && suggestion.score >= minScore) {
        pairs.push(suggestion);
      }
    }
  }

  pairs.sort(
    (a, b) =>
      b.score - a.score ||
      a.transactionId.localeCompare(b.transactionId) ||
      a.candidateId.localeCompare(b.candidateId)
  );

  const usedTransactions = new Set<string>();
  const usedCandidates = new Set<string>();
  const matched: MatchSuggestion[] = [];
  for (const pair of pairs) {
    if (usedTransactions.has(pair.transactionId) || usedCandidates.has(pair.candidateId)) {
      continue;
    }
    usedTransactions.add(pair.transactionId);
    usedCandidates.add(pair.candidateId);
    matched.push(pair);
  }

  return {
    matched,
    unmatchedTransactions: transactions.map((t) => t.id).filter((id) => !usedTransactions.has(id)),
    unmatchedCandidates: candidates.map((c) => c.id).filter((id) => !usedCandidates.has(id))
  };
}
