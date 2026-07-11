import { describe, expect, it } from "vitest";

import type {
  Account,
  BillingMoney,
  Invoice,
  InvoiceStatus,
  JournalEntry,
  JournalEntryLine,
  JournalEntryStatus,
  Payment,
  TaxBreakdownLine
} from "@sentropic/openerp-domain/billing";

import type { Queryable } from "../../src/db/client";
import {
  AccountNotFoundError,
  JournalEntryNotFoundError,
  JournalEntryTransitionError,
  JournalPostingError,
  UnbalancedJournalEntryError,
  createAccount,
  createJournalEntry,
  deleteAccount,
  deleteJournalEntryService,
  getAccountById,
  getJournalEntryById,
  listAccounts,
  postInvoiceToJournal,
  postJournalEntry,
  postPaymentToJournal,
  updateAccountService,
  voidJournalEntry
} from "../../src/billing/accounting-service";

// ---------------------------------------------------------------------------
// Fake DB
// ---------------------------------------------------------------------------

function makeFakeDb(opts: {
  accounts?: Account[];
  journalEntries?: (JournalEntry & { _deleted?: boolean })[];
  journalEntryLines?: JournalEntryLine[];
  invoices?: (Invoice & { _deleted?: boolean })[];
  payments?: (Payment & { _deleted?: boolean })[];
} = {}) {
  const accounts: (Account & { _deleted?: boolean })[] = opts.accounts ?? [];
  const journalEntries: (JournalEntry & { _deleted?: boolean })[] = opts.journalEntries ?? [];
  const journalEntryLines: JournalEntryLine[] = opts.journalEntryLines ?? [];
  const invoices: (Invoice & { _deleted?: boolean })[] = opts.invoices ?? [];
  const payments: (Payment & { _deleted?: boolean })[] = opts.payments ?? [];
  const audits: string[] = [];
  const timelines: string[] = [];

  let seq = 0;
  function nextId(prefix: string): string {
    return `${prefix}_${++seq}`;
  }

  const db: Queryable = {
    async query<T = unknown>(text: string, values: unknown[] = []): Promise<{ rows: T[] }> {
      const t = text;

      // insert into accounts
      if (t.includes("insert into accounts")) {
        const [orgId, code, name, type, active] = values as [string, string, string, string, boolean];
        const row: Account = {
          id: nextId("acc"),
          organizationId: orgId,
          code,
          name,
          type: type as Account["type"],
          active,
          createdAt: "2026-05-25T00:00:00.000Z",
          updatedAt: "2026-05-25T00:00:00.000Z"
        };
        accounts.push(row);
        return { rows: [row as unknown as T] };
      }

      // find account by id
      if (t.includes("from accounts") && t.includes("where id = $1")) {
        const [id, orgId] = values as [string, string];
        const found = accounts.find((a) => a.id === id && a.organizationId === orgId && !a._deleted);
        return { rows: found ? [found as unknown as T] : [] };
      }

      // find account by code
      if (t.includes("from accounts") && t.includes("where code = $1")) {
        const [code, orgId] = values as [string, string];
        const found = accounts.find((a) => a.code === code && a.organizationId === orgId && !a._deleted);
        return { rows: found ? [found as unknown as T] : [] };
      }

      // list accounts
      if (t.includes("from accounts") && t.includes("order by code asc")) {
        const [orgId] = values as [string];
        const rows = accounts.filter((a) => a.organizationId === orgId && !a._deleted);
        return { rows: rows as unknown as T[] };
      }

      // update accounts
      if (t.includes("update accounts") && t.includes("updated_at = now()") && !t.includes("deleted_at")) {
        const [id, orgId] = values as [string, string, ...unknown[]];
        const acc = accounts.find((a) => a.id === id && a.organizationId === orgId && !a._deleted);
        if (!acc) return { rows: [] };
        // apply updates from SET clauses
        if (t.includes("name =")) {
          const nameIdx = values.indexOf(values.find((v, i) => i >= 2 && typeof v === "string" && !["draft", "posted", "void"].includes(v as string)));
          if (nameIdx >= 0) acc.name = values[nameIdx] as string;
        }
        return { rows: [acc as unknown as T] };
      }

      // soft delete account
      if (t.includes("update accounts") && t.includes("deleted_at = now()")) {
        const [id, orgId] = values as [string, string];
        const acc = accounts.find((a) => a.id === id && a.organizationId === orgId && !a._deleted);
        if (!acc) return { rows: [] };
        acc._deleted = true;
        return { rows: [{ id: acc.id } as unknown as T] };
      }

      // insert into journal_entries
      if (t.includes("insert into journal_entries")) {
        const [orgId, entryDate, reference, description, sourceType, sourceId, status, postedAt] =
          values as [string, string, string | null, string | null, string, string | null, string, string | null];
        const row: JournalEntry = {
          id: nextId("je"),
          organizationId: orgId,
          entryDate,
          reference,
          description,
          sourceType: sourceType as JournalEntry["sourceType"],
          sourceId,
          status: status as JournalEntryStatus,
          postedAt,
          createdAt: "2026-05-25T00:00:00.000Z",
          updatedAt: "2026-05-25T00:00:00.000Z"
        };
        journalEntries.push(row);
        return { rows: [row as unknown as T] };
      }

      // insert into journal_entry_lines
      if (t.includes("insert into journal_entry_lines")) {
        const [orgId, journalEntryId, accountId, debitStr, creditStr, description] =
          values as [string, string, string, string, string, string | null];
        const row: JournalEntryLine = {
          id: nextId("jel"),
          organizationId: orgId,
          journalEntryId,
          accountId,
          debit: JSON.parse(debitStr) as BillingMoney,
          credit: JSON.parse(creditStr) as BillingMoney,
          description,
          createdAt: "2026-05-25T00:00:00.000Z"
        };
        journalEntryLines.push(row);
        return { rows: [row as unknown as T] };
      }

      // find journal_entry by id
      if (t.includes("from journal_entries") && t.includes("where id = $1")) {
        const [id, orgId] = values as [string, string];
        const found = journalEntries.find(
          (je) => je.id === id && je.organizationId === orgId && !je._deleted
        );
        return { rows: found ? [found as unknown as T] : [] };
      }

      // find journal_entry by source (source_type = $1, source_id = $2)
      if (t.includes("from journal_entries") && t.includes("where source_type = $1")) {
        const [sourceType, sourceId, orgId] = values as [string, string, string];
        const found = journalEntries.find(
          (je) => je.sourceType === sourceType && je.sourceId === sourceId && je.organizationId === orgId && !je._deleted
        );
        return { rows: found ? [found as unknown as T] : [] };
      }

      // list journal_entries
      if (t.includes("from journal_entries") && t.includes("order by entry_date desc")) {
        const [orgId] = values as [string];
        const rows = journalEntries.filter((je) => je.organizationId === orgId && !je._deleted);
        return { rows: rows as unknown as T[] };
      }

      // list journal_entry_lines for entry
      if (t.includes("from journal_entry_lines") && t.includes("where journal_entry_id = $1")) {
        const [jeid] = values as [string];
        const rows = journalEntryLines.filter((l) => l.journalEntryId === jeid);
        return { rows: rows as unknown as T[] };
      }

      // update journal_entries status
      if (t.includes("update journal_entries") && t.includes("status = $3")) {
        const [id, orgId, newStatus] = values as [string, string, string];
        const je = journalEntries.find((e) => e.id === id && e.organizationId === orgId && !e._deleted);
        if (!je) return { rows: [] };
        je.status = newStatus as JournalEntryStatus;
        if (t.includes("posted_at")) {
          je.postedAt = values[3] as string | null;
        }
        return { rows: [je as unknown as T] };
      }

      // soft delete journal_entry
      if (t.includes("update journal_entries") && t.includes("deleted_at = now()")) {
        const [id, orgId] = values as [string, string];
        const je = journalEntries.find((e) => e.id === id && e.organizationId === orgId && !e._deleted);
        if (!je) return { rows: [] };
        je._deleted = true;
        return { rows: [{ id: je.id } as unknown as T] };
      }

      // find invoice by id
      if (t.includes("from invoices") && t.includes("where id = $1")) {
        const [id, orgId] = values as [string, string];
        const found = invoices.find(
          (inv) => inv.id === id && inv.organizationId === orgId && !inv._deleted
        );
        return { rows: found ? [found as unknown as T] : [] };
      }

      // find payment by id
      if (t.includes("from payments") && t.includes("where id = $1")) {
        const [id, orgId] = values as [string, string];
        const found = payments.find(
          (p) => p.id === id && p.organizationId === orgId && !p._deleted
        );
        return { rows: found ? [found as unknown as T] : [] };
      }

      // audit_events
      if (t.includes("insert into audit_events")) {
        const action = values[3] as string;
        audits.push(action);
        return { rows: [{ id: nextId("ae") } as unknown as T] };
      }

      // timeline_entries
      if (t.includes("insert into timeline_entries")) {
        const entryType = values[4] as string;
        timelines.push(entryType);
        return { rows: [{ id: nextId("te") } as unknown as T] };
      }

      return { rows: [] };
    }
  };

  return { db, accounts, journalEntries, journalEntryLines, audits, timelines };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeInvoice(overrides: Partial<Invoice> = {}): Invoice {
  return {
    id: "inv-1",
    organizationId: "org-1",
    companyId: "co-1",
    projectId: null,
    invoiceProposalId: null,
    invoiceNumber: "INV-000001",
    status: "issued",
    currency: "CAD",
    subtotal: { amountMinor: 10000, currency: "CAD", scale: 2 },
    taxTotal: { amountMinor: 1498, currency: "CAD", scale: 2 },
    total: { amountMinor: 11498, currency: "CAD", scale: 2 },
    taxCategoryId: null,
    taxBreakdown: [
      { jurisdiction: "CA-GST", label: "GST", rateBps: 5000, amount: { amountMinor: 500, currency: "CAD", scale: 2 } },
      { jurisdiction: "CA-QC-QST", label: "QST", rateBps: 9975, amount: { amountMinor: 998, currency: "CAD", scale: 2 } }
    ],
    issueDate: "2026-05-25",
    dueDate: null,
    issuedAt: "2026-05-25T00:00:00.000Z",
    createdAt: "2026-05-25T00:00:00.000Z",
    updatedAt: "2026-05-25T00:00:00.000Z",
    ...overrides
  };
}

function makePayment(overrides: Partial<Payment> = {}): Payment {
  return {
    id: "pay-1",
    organizationId: "org-1",
    invoiceId: "inv-1",
    companyId: "co-1",
    amount: { amountMinor: 11498, currency: "CAD", scale: 2 },
    paymentDate: "2026-05-25",
    method: "bank_transfer",
    reference: "REF-001",
    createdAt: "2026-05-25T00:00:00.000Z",
    updatedAt: "2026-05-25T00:00:00.000Z",
    ...overrides
  };
}

const TENANT = { organizationId: "org-1", actorUserId: "user-1" };

// ---------------------------------------------------------------------------
// Tests: Account CRUD
// ---------------------------------------------------------------------------

describe("accounting-service: Account CRUD", () => {
  it("creates an account and emits audit + timeline", async () => {
    const { db, accounts, audits, timelines } = makeFakeDb();
    const result = await createAccount(db, TENANT, {
      code: "1100",
      name: "Accounts Receivable",
      type: "asset"
    });
    expect(result.code).toBe("1100");
    expect(result.type).toBe("asset");
    expect(accounts).toHaveLength(1);
    expect(audits).toContain("billing.account.created");
    expect(timelines).toContain("billing.account.created");
  });

  it("returns account by id", async () => {
    const { db, accounts } = makeFakeDb();
    await createAccount(db, TENANT, { code: "4000", name: "Revenue", type: "revenue" });
    const account = accounts[0]!;
    const found = await getAccountById(db, TENANT, account.id);
    expect(found?.code).toBe("4000");
  });

  it("lists all accounts for org", async () => {
    const { db } = makeFakeDb();
    await createAccount(db, TENANT, { code: "1000", name: "Cash", type: "asset" });
    await createAccount(db, TENANT, { code: "4000", name: "Revenue", type: "revenue" });
    const all = await listAccounts(db, TENANT);
    expect(all.length).toBe(2);
  });

  it("returns null for missing account", async () => {
    const { db } = makeFakeDb();
    const found = await getAccountById(db, TENANT, "non-existent");
    expect(found).toBeNull();
  });

  it("throws AccountNotFoundError when deleting non-existent account", async () => {
    const { db } = makeFakeDb();
    await expect(deleteAccount(db, TENANT, "no-such-id")).rejects.toBeInstanceOf(
      AccountNotFoundError
    );
  });

  it("throws AccountNotFoundError when updating non-existent account", async () => {
    const { db } = makeFakeDb();
    await expect(updateAccountService(db, TENANT, "no-such-id", { name: "New" })).rejects.toBeInstanceOf(
      AccountNotFoundError
    );
  });
});

// ---------------------------------------------------------------------------
// Tests: JournalEntry — balance invariant
// ---------------------------------------------------------------------------

describe("accounting-service: JournalEntry balance invariant", () => {
  it("rejects an unbalanced manual entry (sum debits != sum credits)", async () => {
    const { db } = makeFakeDb();
    const currency = "CAD";
    const scale = 2;

    await expect(
      createJournalEntry(db, TENANT, {
        entryDate: "2026-05-25",
        lines: [
          {
            accountId: "acc-ar",
            debit: { amountMinor: 10000, currency, scale },
            credit: { amountMinor: 0, currency, scale }
          },
          {
            accountId: "acc-rev",
            debit: { amountMinor: 0, currency, scale },
            credit: { amountMinor: 9000, currency, scale } // mismatched!
          }
        ]
      })
    ).rejects.toBeInstanceOf(UnbalancedJournalEntryError);
  });

  it("rejects a line where both debit and credit are non-zero", async () => {
    const { db } = makeFakeDb();
    const currency = "CAD";
    const scale = 2;

    await expect(
      createJournalEntry(db, TENANT, {
        entryDate: "2026-05-25",
        lines: [
          {
            accountId: "acc-ar",
            debit: { amountMinor: 5000, currency, scale },
            credit: { amountMinor: 5000, currency, scale } // both non-zero
          }
        ]
      })
    ).rejects.toBeInstanceOf(UnbalancedJournalEntryError);
  });

  it("rejects a line where both debit and credit are zero", async () => {
    const { db } = makeFakeDb();
    const currency = "CAD";
    const scale = 2;

    await expect(
      createJournalEntry(db, TENANT, {
        entryDate: "2026-05-25",
        lines: [
          {
            accountId: "acc-ar",
            debit: { amountMinor: 0, currency, scale },
            credit: { amountMinor: 0, currency, scale } // both zero
          }
        ]
      })
    ).rejects.toBeInstanceOf(UnbalancedJournalEntryError);
  });

  it("persists a balanced manual entry and keeps status draft", async () => {
    const { db, journalEntries, journalEntryLines } = makeFakeDb();
    const currency = "CAD";
    const scale = 2;

    const result = await createJournalEntry(db, TENANT, {
      entryDate: "2026-05-25",
      description: "Test entry",
      lines: [
        {
          accountId: "acc-ar",
          debit: { amountMinor: 10000, currency, scale },
          credit: { amountMinor: 0, currency, scale }
        },
        {
          accountId: "acc-rev",
          debit: { amountMinor: 0, currency, scale },
          credit: { amountMinor: 10000, currency, scale }
        }
      ]
    });

    expect(result.status).toBe("draft");
    expect(journalEntries).toHaveLength(1);
    expect(journalEntryLines).toHaveLength(2);
  });

  it("transitions draft -> posted via postJournalEntry and sets postedAt", async () => {
    const { db, journalEntries } = makeFakeDb();
    const currency = "CAD";
    const scale = 2;

    const entry = await createJournalEntry(db, TENANT, {
      entryDate: "2026-05-25",
      lines: [
        {
          accountId: "acc-ar",
          debit: { amountMinor: 5000, currency, scale },
          credit: { amountMinor: 0, currency, scale }
        },
        {
          accountId: "acc-rev",
          debit: { amountMinor: 0, currency, scale },
          credit: { amountMinor: 5000, currency, scale }
        }
      ]
    });

    const posted = await postJournalEntry(db, TENANT, entry.id);
    expect(posted.status).toBe("posted");
    expect(posted.postedAt).toBeTruthy();
    expect(journalEntries[0]?.status).toBe("posted");
  });

  it("throws JournalEntryTransitionError when posting a posted entry", async () => {
    const { db } = makeFakeDb();
    const currency = "CAD";
    const scale = 2;

    const entry = await createJournalEntry(db, TENANT, {
      entryDate: "2026-05-25",
      lines: [
        { accountId: "a", debit: { amountMinor: 100, currency, scale }, credit: { amountMinor: 0, currency, scale } },
        { accountId: "b", debit: { amountMinor: 0, currency, scale }, credit: { amountMinor: 100, currency, scale } }
      ]
    });
    await postJournalEntry(db, TENANT, entry.id);
    await expect(postJournalEntry(db, TENANT, entry.id)).rejects.toBeInstanceOf(JournalEntryTransitionError);
  });

  it("throws JournalEntryNotFoundError when posting non-existent entry", async () => {
    const { db } = makeFakeDb();
    await expect(postJournalEntry(db, TENANT, "no-such-id")).rejects.toBeInstanceOf(
      JournalEntryNotFoundError
    );
  });

  it("soft-deletes a draft entry", async () => {
    const { db, journalEntries } = makeFakeDb();
    const currency = "CAD";
    const scale = 2;

    const entry = await createJournalEntry(db, TENANT, {
      entryDate: "2026-05-25",
      lines: [
        { accountId: "a", debit: { amountMinor: 100, currency, scale }, credit: { amountMinor: 0, currency, scale } },
        { accountId: "b", debit: { amountMinor: 0, currency, scale }, credit: { amountMinor: 100, currency, scale } }
      ]
    });
    await deleteJournalEntryService(db, TENANT, entry.id);
    expect(journalEntries[0]?._deleted).toBe(true);
    const found = await getJournalEntryById(db, TENANT, entry.id);
    expect(found).toBeNull();
  });

  it("refuses to delete a posted entry", async () => {
    const { db } = makeFakeDb();
    const currency = "CAD";
    const scale = 2;

    const entry = await createJournalEntry(db, TENANT, {
      entryDate: "2026-05-25",
      lines: [
        { accountId: "a", debit: { amountMinor: 100, currency, scale }, credit: { amountMinor: 0, currency, scale } },
        { accountId: "b", debit: { amountMinor: 0, currency, scale }, credit: { amountMinor: 100, currency, scale } }
      ]
    });
    await postJournalEntry(db, TENANT, entry.id);
    await expect(deleteJournalEntryService(db, TENANT, entry.id)).rejects.toBeInstanceOf(
      JournalEntryTransitionError
    );
  });
});

// ---------------------------------------------------------------------------
// Tests: postInvoiceToJournal — the $100 invoice anchor test
// ---------------------------------------------------------------------------

describe("accounting-service: postInvoiceToJournal", () => {
  /**
   * Invoice: subtotal=10000, GST=500, QST=998, total=11498.
   * Expected balanced entry:
   *   Debit  AR (1100)          = 11498
   *   Credit Revenue (4000)    = 10000
   *   Credit GST Payable (2310)=   500
   *   Credit QST Payable (2320)=   998
   * Sum debits = 11498, sum credits = 10000 + 500 + 998 = 11498. ✓
   */
  it("builds a balanced AR/Revenue/GST/QST entry from the $100 invoice (anchor integers)", async () => {
    const invoice = makeInvoice();
    const { db, journalEntryLines } = makeFakeDb({ invoices: [invoice] });

    // Seed the chart of accounts
    await createAccount(db, TENANT, { code: "1100", name: "Accounts Receivable", type: "asset" });
    await createAccount(db, TENANT, { code: "4000", name: "Service Revenue", type: "revenue" });
    await createAccount(db, TENANT, { code: "2310", name: "GST Payable", type: "liability" });
    await createAccount(db, TENANT, { code: "2320", name: "QST Payable", type: "liability" });

    const entry = await postInvoiceToJournal(db, TENANT, invoice.id);

    expect(entry.status).toBe("posted");
    expect(entry.sourceType).toBe("invoice");
    expect(entry.sourceId).toBe(invoice.id);

    const debitLines = journalEntryLines.filter((l) => l.debit.amountMinor > 0);
    const creditLines = journalEntryLines.filter((l) => l.credit.amountMinor > 0);

    // Exactly one debit line: AR = 11498
    expect(debitLines).toHaveLength(1);
    expect(debitLines[0]!.debit.amountMinor).toBe(11498);

    // Three credit lines: Revenue + GST + QST
    expect(creditLines).toHaveLength(3);
    const creditAmounts = creditLines.map((l) => l.credit.amountMinor).sort((a, b) => b - a);
    expect(creditAmounts).toEqual([10000, 998, 500]);

    // Assert balance: 11498 == 10000 + 500 + 998
    const sumDebits = debitLines.reduce((s, l) => s + l.debit.amountMinor, 0);
    const sumCredits = creditLines.reduce((s, l) => s + l.credit.amountMinor, 0);
    expect(sumDebits).toBe(11498);
    expect(sumCredits).toBe(11498);
  });

  it("throws JournalPostingError for a draft invoice", async () => {
    const invoice = makeInvoice({ status: "draft" });
    const { db } = makeFakeDb({ invoices: [invoice] });

    await expect(postInvoiceToJournal(db, TENANT, invoice.id)).rejects.toBeInstanceOf(
      JournalPostingError
    );
  });

  it("throws JournalPostingError when AR account (1100) is missing", async () => {
    const invoice = makeInvoice();
    const { db } = makeFakeDb({ invoices: [invoice] });
    // No accounts seeded

    await expect(postInvoiceToJournal(db, TENANT, invoice.id)).rejects.toBeInstanceOf(
      JournalPostingError
    );
  });
});

// ---------------------------------------------------------------------------
// Tests: postPaymentToJournal
// ---------------------------------------------------------------------------

describe("accounting-service: postPaymentToJournal", () => {
  it("builds a balanced Cash/AR entry from a payment", async () => {
    const payment = makePayment();
    const { db, journalEntryLines } = makeFakeDb({ payments: [payment] });

    await createAccount(db, TENANT, { code: "1000", name: "Cash / Bank", type: "asset" });
    await createAccount(db, TENANT, { code: "1100", name: "Accounts Receivable", type: "asset" });

    const entry = await postPaymentToJournal(db, TENANT, payment.id);

    expect(entry.status).toBe("posted");
    expect(entry.sourceType).toBe("payment");
    expect(entry.sourceId).toBe(payment.id);

    const debitLines = journalEntryLines.filter((l) => l.debit.amountMinor > 0);
    const creditLines = journalEntryLines.filter((l) => l.credit.amountMinor > 0);

    expect(debitLines).toHaveLength(1);
    expect(debitLines[0]!.debit.amountMinor).toBe(11498); // Cash debit
    expect(creditLines).toHaveLength(1);
    expect(creditLines[0]!.credit.amountMinor).toBe(11498); // AR credit

    const sumDebits = debitLines.reduce((s, l) => s + l.debit.amountMinor, 0);
    const sumCredits = creditLines.reduce((s, l) => s + l.credit.amountMinor, 0);
    expect(sumDebits).toBe(sumCredits);
  });

  it("throws JournalPostingError when payment not found", async () => {
    const { db } = makeFakeDb();
    await expect(postPaymentToJournal(db, TENANT, "no-such-pay")).rejects.toBeInstanceOf(
      JournalPostingError
    );
  });
});

describe("accounting-service: voidJournalEntry", () => {
  it("voids a posted entry", async () => {
    const { db } = makeFakeDb();
    const currency = "CAD";
    const scale = 2;

    const entry = await createJournalEntry(db, TENANT, {
      entryDate: "2026-05-25",
      lines: [
        { accountId: "a", debit: { amountMinor: 100, currency, scale }, credit: { amountMinor: 0, currency, scale } },
        { accountId: "b", debit: { amountMinor: 0, currency, scale }, credit: { amountMinor: 100, currency, scale } }
      ]
    });
    await postJournalEntry(db, TENANT, entry.id);
    const voided = await voidJournalEntry(db, TENANT, entry.id);
    expect(voided.status).toBe("void");
  });
});
