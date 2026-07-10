/**
 * Minimal normalized banking types, inspired by FDX (Financial Data Exchange) account/transaction
 * resources. This is the seam between bank providers (Plaid sandbox, OFX upload, ...) and the MCP
 * tools exposed by this connector — see docs/studies/2026-07-06-sentropic-connecteur-plaid-mutualise.md
 * (§4) for the target platform architecture this skeleton anticipates.
 */

export type NormalizedAccountType =
  | "checking"
  | "savings"
  | "credit"
  | "loan"
  | "investment"
  | "other";

export type NormalizedTransactionStatus = "posted" | "pending";

export interface NormalizedAccount {
  /** Stable id within this connector (currently the provider's own account id). */
  id: string;
  /** Opaque reference to the account in the source provider's own data model. */
  providerRef: string;
  name: string;
  type: NormalizedAccountType;
  /** ISO 4217 currency code. */
  currency: string;
  /** Current balance, when the provider exposes one. */
  balance?: number;
  institution: string;
}

export interface NormalizedTransaction {
  /** Stable id within this connector (currently the provider's own transaction id). */
  id: string;
  accountId: string;
  /** ISO 8601 timestamp. */
  postedAt: string;
  /** Signed amount: positive = credit (money in), negative = debit (money out). */
  amount: number;
  /** ISO 4217 currency code. */
  currency: string;
  description: string;
  merchant?: string;
  category?: string;
  status: NormalizedTransactionStatus;
  /** Opaque reference to the transaction in the source provider's own data model. */
  providerRef: string;
}

/**
 * Shared invocation context passed to every BankProvider call. Each provider only reads the
 * field(s) it needs: ofx-upload reads `filePath`, plaid-sandbox reads `institutionQuery`.
 */
export interface ProviderContext {
  /** Path to a local .ofx file — required by the ofx-upload provider. */
  filePath?: string;
  /** Institution search query used to enroll a sandbox Item — used by plaid-sandbox only. */
  institutionQuery?: string;
}

export interface ListTransactionsParams {
  accountId?: string;
  /** ISO 8601 date — inclusive lower bound on postedAt. */
  since?: string;
  /** Opaque pagination cursor returned by a previous call. */
  cursor?: string;
}

export interface ListTransactionsResult {
  transactions: NormalizedTransaction[];
  /** Present when more transactions are available beyond this page. */
  nextCursor?: string;
}

/**
 * A pluggable source of normalized bank data. Providers own their own credentials/custody model;
 * this skeleton keeps everything in-process (see providers/plaid-sandbox.ts) until the Sentropic
 * platform vault lands.
 */
export interface BankProvider {
  readonly id: string;
  listAccounts(ctx: ProviderContext): Promise<NormalizedAccount[]>;
  listTransactions(
    ctx: ProviderContext,
    params: ListTransactionsParams
  ): Promise<ListTransactionsResult>;
}
