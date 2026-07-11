/**
 * Plaid sandbox provider — replays the validated POC chain
 * (tools/bank-connector/poc-plaid-sandbox.mjs): institutions/search -> sandbox/public_token/create
 * -> item/public_token/exchange -> transactions/sync.
 *
 * Credentials are read from process.env (PLAID_CLIENT_ID / PLAID_SANDBOX_SECRET, sourced from the
 * repo-root .env, gitignored). The resulting access_token lives ONLY in this process' memory for
 * the process lifetime — it is never logged, returned to a tool caller, or persisted. A future
 * platform vault (Sentropic custody, see docs/studies/2026-07-06-sentropic-connecteur-plaid-mutualise.md
 * §4) replaces this in-memory cache with per-org secret storage.
 */
import type {
  BankProvider,
  ListTransactionsParams,
  ListTransactionsResult,
  NormalizedAccount,
  NormalizedAccountType,
  NormalizedTransaction,
  ProviderContext,
} from "../fdx.js";

const PLAID_BASE_URL = "https://sandbox.plaid.com";
const DEFAULT_INSTITUTION_QUERY = "Desjardins";

interface PlaidCredentials {
  clientId: string;
  secret: string;
}

interface PlaidErrorPayload {
  error_code?: string;
  error_message?: string;
}

interface PlaidInstitution {
  institution_id: string;
  name: string;
  products: string[];
}

interface PlaidInstitutionsSearchResponse {
  institutions: PlaidInstitution[];
}

interface PlaidPublicTokenResponse {
  public_token: string;
}

interface PlaidExchangeResponse {
  access_token: string;
  item_id: string;
}

export interface PlaidAccount {
  account_id: string;
  name: string;
  type: string;
  subtype?: string | null;
  balances: {
    iso_currency_code?: string | null;
    current?: number | null;
  };
}

interface PlaidAccountsGetResponse {
  accounts: PlaidAccount[];
}

export interface PlaidTransaction {
  transaction_id: string;
  account_id: string;
  date: string;
  datetime?: string | null;
  amount: number;
  iso_currency_code?: string | null;
  name: string;
  merchant_name?: string | null;
  personal_finance_category?: { primary?: string } | null;
  pending: boolean;
}

interface PlaidTransactionsSyncResponse {
  added: PlaidTransaction[];
  next_cursor: string;
  has_more: boolean;
}

/** Minimal shape of `fetch` used here — injectable so the enrollment chain is testable offline. */
export type PlaidFetch = (
  url: string,
  init: { method: string; headers: Record<string, string>; body: string }
) => Promise<{ json(): Promise<unknown> }>;

export interface PlaidSandboxDeps {
  /** Override the HTTP transport (defaults to global fetch). Tests inject a canned responder. */
  fetchImpl?: PlaidFetch;
}

function readCredentialsFromEnv(): PlaidCredentials {
  const clientId = process.env.PLAID_CLIENT_ID;
  const secret = process.env.PLAID_SANDBOX_SECRET;
  if (!clientId || !secret) {
    throw new Error(
      "plaid-sandbox: PLAID_CLIENT_ID / PLAID_SANDBOX_SECRET are missing from the environment " +
        "(expected in the repo-root .env, gitignored)"
    );
  }
  return { clientId, secret };
}

async function plaidApi<T>(
  path: string,
  body: Record<string, unknown>,
  creds: PlaidCredentials,
  fetchImpl: PlaidFetch
): Promise<T> {
  const response = await fetchImpl(`${PLAID_BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: creds.clientId, secret: creds.secret, ...body }),
  });
  const json = (await response.json()) as T & PlaidErrorPayload;
  if (json.error_code) {
    // Deliberately drop error_message: Plaid sometimes echoes request context in it.
    throw new Error(`plaid ${path} failed: ${json.error_code}`);
  }
  return json;
}

const defaultFetch: PlaidFetch = (url, init) => fetch(url, init);

function mapPlaidAccountType(type: string, subtype: string | undefined): NormalizedAccountType {
  switch (type) {
    case "depository":
      return subtype === "savings" ? "savings" : "checking";
    case "credit":
      return "credit";
    case "loan":
      return "loan";
    case "investment":
      return "investment";
    default:
      return "other";
  }
}

/** Pure Plaid account -> NormalizedAccount mapping. No network — unit-testable on a fixed payload. */
export function mapPlaidAccount(account: PlaidAccount, institution: string): NormalizedAccount {
  return {
    id: account.account_id,
    providerRef: account.account_id,
    name: account.name,
    type: mapPlaidAccountType(account.type, account.subtype ?? undefined),
    currency: account.balances.iso_currency_code ?? "CAD",
    ...(account.balances.current != null ? { balance: account.balances.current } : {}),
    institution,
  };
}

/**
 * Pure Plaid transaction -> NormalizedTransaction mapping. No network — unit-testable on a fixed
 * payload. Plaid's `amount` is positive for money leaving the account (a debit); the normalized
 * convention is the opposite (positive = credit), so the sign is inverted here.
 */
export function mapPlaidTransaction(txn: PlaidTransaction): NormalizedTransaction {
  return {
    id: txn.transaction_id,
    accountId: txn.account_id,
    postedAt: txn.datetime ?? txn.date,
    amount: -txn.amount,
    currency: txn.iso_currency_code ?? "CAD",
    description: txn.name,
    ...(txn.merchant_name ? { merchant: txn.merchant_name } : {}),
    ...(txn.personal_finance_category?.primary
      ? { category: txn.personal_finance_category.primary }
      : {}),
    status: txn.pending ? "pending" : "posted",
    providerRef: txn.transaction_id,
  };
}

/**
 * Builds a fresh plaid-sandbox provider whose enrolled Item (access_token + institution name) lives
 * ONLY in this instance's closure — never in module state. Each tenant gets its own instance via
 * `createConnector`, so one tenant's token can never be observed by another (C1 isolation). The
 * token is never logged, returned to a caller, or persisted; it is discarded when the instance is
 * garbage-collected.
 */
export function createPlaidSandboxProvider(deps: PlaidSandboxDeps = {}): BankProvider {
  const fetchImpl = deps.fetchImpl ?? defaultFetch;

  // Instance-scoped Item state (was a module global before C1).
  let cachedAccessToken: string | undefined;
  let cachedInstitutionName: string | undefined;

  async function ensureAccessToken(ctx: ProviderContext): Promise<string> {
    if (cachedAccessToken) {
      return cachedAccessToken;
    }
    const creds = readCredentialsFromEnv();
    const query = ctx.institutionQuery ?? DEFAULT_INSTITUTION_QUERY;

    const search = await plaidApi<PlaidInstitutionsSearchResponse>(
      "/institutions/search",
      { query, products: null, country_codes: ["CA"] },
      creds,
      fetchImpl
    );
    const institution =
      search.institutions.find((i) => i.products.includes("transactions")) ?? search.institutions[0];
    if (!institution) {
      throw new Error(`plaid-sandbox: no institution found for query "${query}"`);
    }

    const publicToken = await plaidApi<PlaidPublicTokenResponse>(
      "/sandbox/public_token/create",
      { institution_id: institution.institution_id, initial_products: ["transactions"] },
      creds,
      fetchImpl
    );

    const exchange = await plaidApi<PlaidExchangeResponse>(
      "/item/public_token/exchange",
      { public_token: publicToken.public_token },
      creds,
      fetchImpl
    );

    cachedAccessToken = exchange.access_token;
    cachedInstitutionName = institution.name;
    return cachedAccessToken;
  }

  return {
    id: "plaid-sandbox",

    async listAccounts(ctx: ProviderContext): Promise<NormalizedAccount[]> {
      const creds = readCredentialsFromEnv();
      const accessToken = await ensureAccessToken(ctx);
      const result = await plaidApi<PlaidAccountsGetResponse>(
        "/accounts/get",
        { access_token: accessToken },
        creds,
        fetchImpl
      );
      const institution = cachedInstitutionName ?? "unknown";
      return result.accounts.map((account) => mapPlaidAccount(account, institution));
    },

    async listTransactions(
      ctx: ProviderContext,
      params: ListTransactionsParams
    ): Promise<ListTransactionsResult> {
      const creds = readCredentialsFromEnv();
      const accessToken = await ensureAccessToken(ctx);
      const body: Record<string, unknown> = { access_token: accessToken };
      if (params.cursor) {
        body.cursor = params.cursor;
      }
      const result = await plaidApi<PlaidTransactionsSyncResponse>(
        "/transactions/sync",
        body,
        creds,
        fetchImpl
      );

      let transactions = result.added.map(mapPlaidTransaction);
      if (params.accountId) {
        const accountId = params.accountId;
        transactions = transactions.filter((t) => t.accountId === accountId);
      }
      if (params.since) {
        const since = params.since;
        transactions = transactions.filter((t) => t.postedAt >= since);
      }

      return { transactions, nextCursor: result.next_cursor };
    },
  };
}
