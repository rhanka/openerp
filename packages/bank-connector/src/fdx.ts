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
 * Tenant + consent scope for a connector call (C1 seam toward the platform broker's
 * ConnectorEnrollment/ConsentGrant — see SPEC_EVOL_BANK_CONNECTOR §7/§10). Every data access is
 * keyed by `tenantRef`, which the CORE resolves server-side (S2S OBO session / resolveTenant) —
 * NEVER a client-supplied tool input (ARCH-11: the client must not be able to choose the tenant).
 * No provider instance may carry another tenant's state. `consentRefs` are opaque handles to the
 * ConsentGrant(s) authorizing the access for the target itemRef (never raw credentials).
 *
 * This shape mirrors @sentropic/mcp-platform runtime §4.5 (StpConnectorContext). That package is
 * not published as a standalone lib in this repo yet, so the interface is defined locally here —
 * swap this for the canonical `@sentropic/mcp-platform` import once that package is available.
 */
export interface StpConnectorContext {
  readonly requestId: string;
  readonly principal: {
    readonly sub: string;
    readonly tenantRef: string;
    readonly workspaceRef?: string;
    readonly roles: readonly string[];
  };
  readonly session: {
    readonly mcpSessionId: string;
    readonly clientId: string;
    readonly source: "claude.ai" | "claude-code" | "codex" | string;
  };
  /** Core-authorized tenant for this call — NEVER derived from a client tool input. */
  readonly tenantRef: string;
  /** ConsentGrant refs for the target itemRef. */
  readonly consentRefs: readonly string[];
  getSecret(name: string): Promise<string>;
  // connectorConfig / audit / logger may be added later; keep this minimal for now
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
  /** Tenant + consent scope for this call (C1: read-only mono-tenant). */
  tenant?: StpConnectorContext;
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

/**
 * A tenant-scoped set of freshly built provider instances. Created per StpConnectorContext by
 * `createConnector` (see mcp-server.ts) so that no provider instance — and no in-memory credential
 * cache it holds — is ever shared across tenants. This replaces the previous module-global provider
 * singletons (C1 isolation requirement).
 */
export interface Connector {
  readonly context: StpConnectorContext;
  listProviderIds(): string[];
  getProvider(id: string): BankProvider;
}
