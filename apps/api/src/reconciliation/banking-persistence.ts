/**
 * D9 reconciliation persistence.
 *
 * This module deliberately sits beside the pure reconciliation engine. It only
 * accepts already-normalized snapshots; it never imports bank-connector, reads
 * an OFX path, calls a provider, accesses credentials, or posts accounting.
 */
import type {
  BankAccount,
  BankAccountType,
  BankingProvider,
  BankTransaction,
  BankTransactionSnapshot,
  BankTransactionReconciliationStatus,
  ReconciliationCandidateKind,
  ReconciliationLink
} from "@sentropic/openerp-domain/banking";
import type { BillingMoney, Payment } from "@sentropic/openerp-domain/billing";

import type { Queryable, TenantContext } from "../db/client";
import { assertTenantContext } from "../db/client";
import { recordAuditEvent } from "../foundation/audit-emit";
import { matchTransactions, type MatchSuggestion } from "./match";

/** Real pool contract. D9 mutations intentionally cannot run against a bare Queryable. */
export interface QueryablePool extends Queryable {
  withClient<T>(fn: (client: Queryable) => Promise<T>): Promise<T>;
}

export type BankingImportProvider = "ofx-upload" | "plaid-sandbox";

/** Local API DTOs: the API has no dependency on the bank connector package. */
export interface BankingImportAccountDto {
  id: string;
  providerRef: string;
  name: string;
  type: BankAccountType;
  currency: string;
  institution: string;
  /** Accepted from normalized provider data but deliberately not persisted in D9 v1. */
  balance?: number;
}

export interface BankingImportTransactionDto {
  id: string;
  accountId: string;
  postedAt: string;
  amount: number;
  currency: string;
  description: string;
  merchant?: string;
  category?: string;
  status: "posted" | "pending";
  providerRef: string;
}

export interface BankingImportDto {
  provider: BankingImportProvider;
  account: BankingImportAccountDto;
  transactions: BankingImportTransactionDto[];
}

interface ValidatedImportTransaction {
  sourceId: string;
  providerRef: string;
  postedAt: string;
  amount: BillingMoney;
  description: string;
  merchant?: string;
  category?: string;
}

interface ValidatedImport {
  provider: BankingProvider;
  account: BankingImportAccountDto;
  postedTransactions: ValidatedImportTransaction[];
  skippedPending: number;
}

export interface BankingImportResult {
  imported: BankTransaction[];
  skippedPending: number;
}

export interface BankingRefreshResult {
  created: ReconciliationLink[];
  proposals: ReconciliationLink[];
}

export class BankingValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BankingValidationError";
  }
}

export class BankingNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BankingNotFoundError";
  }
}

export class BankingConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BankingConflictError";
  }
}

const ACCOUNT_TYPES: readonly BankAccountType[] = [
  "checking",
  "savings",
  "credit",
  "loan",
  "investment",
  "other"
];
const MAX_SNAPSHOT_BYTES = 16 * 1024;
const MAX_SHORT_TEXT = 512;
const MAX_DESCRIPTION_TEXT = 4 * 1024;
const MAX_LIST_LIMIT = 200;

const ACCOUNT_COLUMNS = `
  id,
  organization_id as "organizationId",
  provider,
  provider_account_ref as "providerAccountRef",
  display_name as "displayName",
  account_type as "accountType",
  currency,
  institution,
  active,
  to_char(created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "createdAt",
  to_char(updated_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "updatedAt"
`;

const TRANSACTION_COLUMNS = `
  id,
  organization_id as "organizationId",
  bank_account_id as "bankAccountId",
  provider,
  provider_transaction_ref as "providerTransactionRef",
  to_char(posted_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "postedAt",
  amount,
  raw_description as "rawDescription",
  normalized_snapshot as "normalizedSnapshot",
  reconciliation_status as "reconciliationStatus",
  to_char(created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "createdAt",
  to_char(updated_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "updatedAt"
`;

const LINK_COLUMNS = `
  id,
  organization_id as "organizationId",
  bank_transaction_id as "bankTransactionId",
  candidate_kind as "candidateKind",
  candidate_id as "candidateId",
  score::float8 as score,
  reasons,
  status,
  to_char(created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "createdAt",
  to_char(updated_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "updatedAt"
`;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertOnlyKeys(value: Record<string, unknown>, allowed: readonly string[], field: string): void {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) {
      throw new BankingValidationError(`${field}.${key} is not accepted`);
    }
  }
}

function requireText(value: unknown, field: string, max = MAX_SHORT_TEXT): string {
  if (typeof value !== "string" || value.trim() === "" || value.length > max) {
    throw new BankingValidationError(`${field} must be a non-empty string no longer than ${max} characters`);
  }
  return value;
}

function optionalText(value: unknown, field: string): string | undefined {
  if (value === undefined) return undefined;
  return requireText(value, field);
}

function requireCanonicalCurrency(value: unknown, field: string): string {
  const currency = requireText(value, field, 3);
  if (!/^[A-Z]{3}$/.test(currency)) {
    throw new BankingValidationError(`${field} must be a canonical uppercase ISO-4217 code`);
  }
  return currency;
}

function canonicalizeProvider(value: unknown): BankingProvider {
  if (value === "ofx-upload") return "ofx";
  if (value === "plaid-sandbox") return "plaid_sandbox";
  throw new BankingValidationError("provider must be one of: ofx-upload, plaid-sandbox");
}

function parseStrictTimestamp(value: unknown, field: string): string {
  const raw = requireText(value, field, 64);
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (dateOnly) {
    const year = Number(dateOnly[1]);
    const month = Number(dateOnly[2]);
    const day = Number(dateOnly[3]);
    assertValidCalendarDate(year, month, day, field);
    const ms = Date.parse(`${raw}T00:00:00.000Z`);
    if (!Number.isFinite(ms) || new Date(ms).toISOString().slice(0, 10) !== raw) {
      throw new BankingValidationError(`${field} must be a valid ISO date or timestamp`);
    }
    return new Date(ms).toISOString();
  }
  const timestamp = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?(Z|([+-])(\d{2}):(\d{2}))$/.exec(raw);
  if (!timestamp) {
    throw new BankingValidationError(`${field} must be a strict ISO-8601 timestamp`);
  }
  const year = Number(timestamp[1]);
  const month = Number(timestamp[2]);
  const day = Number(timestamp[3]);
  const hour = Number(timestamp[4]);
  const minute = Number(timestamp[5]);
  const second = Number(timestamp[6]);
  const zoneHour = timestamp[9] === undefined ? 0 : Number(timestamp[9]);
  const zoneMinute = timestamp[10] === undefined ? 0 : Number(timestamp[10]);
  assertValidCalendarDate(year, month, day, field);
  if (hour > 23 || minute > 59 || second > 59 || zoneHour > 23 || zoneMinute > 59) {
    throw new BankingValidationError(`${field} must be a valid ISO-8601 timestamp`);
  }
  const ms = Date.parse(raw);
  if (!Number.isFinite(ms)) {
    throw new BankingValidationError(`${field} must be a valid ISO-8601 timestamp`);
  }
  return new Date(ms).toISOString();
}

function assertValidCalendarDate(year: number, month: number, day: number, field: string): void {
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    throw new BankingValidationError(`${field} must contain a valid calendar date`);
  }
  const check = new Date(Date.UTC(year, month - 1, day));
  if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) {
    throw new BankingValidationError(`${field} must contain a valid calendar date`);
  }
}

function amountToMoney(value: unknown, currency: string): BillingMoney {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new BankingValidationError("transactions[].amount must be finite");
  }
  const scaled = value * 100;
  const amountMinor = Math.round(scaled);
  if (!Number.isSafeInteger(amountMinor) || Math.abs(scaled - amountMinor) > 1e-8) {
    throw new BankingValidationError("transactions[].amount must convert exactly to safe scale-2 minor units");
  }
  return { amountMinor, currency, scale: 2 };
}

function snapshotFor(transaction: ValidatedImportTransaction): BankTransactionSnapshot {
  const snapshot: BankTransactionSnapshot = {
    sourceId: transaction.sourceId,
    providerRef: transaction.providerRef,
    postedAt: transaction.postedAt,
    amount: transaction.amount,
    description: transaction.description
  };
  if (transaction.merchant !== undefined) snapshot.merchant = transaction.merchant;
  if (transaction.category !== undefined) snapshot.category = transaction.category;
  const bytes = Buffer.byteLength(JSON.stringify(snapshot), "utf8");
  if (bytes > MAX_SNAPSHOT_BYTES) {
    throw new BankingValidationError(`normalized transaction snapshot exceeds ${MAX_SNAPSHOT_BYTES} bytes`);
  }
  return snapshot;
}

/** Validates the whole posted batch before a database client is acquired. */
export function validateBankingImport(input: unknown): ValidatedImport {
  if (!isRecord(input)) throw new BankingValidationError("body must be an object");
  assertOnlyKeys(input, ["provider", "account", "transactions"], "body");
  const provider = canonicalizeProvider(input.provider);
  if (!isRecord(input.account)) throw new BankingValidationError("account must be an object");
  assertOnlyKeys(input.account, ["id", "providerRef", "name", "type", "currency", "institution", "balance"], "account");
  const balance = input.account.balance;
  if (balance !== undefined && (typeof balance !== "number" || !Number.isFinite(balance))) {
    throw new BankingValidationError("account.balance must be finite when supplied");
  }
  const account: BankingImportAccountDto = {
    id: requireText(input.account.id, "account.id"),
    providerRef: requireText(input.account.providerRef, "account.providerRef"),
    name: requireText(input.account.name, "account.name", MAX_DESCRIPTION_TEXT),
    type: requireText(input.account.type, "account.type") as BankAccountType,
    currency: requireCanonicalCurrency(input.account.currency, "account.currency"),
    institution: requireText(input.account.institution, "account.institution", MAX_DESCRIPTION_TEXT),
    ...(balance !== undefined ? { balance } : {})
  };
  if (!ACCOUNT_TYPES.includes(account.type)) {
    throw new BankingValidationError(`account.type must be one of: ${ACCOUNT_TYPES.join(", ")}`);
  }
  if (!Array.isArray(input.transactions)) {
    throw new BankingValidationError("transactions must be an array");
  }

  const postedTransactions: ValidatedImportTransaction[] = [];
  const providerRefs = new Set<string>();
  let skippedPending = 0;
  for (const [index, raw] of input.transactions.entries()) {
    if (!isRecord(raw)) throw new BankingValidationError(`transactions[${index}] must be an object`);
    assertOnlyKeys(
      raw,
      ["id", "accountId", "postedAt", "amount", "currency", "description", "merchant", "category", "status", "providerRef"],
      `transactions[${index}]`
    );
    if (raw.status === "pending") {
      skippedPending += 1;
      continue;
    }
    if (raw.status !== "posted") {
      throw new BankingValidationError(`transactions[${index}].status must be posted or pending`);
    }
    const accountId = requireText(raw.accountId, `transactions[${index}].accountId`);
    if (accountId !== account.id) {
      throw new BankingValidationError(`transactions[${index}].accountId must match account.id`);
    }
    const currency = requireCanonicalCurrency(raw.currency, `transactions[${index}].currency`);
    if (currency !== account.currency) {
      throw new BankingValidationError(`transactions[${index}].currency must match account.currency`);
    }
    const providerRef = requireText(raw.providerRef, `transactions[${index}].providerRef`);
    if (providerRefs.has(providerRef)) {
      throw new BankingValidationError(`transactions[${index}].providerRef is duplicated in this batch`);
    }
    providerRefs.add(providerRef);
    const merchant = optionalText(raw.merchant, `transactions[${index}].merchant`);
    const category = optionalText(raw.category, `transactions[${index}].category`);
    const transaction: ValidatedImportTransaction = {
      sourceId: requireText(raw.id, `transactions[${index}].id`),
      providerRef,
      postedAt: parseStrictTimestamp(raw.postedAt, `transactions[${index}].postedAt`),
      amount: amountToMoney(raw.amount, currency),
      description: requireText(raw.description, `transactions[${index}].description`, MAX_DESCRIPTION_TEXT),
      ...(merchant !== undefined ? { merchant } : {}),
      ...(category !== undefined ? { category } : {})
    };
    snapshotFor(transaction);
    postedTransactions.push(transaction);
  }
  return { provider, account, postedTransactions, skippedPending };
}

async function withBankingTransaction<T>(
  pool: QueryablePool,
  context: TenantContext,
  work: (client: Queryable) => Promise<T>
): Promise<T> {
  assertTenantContext(context);
  return pool.withClient(async (client) => {
    await client.query("begin");
    try {
      await client.query("select set_config('app.current_organization_id', $1, true)", [
        context.organizationId
      ]);
      const result = await work(client);
      await client.query("commit");
      return result;
    } catch (error) {
      await client.query("rollback");
      throw error;
    }
  });
}

/** Strictly read-only RLS scope for GET worklists and stored suggestions. */
export async function withBankingReadScope<T>(
  pool: QueryablePool,
  context: TenantContext,
  work: (client: Queryable) => Promise<T>
): Promise<T> {
  assertTenantContext(context);
  return pool.withClient(async (client) => {
    await client.query("begin read only");
    try {
      await client.query("select set_config('app.current_organization_id', $1, true)", [
        context.organizationId
      ]);
      const result = await work(client);
      await client.query("commit");
      return result;
    } catch (error) {
      await client.query("rollback");
      throw error;
    }
  });
}

/** Audit without D9 causing workflow or webhook event fan-out. */
async function recordBankingAudit(
  db: Queryable,
  context: TenantContext,
  action: string,
  resourceType: string,
  resourceId: string,
  afterSummary: Record<string, unknown>
): Promise<void> {
  const suppressedContext: TenantContext & { __workflowDepth: number } = {
    ...context,
    __workflowDepth: 1
  };
  await recordAuditEvent(db, suppressedContext, {
    action,
    resourceType,
    resourceId,
    afterSummary
  });
}

async function findAccountByProviderRef(
  db: Queryable,
  context: TenantContext,
  provider: BankingProvider,
  providerAccountRef: string
): Promise<BankAccount | null> {
  const result = await db.query<BankAccount>(
    `select ${ACCOUNT_COLUMNS}
       from bank_accounts
      where organization_id = $1 and provider = $2 and provider_account_ref = $3`,
    [context.organizationId, provider, providerAccountRef]
  );
  return result.rows[0] ?? null;
}

async function ensureBankAccount(
  db: Queryable,
  context: TenantContext,
  provider: BankingProvider,
  account: BankingImportAccountDto
): Promise<BankAccount> {
  await db.query(
    `insert into bank_accounts (
       organization_id, provider, provider_account_ref, display_name, account_type, currency, institution
     ) values ($1, $2, $3, $4, $5, $6, $7)
     on conflict (organization_id, provider, provider_account_ref) do nothing`,
    [
      context.organizationId,
      provider,
      account.providerRef,
      account.name,
      account.type,
      account.currency,
      account.institution
    ]
  );
  const persisted = await findAccountByProviderRef(db, context, provider, account.providerRef);
  if (!persisted) throw new BankingConflictError("bank account could not be persisted");
  if (persisted.currency !== account.currency) {
    throw new BankingConflictError("bank account currency is immutable and differs from the imported snapshot");
  }
  return persisted;
}

/** Posted-only, provider-gated import. Replays insert neither rows nor import audits. */
export async function importBankingSnapshot(
  pool: QueryablePool,
  context: TenantContext,
  input: unknown
): Promise<BankingImportResult> {
  assertTenantContext(context);
  const validated = validateBankingImport(input);
  if (validated.postedTransactions.length === 0) {
    return { imported: [], skippedPending: validated.skippedPending };
  }
  return withBankingTransaction(pool, context, async (client) => {
    const account = await ensureBankAccount(client, context, validated.provider, validated.account);
    const imported: BankTransaction[] = [];
    for (const transaction of validated.postedTransactions) {
      const snapshot = snapshotFor(transaction);
      const result = await client.query<BankTransaction>(
        `insert into bank_transactions (
           organization_id, bank_account_id, provider, provider_transaction_ref,
           posted_at, amount, raw_description, normalized_snapshot
         ) values ($1, $2, $3, $4, $5::timestamptz, $6::jsonb, $7, $8::jsonb)
         on conflict (organization_id, bank_account_id, provider, provider_transaction_ref) do nothing
         returning ${TRANSACTION_COLUMNS}`,
        [
          context.organizationId,
          account.id,
          validated.provider,
          transaction.providerRef,
          transaction.postedAt,
          JSON.stringify(transaction.amount),
          transaction.description,
          JSON.stringify(snapshot)
        ]
      );
      const inserted = result.rows[0];
      if (!inserted) continue;
      imported.push(inserted);
      await recordBankingAudit(
        client,
        context,
        "banking.bank_transaction.imported",
        "bank_transaction",
        inserted.id,
        { provider: inserted.provider, providerTransactionRef: inserted.providerTransactionRef }
      );
    }
    return { imported, skippedPending: validated.skippedPending };
  });
}

export async function listBankTransactions(
  db: Queryable,
  context: TenantContext,
  options: { status?: BankTransactionReconciliationStatus; limit?: number; offset?: number } = {}
): Promise<BankTransaction[]> {
  assertTenantContext(context);
  const status = options.status ?? null;
  const limit = Math.min(Math.max(options.limit ?? 50, 1), MAX_LIST_LIMIT);
  const offset = Math.max(options.offset ?? 0, 0);
  const result = await db.query<BankTransaction>(
    `select ${TRANSACTION_COLUMNS}
       from bank_transactions
      where organization_id = $1
        and ($2::text is null or reconciliation_status = $2)
      order by posted_at desc, created_at desc
      limit $3 offset $4`,
    [context.organizationId, status, limit, offset]
  );
  return result.rows;
}

export async function listStoredProposals(
  db: Queryable,
  context: TenantContext
): Promise<ReconciliationLink[]> {
  assertTenantContext(context);
  const result = await db.query<ReconciliationLink>(
    `select l.id,
            l.organization_id as "organizationId",
            l.bank_transaction_id as "bankTransactionId",
            l.candidate_kind as "candidateKind",
            l.candidate_id as "candidateId",
            l.score::float8 as score,
            l.reasons,
            l.status,
            to_char(l.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "createdAt",
            to_char(l.updated_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "updatedAt"
       from reconciliation_links l
       join bank_transactions bt
         on bt.id = l.bank_transaction_id and bt.organization_id = l.organization_id
      where l.organization_id = $1
        and l.status = 'proposed'
        and bt.reconciliation_status = 'unmatched'
      order by bt.posted_at desc, l.created_at asc`,
    [context.organizationId]
  );
  return result.rows;
}

interface EligibleTransaction {
  id: string;
  postedAt: string;
  amount: BillingMoney;
  rawDescription: string;
}

interface RejectedPair {
  bankTransactionId: string;
  candidateKind: ReconciliationCandidateKind;
  candidateId: string;
}

function pairKey(transactionId: string, candidateKind: ReconciliationCandidateKind, candidateId: string): string {
  return `${transactionId}:${candidateKind}:${candidateId}`;
}

async function listEligibleRefreshTransactions(
  db: Queryable,
  context: TenantContext
): Promise<EligibleTransaction[]> {
  const result = await db.query<EligibleTransaction>(
    `select bt.id,
            to_char(bt.posted_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "postedAt",
            bt.amount,
            bt.raw_description as "rawDescription"
       from bank_transactions bt
      where bt.organization_id = $1
        and bt.reconciliation_status = 'unmatched'
        and not exists (
          select 1 from reconciliation_links l
           where l.organization_id = bt.organization_id
             and l.bank_transaction_id = bt.id
             and l.status in ('proposed', 'confirmed')
        )
      order by bt.posted_at asc, bt.id asc
      for update`,
    [context.organizationId]
  );
  return result.rows;
}

async function listEligiblePaymentsForRefresh(
  db: Queryable,
  context: TenantContext
): Promise<Payment[]> {
  const result = await db.query<Payment>(
    `select id,
            organization_id as "organizationId",
            invoice_id as "invoiceId",
            company_id as "companyId",
            amount,
            to_char(payment_date, 'YYYY-MM-DD') as "paymentDate",
            method,
            reference,
            to_char(created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "createdAt",
            to_char(updated_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "updatedAt"
       from payments p
      where p.organization_id = $1
        and p.deleted_at is null
        and not exists (
          select 1 from reconciliation_links l
           where l.organization_id = p.organization_id
             and l.candidate_kind = 'payment'
             and l.candidate_id = p.id
             and l.status in ('proposed', 'confirmed')
        )
      order by p.payment_date asc, p.id asc
      limit $2
      for update`,
    [context.organizationId, MAX_LIST_LIMIT]
  );
  return result.rows;
}

async function listRejectedPairs(db: Queryable, context: TenantContext): Promise<Set<string>> {
  const result = await db.query<RejectedPair>(
    `select bank_transaction_id as "bankTransactionId",
            candidate_kind as "candidateKind",
            candidate_id as "candidateId"
       from reconciliation_links
      where organization_id = $1 and status = 'rejected'`,
    [context.organizationId]
  );
  return new Set(result.rows.map((pair) => pairKey(pair.bankTransactionId, pair.candidateKind, pair.candidateId)));
}

/**
 * Reuses the pure engine's pair scoring while excluding only durable rejected
 * pairs. A full pair matrix keeps its deterministic greedy ordering and lets a
 * transaction fall through to its next valid candidate after a rejection.
 */
function matchExcludingRejectedPairs(
  transactions: EligibleTransaction[],
  payments: Payment[],
  rejectedPairs: ReadonlySet<string>
) {
  const bankTransactions = transactions.map((transaction) => ({
    id: transaction.id,
    postedAt: transaction.postedAt,
    amountMinor: transaction.amount.amountMinor,
    currency: transaction.amount.currency,
    description: transaction.rawDescription
  }));
  const candidates = payments.map((payment) => ({
    id: payment.id,
    kind: "payment" as const,
    date: payment.paymentDate,
    amountMinor: payment.amount.amountMinor,
    currency: payment.amount.currency,
    ...(payment.reference ? { reference: payment.reference } : {}),
    ...(payment.invoiceId ? { label: payment.invoiceId } : {})
  }));
  const scored: MatchSuggestion[] = [];
  for (const transaction of bankTransactions) {
    for (const candidate of candidates) {
      if (rejectedPairs.has(pairKey(transaction.id, candidate.kind, candidate.id))) continue;
      const match = matchTransactions([transaction], [candidate]).matched[0];
      if (match) scored.push(match);
    }
  }
  scored.sort(
    (a, b) =>
      b.score - a.score ||
      a.transactionId.localeCompare(b.transactionId) ||
      a.candidateId.localeCompare(b.candidateId)
  );
  const usedTransactions = new Set<string>();
  const usedCandidates = new Set<string>();
  return scored.filter((proposal) => {
    const candidateKey = `${proposal.candidateKind}:${proposal.candidateId}`;
    if (usedTransactions.has(proposal.transactionId) || usedCandidates.has(candidateKey)) return false;
    usedTransactions.add(proposal.transactionId);
    usedCandidates.add(candidateKey);
    return true;
  });
}

/** Explicit write operation. GET suggestions never calls this function. */
export async function refreshReconciliationProposals(
  pool: QueryablePool,
  context: TenantContext
): Promise<BankingRefreshResult> {
  assertTenantContext(context);
  return withBankingTransaction(pool, context, async (client) => {
    // Keep lock acquisition deterministic on the single checked-out client.
    // This also makes a refresh serialize cleanly with ignore/confirm work.
    const transactions = await listEligibleRefreshTransactions(client, context);
    const payments = await listEligiblePaymentsForRefresh(client, context);
    const rejectedPairs = await listRejectedPairs(client, context);
    const matched = matchExcludingRejectedPairs(transactions, payments, rejectedPairs);
    const created: ReconciliationLink[] = [];
    for (const proposal of matched) {
      const inserted = await client.query<ReconciliationLink>(
        `insert into reconciliation_links (
           organization_id, bank_transaction_id, candidate_kind, candidate_id, score, reasons
         ) values ($1, $2, $3, $4, $5, $6::jsonb)
         on conflict (organization_id, bank_transaction_id, candidate_kind, candidate_id) do nothing
         returning ${LINK_COLUMNS}`,
        [
          context.organizationId,
          proposal.transactionId,
          proposal.candidateKind,
          proposal.candidateId,
          proposal.score,
          JSON.stringify(proposal.reasons)
        ]
      );
      const link = inserted.rows[0];
      if (!link) continue;
      created.push(link);
      await recordBankingAudit(client, context, "banking.reconciliation.proposed", "reconciliation_link", link.id, {
        bankTransactionId: link.bankTransactionId,
        candidateKind: link.candidateKind,
        candidateId: link.candidateId,
        score: link.score
      });
    }
    return { created, proposals: await listStoredProposals(client, context) };
  });
}

async function findLinkForUpdate(
  db: Queryable,
  context: TenantContext,
  id: string
): Promise<ReconciliationLink> {
  const result = await db.query<ReconciliationLink>(
    `select ${LINK_COLUMNS}
       from reconciliation_links
      where id = $1 and organization_id = $2
      for update`,
    [id, context.organizationId]
  );
  const link = result.rows[0];
  if (!link) throw new BankingNotFoundError("reconciliation proposal was not found");
  return link;
}

async function findLink(
  db: Queryable,
  context: TenantContext,
  id: string
): Promise<ReconciliationLink> {
  const result = await db.query<ReconciliationLink>(
    `select ${LINK_COLUMNS}
       from reconciliation_links
      where id = $1 and organization_id = $2`,
    [id, context.organizationId]
  );
  const link = result.rows[0];
  if (!link) throw new BankingNotFoundError("reconciliation proposal was not found");
  return link;
}

async function findTransactionForUpdate(
  db: Queryable,
  context: TenantContext,
  id: string
): Promise<BankTransaction> {
  const result = await db.query<BankTransaction>(
    `select ${TRANSACTION_COLUMNS}
       from bank_transactions
      where id = $1 and organization_id = $2
      for update`,
    [id, context.organizationId]
  );
  const transaction = result.rows[0];
  if (!transaction) throw new BankingNotFoundError("bank transaction was not found");
  return transaction;
}

/** All state transitions lock parent transaction first, then the child link. */
async function lockLinkAndTransaction(
  db: Queryable,
  context: TenantContext,
  linkId: string
): Promise<{ link: ReconciliationLink; transaction: BankTransaction }> {
  const preliminary = await findLink(db, context, linkId);
  const transaction = await findTransactionForUpdate(db, context, preliminary.bankTransactionId);
  const link = await findLinkForUpdate(db, context, linkId);
  if (link.bankTransactionId !== transaction.id) {
    throw new BankingConflictError("proposal parent changed before transition");
  }
  return { link, transaction };
}

async function lockEligiblePayment(
  db: Queryable,
  context: TenantContext,
  paymentId: string
): Promise<void> {
  const result = await db.query<{ id: string }>(
    `select id
       from payments
      where id = $1 and organization_id = $2 and deleted_at is null
      for update`,
    [paymentId, context.organizationId]
  );
  if (!result.rows[0]) {
    throw new BankingConflictError("payment candidate is missing, cross-tenant, or deleted");
  }
}

async function assertCandidateNotConfirmed(
  db: Queryable,
  context: TenantContext,
  link: ReconciliationLink
): Promise<void> {
  const result = await db.query<{ id: string }>(
    `select id
       from reconciliation_links
      where organization_id = $1
        and candidate_kind = $2
        and candidate_id = $3
        and status = 'confirmed'
      limit 1`,
    [context.organizationId, link.candidateKind, link.candidateId]
  );
  if (result.rows[0]) {
    throw new BankingConflictError("candidate is already confirmed by another bank transaction");
  }
}

/** Confirm only a durable proposed link. Repeating an already-confirmed request is a no-op. */
export async function confirmReconciliationProposal(
  pool: QueryablePool,
  context: TenantContext,
  linkId: string
): Promise<ReconciliationLink> {
  return withBankingTransaction(pool, context, async (client) => {
    const { link, transaction } = await lockLinkAndTransaction(client, context, linkId);
    if (link.status === "confirmed") return link;
    if (link.status === "rejected") {
      throw new BankingConflictError("rejected proposals cannot be confirmed");
    }
    if (transaction.reconciliationStatus !== "unmatched") {
      throw new BankingConflictError("bank transaction is not available for confirmation");
    }
    await lockEligiblePayment(client, context, link.candidateId);
    await assertCandidateNotConfirmed(client, context, link);

    const confirmed = await client.query<ReconciliationLink>(
      `update reconciliation_links
          set status = 'confirmed', updated_at = now()
        where id = $1 and organization_id = $2 and status = 'proposed'
        returning ${LINK_COLUMNS}`,
      [link.id, context.organizationId]
    );
    const updatedLink = confirmed.rows[0];
    if (!updatedLink) throw new BankingConflictError("proposal changed before confirmation");
    const updatedTransaction = await client.query<{ id: string }>(
      `update bank_transactions
          set reconciliation_status = 'matched', updated_at = now()
        where id = $1 and organization_id = $2 and reconciliation_status = 'unmatched'
        returning id`,
      [transaction.id, context.organizationId]
    );
    if (!updatedTransaction.rows[0]) throw new BankingConflictError("bank transaction changed before confirmation");
    await recordBankingAudit(client, context, "banking.reconciliation.confirmed", "reconciliation_link", updatedLink.id, {
      bankTransactionId: updatedLink.bankTransactionId,
      candidateKind: updatedLink.candidateKind,
      candidateId: updatedLink.candidateId
    });
    return updatedLink;
  });
}

/** Reject only a durable proposal. Repeating a rejection is a no-op. */
export async function rejectReconciliationProposal(
  pool: QueryablePool,
  context: TenantContext,
  linkId: string
): Promise<ReconciliationLink> {
  return withBankingTransaction(pool, context, async (client) => {
    const { link, transaction } = await lockLinkAndTransaction(client, context, linkId);
    if (link.status === "rejected") return link;
    if (link.status === "confirmed") {
      throw new BankingConflictError("confirmed proposals must be unmatched before rejection");
    }
    if (transaction.reconciliationStatus !== "unmatched") {
      throw new BankingConflictError("bank transaction is not available for rejection");
    }
    const rejected = await client.query<ReconciliationLink>(
      `update reconciliation_links
          set status = 'rejected', updated_at = now()
        where id = $1 and organization_id = $2 and status = 'proposed'
        returning ${LINK_COLUMNS}`,
      [link.id, context.organizationId]
    );
    const updated = rejected.rows[0];
    if (!updated) throw new BankingConflictError("proposal changed before rejection");
    await recordBankingAudit(client, context, "banking.reconciliation.rejected", "reconciliation_link", updated.id, {
      bankTransactionId: updated.bankTransactionId,
      candidateKind: updated.candidateKind,
      candidateId: updated.candidateId
    });
    return updated;
  });
}

/** Restores a confirmed attestation to its durable proposed state; it never posts journals. */
export async function unmatchReconciliationProposal(
  pool: QueryablePool,
  context: TenantContext,
  linkId: string
): Promise<ReconciliationLink> {
  return withBankingTransaction(pool, context, async (client) => {
    const { link, transaction } = await lockLinkAndTransaction(client, context, linkId);
    if (link.status === "proposed") return link;
    if (link.status === "rejected") throw new BankingConflictError("rejected proposals cannot be unmatched");
    if (transaction.reconciliationStatus !== "matched") {
      throw new BankingConflictError("bank transaction is not matched");
    }
    const proposed = await client.query<ReconciliationLink>(
      `update reconciliation_links
          set status = 'proposed', updated_at = now()
        where id = $1 and organization_id = $2 and status = 'confirmed'
        returning ${LINK_COLUMNS}`,
      [link.id, context.organizationId]
    );
    const updated = proposed.rows[0];
    if (!updated) throw new BankingConflictError("link changed before unmatch");
    const unmatched = await client.query<{ id: string }>(
      `update bank_transactions
          set reconciliation_status = 'unmatched', updated_at = now()
        where id = $1 and organization_id = $2 and reconciliation_status = 'matched'
        returning id`,
      [transaction.id, context.organizationId]
    );
    if (!unmatched.rows[0]) throw new BankingConflictError("bank transaction changed before unmatch");
    await recordBankingAudit(client, context, "banking.reconciliation.proposed", "reconciliation_link", updated.id, {
      bankTransactionId: updated.bankTransactionId,
      restoredFrom: "confirmed"
    });
    return updated;
  });
}

/** Ignore only an unmatched transaction without an active proposal. Repeating is a no-op. */
export async function ignoreBankTransaction(
  pool: QueryablePool,
  context: TenantContext,
  transactionId: string
): Promise<BankTransaction> {
  return withBankingTransaction(pool, context, async (client) => {
    const transaction = await findTransactionForUpdate(client, context, transactionId);
    if (transaction.reconciliationStatus === "ignored") return transaction;
    if (transaction.reconciliationStatus !== "unmatched") {
      throw new BankingConflictError("matched bank transactions must be unmatched before ignore");
    }
    const activeProposal = await client.query<{ id: string }>(
      `select id
         from reconciliation_links
        where organization_id = $1 and bank_transaction_id = $2 and status = 'proposed'
        for update`,
      [context.organizationId, transaction.id]
    );
    if (activeProposal.rows[0]) {
      throw new BankingConflictError("reject the active proposal before ignoring this bank transaction");
    }
    const ignored = await client.query<BankTransaction>(
      `update bank_transactions
          set reconciliation_status = 'ignored', updated_at = now()
        where id = $1 and organization_id = $2 and reconciliation_status = 'unmatched'
        returning ${TRANSACTION_COLUMNS}`,
      [transaction.id, context.organizationId]
    );
    const updated = ignored.rows[0];
    if (!updated) throw new BankingConflictError("bank transaction changed before ignore");
    await recordBankingAudit(client, context, "banking.bank_transaction.ignored", "bank_transaction", updated.id, {
      reconciliationStatus: updated.reconciliationStatus
    });
    return updated;
  });
}
