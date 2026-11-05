import type { BillingMoney } from "./billing";

/** Canonical persistence providers. API input accepts only the provider aliases defined locally. */
export type BankingProvider = "ofx" | "plaid_sandbox";

export type BankAccountType =
  | "checking"
  | "savings"
  | "credit"
  | "loan"
  | "investment"
  | "other";

export type BankTransactionReconciliationStatus = "unmatched" | "matched" | "ignored";
export type ReconciliationLinkStatus = "proposed" | "confirmed" | "rejected";
/** D9 v1 is deliberately payment-only; invoice reconciliation is out of scope. */
export type ReconciliationCandidateKind = "payment";

export interface BankAccount {
  id: string;
  organizationId: string;
  provider: BankingProvider;
  providerAccountRef: string;
  displayName: string;
  accountType: BankAccountType;
  currency: string;
  institution: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BankTransactionSnapshot {
  sourceId: string;
  providerRef: string;
  description: string;
  postedAt: string;
  amount: BillingMoney;
  merchant?: string;
  category?: string;
}

export interface BankTransaction {
  id: string;
  organizationId: string;
  bankAccountId: string;
  provider: BankingProvider;
  providerTransactionRef: string;
  postedAt: string;
  amount: BillingMoney;
  rawDescription: string;
  normalizedSnapshot: BankTransactionSnapshot;
  reconciliationStatus: BankTransactionReconciliationStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ReconciliationLink {
  id: string;
  organizationId: string;
  bankTransactionId: string;
  candidateKind: ReconciliationCandidateKind;
  candidateId: string;
  score: number;
  reasons: string[];
  status: ReconciliationLinkStatus;
  createdAt: string;
  updatedAt: string;
}

/** Read model returned by the banking transactions worklist endpoint. */
export interface BankTransactionList {
  items: BankTransaction[];
}

/** Read model returned by the stored reconciliation proposal endpoint. */
export interface ReconciliationSuggestionList {
  items: ReconciliationLink[];
}

/** Result of the explicit proposal refresh operation. */
export interface BankingRefreshResult {
  created: ReconciliationLink[];
  proposals: ReconciliationLink[];
}
