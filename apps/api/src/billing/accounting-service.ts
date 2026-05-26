import type {
  Account,
  AccountType,
  BillingMoney,
  CreateAccountInput,
  CreateJournalEntryInput,
  JournalEntry,
  JournalEntryWithLines,
  UpdateAccountInput
} from "@sentropic/openerp-domain/billing";

import type { Queryable, TenantContext } from "../db/client";
import { assertTenantContext } from "../db/client";
import { recordAuditEvent } from "../foundation/audit-emit";
import { emitBillingTimelineEntry } from "./billing-timeline";
import {
  findAccountByCode,
  findAccountById,
  insertAccount,
  listAccounts,
  softDeleteAccount,
  updateAccount as updateAccountRepo
} from "./accounts";
import {
  findJournalEntryById,
  findJournalEntryBySource,
  findJournalEntryWithLines,
  insertJournalEntry,
  insertJournalEntryLine,
  listJournalEntriesRepo,
  softDeleteJournalEntry,
  updateJournalEntryStatus
} from "./journal-entries";
import { findInvoiceById } from "./invoices";
import { findPaymentById } from "./payments";

// Accounting service for DS 4.3.
// Enforces the double-entry balance invariant on every write.

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export class AccountNotFoundError extends Error {
  readonly code = "ACCOUNT_NOT_FOUND";
  constructor(idOrCode: string) {
    super(`Account '${idOrCode}' not found`);
  }
}

export class JournalEntryNotFoundError extends Error {
  readonly code = "JOURNAL_ENTRY_NOT_FOUND";
  constructor(id: string) {
    super(`JournalEntry ${id} not found`);
  }
}

export class UnbalancedJournalEntryError extends Error {
  readonly code = "UNBALANCED_JOURNAL_ENTRY";
  constructor(sumDebits: number, sumCredits: number) {
    super(
      `Journal entry is not balanced: sum debits ${sumDebits} !== sum credits ${sumCredits}`
    );
  }
}

export class JournalPostingError extends Error {
  readonly code = "JOURNAL_POSTING_ERROR";
  constructor(message: string) {
    super(message);
  }
}

export class JournalEntryTransitionError extends Error {
  readonly code = "JOURNAL_ENTRY_ILLEGAL_TRANSITION";
  constructor(current: string, target: string) {
    super(`Cannot transition JournalEntry from '${current}' to '${target}'`);
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function zeroMoney(currency: string, scale: number): BillingMoney {
  return { amountMinor: 0, currency, scale };
}

function assertBalanced(lines: Array<{ debit: BillingMoney; credit: BillingMoney }>): void {
  let sumDebits = 0;
  let sumCredits = 0;
  for (const l of lines) {
    sumDebits += l.debit.amountMinor;
    sumCredits += l.credit.amountMinor;
  }
  if (sumDebits !== sumCredits) {
    throw new UnbalancedJournalEntryError(sumDebits, sumCredits);
  }
}

async function requireAccountByCode(
  db: Queryable,
  context: TenantContext,
  code: string
): Promise<Account> {
  const account = await findAccountByCode(db, context, code);
  if (!account) {
    throw new JournalPostingError(
      `Required account with code '${code}' not found in the chart of accounts. ` +
        `Seed the default chart of accounts before posting.`
    );
  }
  return account;
}

// ---------------------------------------------------------------------------
// Account CRUD
// ---------------------------------------------------------------------------

export async function createAccount(
  db: Queryable,
  context: TenantContext,
  input: CreateAccountInput
): Promise<Account> {
  assertTenantContext(context);
  const account = await insertAccount(db, context, {
    code: input.code,
    name: input.name,
    type: input.type,
    active: input.active ?? true
  });
  await recordAuditEvent(db, context, {
    action: "billing.account.created",
    resourceType: "account",
    resourceId: account.id,
    beforeSummary: null,
    afterSummary: { code: account.code, name: account.name, type: account.type }
  });
  await emitBillingTimelineEntry(db, context, {
    resourceType: "account",
    resourceId: account.id,
    entryType: "billing.account.created",
    payloadSummary: { code: account.code, name: account.name, type: account.type }
  });
  return account;
}

export async function updateAccountService(
  db: Queryable,
  context: TenantContext,
  id: string,
  input: UpdateAccountInput
): Promise<Account> {
  assertTenantContext(context);
  const before = await findAccountById(db, context, id);
  if (!before) throw new AccountNotFoundError(id);
  const updated = await updateAccountRepo(db, context, id, input);
  if (!updated) throw new AccountNotFoundError(id);
  await recordAuditEvent(db, context, {
    action: "billing.account.updated",
    resourceType: "account",
    resourceId: id,
    beforeSummary: { code: before.code, name: before.name, type: before.type, active: before.active },
    afterSummary: { code: updated.code, name: updated.name, type: updated.type, active: updated.active }
  });
  await emitBillingTimelineEntry(db, context, {
    resourceType: "account",
    resourceId: id,
    entryType: "billing.account.updated",
    payloadSummary: { code: updated.code, name: updated.name }
  });
  return updated;
}

export async function deleteAccount(
  db: Queryable,
  context: TenantContext,
  id: string
): Promise<void> {
  assertTenantContext(context);
  const before = await findAccountById(db, context, id);
  if (!before) throw new AccountNotFoundError(id);
  const deleted = await softDeleteAccount(db, context, id);
  if (!deleted) throw new AccountNotFoundError(id);
  await recordAuditEvent(db, context, {
    action: "billing.account.deleted",
    resourceType: "account",
    resourceId: id,
    beforeSummary: { code: before.code, name: before.name, type: before.type },
    afterSummary: null
  });
  await emitBillingTimelineEntry(db, context, {
    resourceType: "account",
    resourceId: id,
    entryType: "billing.account.deleted",
    payloadSummary: { code: before.code, name: before.name }
  });
}

export async function getAccountById(
  db: Queryable,
  context: TenantContext,
  id: string
): Promise<Account | null> {
  return findAccountById(db, context, id);
}

export { listAccounts };

// ---------------------------------------------------------------------------
// JournalEntry CRUD
// ---------------------------------------------------------------------------

export async function createJournalEntry(
  db: Queryable,
  context: TenantContext,
  input: CreateJournalEntryInput
): Promise<JournalEntryWithLines> {
  assertTenantContext(context);

  // Validate: each line must have exactly one of debit/credit non-zero
  for (const l of input.lines) {
    const hasDebit = l.debit.amountMinor > 0;
    const hasCredit = l.credit.amountMinor > 0;
    const bothZero = l.debit.amountMinor === 0 && l.credit.amountMinor === 0;
    const bothNonZero = hasDebit && hasCredit;
    if (bothZero || bothNonZero) {
      throw new UnbalancedJournalEntryError(
        input.lines.reduce((s, ln) => s + ln.debit.amountMinor, 0),
        input.lines.reduce((s, ln) => s + ln.credit.amountMinor, 0)
      );
    }
  }

  // Validate: entry must balance
  assertBalanced(input.lines);

  const entry = await insertJournalEntry(db, context, {
    entryDate: input.entryDate,
    reference: input.reference ?? null,
    description: input.description ?? null,
    sourceType: input.sourceType ?? "manual",
    sourceId: input.sourceId ?? null,
    status: "draft"
  });

  const persistedLines = [];
  for (const l of input.lines) {
    const line = await insertJournalEntryLine(db, context, {
      journalEntryId: entry.id,
      accountId: l.accountId,
      debit: l.debit,
      credit: l.credit,
      description: l.description ?? null
    });
    persistedLines.push(line);
  }

  await recordAuditEvent(db, context, {
    action: "billing.journal_entry.created",
    resourceType: "journal_entry",
    resourceId: entry.id,
    beforeSummary: null,
    afterSummary: {
      entryDate: entry.entryDate,
      status: entry.status,
      sourceType: entry.sourceType,
      lineCount: persistedLines.length
    }
  });
  await emitBillingTimelineEntry(db, context, {
    resourceType: "journal_entry",
    resourceId: entry.id,
    entryType: "billing.journal_entry.created",
    payloadSummary: { entryDate: entry.entryDate, lineCount: persistedLines.length }
  });

  return { ...entry, lines: persistedLines };
}

export async function postJournalEntry(
  db: Queryable,
  context: TenantContext,
  id: string
): Promise<JournalEntryWithLines> {
  assertTenantContext(context);
  const before = await findJournalEntryById(db, context, id);
  if (!before) throw new JournalEntryNotFoundError(id);
  if (before.status !== "draft") {
    throw new JournalEntryTransitionError(before.status, "posted");
  }
  const postedAt = new Date().toISOString();
  const updated = await updateJournalEntryStatus(db, context, id, "posted", { postedAt });
  if (!updated) throw new JournalEntryNotFoundError(id);
  const lines = await listLinesForEntry(db, context, id);
  await recordAuditEvent(db, context, {
    action: "billing.journal_entry.posted",
    resourceType: "journal_entry",
    resourceId: id,
    beforeSummary: { status: before.status },
    afterSummary: { status: "posted", postedAt }
  });
  await emitBillingTimelineEntry(db, context, {
    resourceType: "journal_entry",
    resourceId: id,
    entryType: "billing.journal_entry.posted",
    payloadSummary: { entryDate: updated.entryDate }
  });
  return { ...updated, lines };
}

export async function voidJournalEntry(
  db: Queryable,
  context: TenantContext,
  id: string
): Promise<JournalEntryWithLines> {
  assertTenantContext(context);
  const before = await findJournalEntryById(db, context, id);
  if (!before) throw new JournalEntryNotFoundError(id);
  if (before.status === "void") {
    throw new JournalEntryTransitionError(before.status, "void");
  }
  const updated = await updateJournalEntryStatus(db, context, id, "void");
  if (!updated) throw new JournalEntryNotFoundError(id);
  const lines = await listLinesForEntry(db, context, id);
  await recordAuditEvent(db, context, {
    action: "billing.journal_entry.voided",
    resourceType: "journal_entry",
    resourceId: id,
    beforeSummary: { status: before.status },
    afterSummary: { status: "void" }
  });
  await emitBillingTimelineEntry(db, context, {
    resourceType: "journal_entry",
    resourceId: id,
    entryType: "billing.journal_entry.voided",
    payloadSummary: { entryDate: updated.entryDate }
  });
  return { ...updated, lines };
}

export async function deleteJournalEntryService(
  db: Queryable,
  context: TenantContext,
  id: string
): Promise<void> {
  assertTenantContext(context);
  const before = await findJournalEntryById(db, context, id);
  if (!before) throw new JournalEntryNotFoundError(id);
  if (before.status !== "draft") {
    throw new JournalEntryTransitionError(before.status, "deleted");
  }
  const deleted = await softDeleteJournalEntry(db, context, id);
  if (!deleted) throw new JournalEntryNotFoundError(id);
  await recordAuditEvent(db, context, {
    action: "billing.journal_entry.deleted",
    resourceType: "journal_entry",
    resourceId: id,
    beforeSummary: { status: before.status, entryDate: before.entryDate },
    afterSummary: null
  });
  await emitBillingTimelineEntry(db, context, {
    resourceType: "journal_entry",
    resourceId: id,
    entryType: "billing.journal_entry.deleted",
    payloadSummary: { entryDate: before.entryDate }
  });
}

export async function getJournalEntryById(
  db: Queryable,
  context: TenantContext,
  id: string
): Promise<JournalEntryWithLines | null> {
  return findJournalEntryWithLines(db, context, id);
}

export async function listJournalEntries(
  db: Queryable,
  context: TenantContext,
  options: {
    sourceType?: string;
    sourceId?: string;
    status?: string;
    limit?: number;
    offset?: number;
  } = {}
): Promise<JournalEntry[]> {
  return listJournalEntriesRepo(db, context, options as Parameters<typeof listJournalEntriesRepo>[2]);
}

// ---------------------------------------------------------------------------
// Posting from Invoice
// ---------------------------------------------------------------------------

/**
 * Post a balanced journal entry from an issued invoice.
 * Debit: AR (1100) = invoice.total
 * Credit: Revenue (4000) = invoice.subtotal
 *         + GST Payable (2310) per CA-GST jurisdiction
 *         + QST Payable (2320) per CA-QC-QST jurisdiction
 *         + Tax Payable (2300) for any other jurisdiction
 * Throws JournalPostingError if a required account is missing.
 */
export async function postInvoiceToJournal(
  db: Queryable,
  context: TenantContext,
  invoiceId: string
): Promise<JournalEntryWithLines> {
  assertTenantContext(context);

  const invoice = await findInvoiceById(db, context, invoiceId);
  if (!invoice) {
    throw new JournalPostingError(`Invoice '${invoiceId}' not found`);
  }
  if (invoice.status !== "issued" && invoice.status !== "paid" && invoice.status !== "partially_paid") {
    throw new JournalPostingError(
      `Invoice '${invoiceId}' must be issued (or paid) to post to journal (current: '${invoice.status}')`
    );
  }

  // Resolve required accounts
  const arAccount = await requireAccountByCode(db, context, "1100"); // Accounts Receivable
  const revenueAccount = await requireAccountByCode(db, context, "4000"); // Service Revenue

  const currency = invoice.total.currency;
  const scale = invoice.total.scale;

  const lines: Array<{
    accountId: string;
    debit: BillingMoney;
    credit: BillingMoney;
    description: string | null;
  }> = [];

  // Debit AR = total
  lines.push({
    accountId: arAccount.id,
    debit: { amountMinor: invoice.total.amountMinor, currency, scale },
    credit: zeroMoney(currency, scale),
    description: `AR — ${invoice.invoiceNumber}`
  });

  // Credit Revenue = subtotal
  lines.push({
    accountId: revenueAccount.id,
    debit: zeroMoney(currency, scale),
    credit: { amountMinor: invoice.subtotal.amountMinor, currency, scale },
    description: `Revenue — ${invoice.invoiceNumber}`
  });

  // Credit tax payable accounts per breakdown
  const breakdown = invoice.taxBreakdown ?? [];
  for (const taxLine of breakdown) {
    let accountCode: string;
    const jur = taxLine.jurisdiction.toUpperCase();
    if (jur === "CA-GST") {
      accountCode = "2310";
    } else if (jur === "CA-QC-QST") {
      accountCode = "2320";
    } else {
      accountCode = "2300";
    }
    const taxAccount = await findAccountByCode(db, context, accountCode);
    if (!taxAccount) {
      throw new JournalPostingError(
        `Tax payable account with code '${accountCode}' not found for jurisdiction '${taxLine.jurisdiction}'. ` +
          `Seed the default chart of accounts.`
      );
    }
    lines.push({
      accountId: taxAccount.id,
      debit: zeroMoney(currency, scale),
      credit: {
        amountMinor: taxLine.amount.amountMinor,
        currency: taxLine.amount.currency,
        scale: taxLine.amount.scale
      },
      description: `${taxLine.label} — ${invoice.invoiceNumber}`
    });
  }

  // Verify balance
  assertBalanced(lines);

  const now = new Date();
  const entryDate = now.toISOString().slice(0, 10);
  const postedAt = now.toISOString();

  const entry = await insertJournalEntry(db, context, {
    entryDate,
    reference: invoice.invoiceNumber,
    description: `Journal entry for invoice ${invoice.invoiceNumber}`,
    sourceType: "invoice",
    sourceId: invoiceId,
    status: "posted",
    postedAt
  });

  const persistedLines = [];
  for (const l of lines) {
    const line = await insertJournalEntryLine(db, context, {
      journalEntryId: entry.id,
      accountId: l.accountId,
      debit: l.debit,
      credit: l.credit,
      description: l.description
    });
    persistedLines.push(line);
  }

  await recordAuditEvent(db, context, {
    action: "billing.journal_entry.created",
    resourceType: "journal_entry",
    resourceId: entry.id,
    beforeSummary: null,
    afterSummary: {
      invoiceId,
      invoiceNumber: invoice.invoiceNumber,
      sourceType: "invoice",
      status: "posted"
    }
  });
  await recordAuditEvent(db, context, {
    action: "billing.journal_entry.posted",
    resourceType: "journal_entry",
    resourceId: entry.id,
    beforeSummary: { status: "draft" },
    afterSummary: { status: "posted", postedAt }
  });
  await emitBillingTimelineEntry(db, context, {
    resourceType: "journal_entry",
    resourceId: entry.id,
    entryType: "billing.journal_entry.posted",
    payloadSummary: { invoiceNumber: invoice.invoiceNumber, sourceType: "invoice", entryDate }
  });

  return { ...entry, lines: persistedLines };
}

// ---------------------------------------------------------------------------
// Posting from Payment
// ---------------------------------------------------------------------------

/**
 * Post a balanced journal entry from a recorded payment.
 * Debit: Cash/Bank (1000) = payment.amount
 * Credit: AR (1100) = payment.amount
 */
export async function postPaymentToJournal(
  db: Queryable,
  context: TenantContext,
  paymentId: string
): Promise<JournalEntryWithLines> {
  assertTenantContext(context);

  const payment = await findPaymentById(db, context, paymentId);
  if (!payment) {
    throw new JournalPostingError(`Payment '${paymentId}' not found`);
  }

  // Resolve required accounts
  const cashAccount = await requireAccountByCode(db, context, "1000"); // Cash/Bank
  const arAccount = await requireAccountByCode(db, context, "1100"); // Accounts Receivable

  const currency = payment.amount.currency;
  const scale = payment.amount.scale;

  const lines = [
    {
      accountId: cashAccount.id,
      debit: { amountMinor: payment.amount.amountMinor, currency, scale },
      credit: zeroMoney(currency, scale),
      description: `Cash receipt — payment ${paymentId.slice(0, 8)}`
    },
    {
      accountId: arAccount.id,
      debit: zeroMoney(currency, scale),
      credit: { amountMinor: payment.amount.amountMinor, currency, scale },
      description: `AR cleared — payment ${paymentId.slice(0, 8)}`
    }
  ];

  assertBalanced(lines);

  const now = new Date();
  const entryDate = payment.paymentDate ?? now.toISOString().slice(0, 10);
  const postedAt = now.toISOString();

  const entry = await insertJournalEntry(db, context, {
    entryDate,
    reference: payment.reference ?? null,
    description: `Journal entry for payment ${paymentId.slice(0, 8)}`,
    sourceType: "payment",
    sourceId: paymentId,
    status: "posted",
    postedAt
  });

  const persistedLines = [];
  for (const l of lines) {
    const line = await insertJournalEntryLine(db, context, {
      journalEntryId: entry.id,
      accountId: l.accountId,
      debit: l.debit,
      credit: l.credit,
      description: l.description
    });
    persistedLines.push(line);
  }

  await recordAuditEvent(db, context, {
    action: "billing.journal_entry.created",
    resourceType: "journal_entry",
    resourceId: entry.id,
    beforeSummary: null,
    afterSummary: { paymentId, sourceType: "payment", status: "posted" }
  });
  await recordAuditEvent(db, context, {
    action: "billing.journal_entry.posted",
    resourceType: "journal_entry",
    resourceId: entry.id,
    beforeSummary: { status: "draft" },
    afterSummary: { status: "posted", postedAt }
  });
  await emitBillingTimelineEntry(db, context, {
    resourceType: "journal_entry",
    resourceId: entry.id,
    entryType: "billing.journal_entry.posted",
    payloadSummary: { paymentId, sourceType: "payment", entryDate }
  });

  return { ...entry, lines: persistedLines };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

async function listLinesForEntry(
  db: Queryable,
  context: TenantContext,
  id: string
) {
  const { listLinesForJournalEntry } = await import("./journal-entries");
  return listLinesForJournalEntry(db, context, id);
}
