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
import { buildApp, headerTenantResolver } from "../../src/http/app";

// ---------------------------------------------------------------------------
// Fake DB
// ---------------------------------------------------------------------------

function makeFakeAccountingDb() {
  const accounts: Array<Account & { _deleted?: boolean }> = [];
  const journalEntries: Array<JournalEntry & { _deleted?: boolean }> = [];
  const journalEntryLines: JournalEntryLine[] = [];
  const invoices: Array<Invoice & { _deleted?: boolean }> = [];
  const payments: Array<Payment & { _deleted?: boolean }> = [];
  const audits: string[] = [];
  const timelines: string[] = [];

  let seq = 0;
  function nextId(prefix: string): string {
    return `${prefix}_${++seq}`;
  }

  const db: Queryable = {
    async query<T = unknown>(text: string, values: unknown[] = []): Promise<{ rows: T[] }> {
      const t = text.trim();

      // Account insert
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
        return { rows: accounts.filter((a) => a.organizationId === orgId && !a._deleted) as unknown as T[] };
      }

      // update accounts (non-delete)
      if (t.includes("update accounts") && t.includes("updated_at = now()") && !t.includes("deleted_at")) {
        const [id, orgId] = values as [string, string, ...unknown[]];
        const acc = accounts.find((a) => a.id === id && a.organizationId === orgId && !a._deleted);
        if (!acc) return { rows: [] };
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

      // insert journal_entry
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

      // insert journal_entry_line
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

      // find journal_entry by source
      if (t.includes("from journal_entries") && t.includes("where source_type = $1")) {
        const [sourceType, sourceId, orgId] = values as [string, string, string];
        const found = journalEntries.find(
          (je) =>
            je.sourceType === sourceType &&
            je.sourceId === sourceId &&
            je.organizationId === orgId &&
            !je._deleted
        );
        return { rows: found ? [found as unknown as T] : [] };
      }

      // list journal_entries
      if (t.includes("from journal_entries") && t.includes("order by entry_date desc")) {
        const [orgId] = values as [string];
        return {
          rows: journalEntries.filter((je) => je.organizationId === orgId && !je._deleted) as unknown as T[]
        };
      }

      // list journal_entry_lines for an entry
      if (t.includes("from journal_entry_lines") && t.includes("where journal_entry_id = $1")) {
        const [jeid] = values as [string];
        return { rows: journalEntryLines.filter((l) => l.journalEntryId === jeid) as unknown as T[] };
      }

      // update journal_entry status
      if (t.includes("update journal_entries") && t.includes("status = $3")) {
        const [id, orgId, newStatus] = values as [string, string, string];
        const je = journalEntries.find(
          (e) => e.id === id && e.organizationId === orgId && !e._deleted
        );
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
        const je = journalEntries.find(
          (e) => e.id === id && e.organizationId === orgId && !e._deleted
        );
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
        audits.push(values[3] as string);
        return { rows: [{ id: nextId("ae") } as unknown as T] };
      }

      // timeline_entries
      if (t.includes("insert into timeline_entries")) {
        timelines.push(values[4] as string);
        return { rows: [{ id: nextId("te") } as unknown as T] };
      }

      return { rows: [] };
    }
  };

  return { db, accounts, journalEntries, journalEntryLines, invoices, payments, audits, timelines };
}

function buildTestApp(db: Queryable) {
  return buildApp({
    db,
    resolveTenant: (req) => headerTenantResolver(req)
  });
}

const HEADERS = {
  "x-organization-id": "org-1",
  "x-user-identity-id": "user-1",
  "content-type": "application/json"
};

// ---------------------------------------------------------------------------
// Account HTTP tests
// ---------------------------------------------------------------------------

describe("billing accounts HTTP (DS 4.3)", () => {
  it("GET /billing/accounts returns 401 without tenant headers", async () => {
    const { db } = makeFakeAccountingDb();
    const app = buildTestApp(db);
    const res = await app.request("/billing/accounts");
    expect(res.status).toBe(401);
  });

  it("GET /billing/accounts returns empty list", async () => {
    const { db } = makeFakeAccountingDb();
    const app = buildTestApp(db);
    const res = await app.request("/billing/accounts", { headers: HEADERS });
    expect(res.status).toBe(200);
    const body = await res.json() as { items: Account[] };
    expect(body.items).toEqual([]);
  });

  it("POST /billing/accounts creates an account (201)", async () => {
    const { db } = makeFakeAccountingDb();
    const app = buildTestApp(db);
    const res = await app.request("/billing/accounts", {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify({ code: "1000", name: "Cash", type: "asset" })
    });
    expect(res.status).toBe(201);
    const body = await res.json() as Account;
    expect(body.code).toBe("1000");
    expect(body.name).toBe("Cash");
    expect(body.type).toBe("asset");
    expect(body.active).toBe(true);
  });

  it("POST /billing/accounts returns 400 when code missing", async () => {
    const { db } = makeFakeAccountingDb();
    const app = buildTestApp(db);
    const res = await app.request("/billing/accounts", {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify({ name: "Cash", type: "asset" })
    });
    expect(res.status).toBe(400);
  });

  it("POST /billing/accounts returns 400 when type invalid", async () => {
    const { db } = makeFakeAccountingDb();
    const app = buildTestApp(db);
    const res = await app.request("/billing/accounts", {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify({ code: "1000", name: "Cash", type: "invalid_type" })
    });
    expect(res.status).toBe(400);
  });

  it("GET /billing/accounts/:id returns 404 for unknown", async () => {
    const { db } = makeFakeAccountingDb();
    const app = buildTestApp(db);
    const res = await app.request("/billing/accounts/no-such-id", { headers: HEADERS });
    expect(res.status).toBe(404);
  });

  it("PATCH /billing/accounts/:id returns 404 for unknown", async () => {
    const { db } = makeFakeAccountingDb();
    const app = buildTestApp(db);
    const res = await app.request("/billing/accounts/no-such-id", {
      method: "PATCH",
      headers: HEADERS,
      body: JSON.stringify({ name: "Updated" })
    });
    expect(res.status).toBe(404);
  });

  it("DELETE /billing/accounts/:id returns 404 for unknown", async () => {
    const { db } = makeFakeAccountingDb();
    const app = buildTestApp(db);
    const res = await app.request("/billing/accounts/no-such-id", {
      method: "DELETE",
      headers: HEADERS
    });
    expect(res.status).toBe(404);
  });

  it("DELETE /billing/accounts/:id returns 204 for existing account", async () => {
    const { db } = makeFakeAccountingDb();
    const app = buildTestApp(db);
    // create
    const createRes = await app.request("/billing/accounts", {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify({ code: "9999", name: "Temp", type: "expense" })
    });
    expect(createRes.status).toBe(201);
    const created = await createRes.json() as Account;
    // delete
    const delRes = await app.request(`/billing/accounts/${created.id}`, {
      method: "DELETE",
      headers: HEADERS
    });
    expect(delRes.status).toBe(204);
  });
});

// ---------------------------------------------------------------------------
// JournalEntry HTTP tests
// ---------------------------------------------------------------------------

function makeArAccount(orgId: string): Account {
  return {
    id: "acc_ar",
    organizationId: orgId,
    code: "1100",
    name: "Accounts Receivable",
    type: "asset",
    active: true,
    createdAt: "2026-05-25T00:00:00.000Z",
    updatedAt: "2026-05-25T00:00:00.000Z"
  };
}

describe("billing journal entries HTTP (DS 4.3)", () => {
  it("GET /billing/journal-entries returns empty list", async () => {
    const { db } = makeFakeAccountingDb();
    const app = buildTestApp(db);
    const res = await app.request("/billing/journal-entries", { headers: HEADERS });
    expect(res.status).toBe(200);
    const body = await res.json() as { items: JournalEntry[] };
    expect(body.items).toEqual([]);
  });

  it("POST /billing/journal-entries creates a balanced entry (201)", async () => {
    const { db, accounts } = makeFakeAccountingDb();
    accounts.push(makeArAccount("org-1"));
    const app = buildTestApp(db);
    const res = await app.request("/billing/journal-entries", {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify({
        entryDate: "2026-05-25",
        lines: [
          {
            accountId: "acc_ar",
            debit: { amountMinor: 10000, currency: "CAD", scale: 2 },
            credit: { amountMinor: 0, currency: "CAD", scale: 2 }
          },
          {
            accountId: "acc_ar",
            debit: { amountMinor: 0, currency: "CAD", scale: 2 },
            credit: { amountMinor: 10000, currency: "CAD", scale: 2 }
          }
        ]
      })
    });
    expect(res.status).toBe(201);
    const body = await res.json() as JournalEntry;
    expect(body.status).toBe("draft");
    expect(body.entryDate).toBe("2026-05-25");
  });

  it("POST /billing/journal-entries returns 422 for unbalanced entry", async () => {
    const { db, accounts } = makeFakeAccountingDb();
    accounts.push(makeArAccount("org-1"));
    const app = buildTestApp(db);
    const res = await app.request("/billing/journal-entries", {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify({
        entryDate: "2026-05-25",
        lines: [
          {
            accountId: "acc_ar",
            debit: { amountMinor: 10000, currency: "CAD", scale: 2 },
            credit: { amountMinor: 0, currency: "CAD", scale: 2 }
          },
          {
            accountId: "acc_ar",
            debit: { amountMinor: 0, currency: "CAD", scale: 2 },
            credit: { amountMinor: 5000, currency: "CAD", scale: 2 }
          }
        ]
      })
    });
    expect(res.status).toBe(422);
    const body = await res.json() as { code: string };
    expect(body.code).toBe("UNBALANCED_JOURNAL_ENTRY");
  });

  it("POST /billing/journal-entries returns 400 when entryDate missing", async () => {
    const { db } = makeFakeAccountingDb();
    const app = buildTestApp(db);
    const res = await app.request("/billing/journal-entries", {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify({
        lines: [{ accountId: "x", debit: { amountMinor: 100, currency: "CAD", scale: 2 }, credit: { amountMinor: 0, currency: "CAD", scale: 2 } }]
      })
    });
    expect(res.status).toBe(400);
  });

  it("GET /billing/journal-entries/:id returns 404 for unknown", async () => {
    const { db } = makeFakeAccountingDb();
    const app = buildTestApp(db);
    const res = await app.request("/billing/journal-entries/no-such-id", { headers: HEADERS });
    expect(res.status).toBe(404);
  });

  it("POST /billing/journal-entries/:id/post returns 404 for unknown entry", async () => {
    const { db } = makeFakeAccountingDb();
    const app = buildTestApp(db);
    const res = await app.request("/billing/journal-entries/no-such-id/post", {
      method: "POST",
      headers: HEADERS
    });
    expect(res.status).toBe(404);
  });

  it("POST /billing/journal-entries/:id/void returns 404 for unknown entry", async () => {
    const { db } = makeFakeAccountingDb();
    const app = buildTestApp(db);
    const res = await app.request("/billing/journal-entries/no-such-id/void", {
      method: "POST",
      headers: HEADERS
    });
    expect(res.status).toBe(404);
  });

  it("DELETE /billing/journal-entries/:id returns 404 for unknown entry", async () => {
    const { db } = makeFakeAccountingDb();
    const app = buildTestApp(db);
    const res = await app.request("/billing/journal-entries/no-such-id", {
      method: "DELETE",
      headers: HEADERS
    });
    expect(res.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// Post-to-journal from invoice / payment HTTP tests
// ---------------------------------------------------------------------------

describe("billing post-to-journal HTTP (DS 4.3)", () => {
  function makeIssuedInvoice(orgId: string): Invoice & { _deleted?: boolean } {
    const taxLine: TaxBreakdownLine = {
      jurisdiction: "CA-GST",
      label: "GST 5%",
      rateBps: 5000,
      amount: { amountMinor: 500, currency: "CAD", scale: 2 }
    };
    return {
      id: "inv-1",
      organizationId: orgId,
      companyId: "company-1",
      projectId: null,
      invoiceProposalId: null,
      invoiceNumber: "INV-000001",
      status: "issued" as InvoiceStatus,
      currency: "CAD",
      subtotal: { amountMinor: 10000, currency: "CAD", scale: 2 },
      taxTotal: { amountMinor: 500, currency: "CAD", scale: 2 },
      total: { amountMinor: 10500, currency: "CAD", scale: 2 },
      taxCategoryId: null,
      taxBreakdown: [taxLine],
      issueDate: "2026-05-25",
      dueDate: null,
      issuedAt: "2026-05-25T00:00:00.000Z",
      createdAt: "2026-05-25T00:00:00.000Z",
      updatedAt: "2026-05-25T00:00:00.000Z"
    };
  }

  function makeRecordedPayment(orgId: string): Payment & { _deleted?: boolean } {
    return {
      id: "pay-1",
      organizationId: orgId,
      invoiceId: "inv-1",
      companyId: "company-1",
      amount: { amountMinor: 10500, currency: "CAD", scale: 2 },
      paymentDate: "2026-05-25",
      method: "bank_transfer",
      reference: "TRF-001",
      createdAt: "2026-05-25T00:00:00.000Z",
      updatedAt: "2026-05-25T00:00:00.000Z"
    };
  }

  function seedChartAccounts(accountStore: Array<Account & { _deleted?: boolean }>, orgId: string): void {
    const codes: Array<[string, string, Account["type"]]> = [
      ["1000", "Cash/Bank", "asset"],
      ["1100", "Accounts Receivable", "asset"],
      ["2300", "Tax Payable", "liability"],
      ["2310", "GST Payable", "liability"],
      ["2320", "QST Payable", "liability"],
      ["4000", "Service Revenue", "revenue"]
    ];
    let idx = 0;
    for (const [code, name, type] of codes) {
      accountStore.push({
        id: `acc_chart_${++idx}`,
        organizationId: orgId,
        code,
        name,
        type,
        active: true,
        createdAt: "2026-05-25T00:00:00.000Z",
        updatedAt: "2026-05-25T00:00:00.000Z"
      });
    }
  }

  it("POST /billing/invoices/:id/post-to-journal returns 404 for unknown invoice", async () => {
    const { db } = makeFakeAccountingDb();
    const app = buildTestApp(db);
    const res = await app.request("/billing/invoices/no-such-id/post-to-journal", {
      method: "POST",
      headers: HEADERS
    });
    expect(res.status).toBe(422);
    const body = await res.json() as { code: string };
    expect(body.code).toBe("JOURNAL_POSTING_ERROR");
  });

  it("POST /billing/invoices/:id/post-to-journal posts a balanced journal entry (201)", async () => {
    const { db, accounts, invoices } = makeFakeAccountingDb();
    seedChartAccounts(accounts, "org-1");
    invoices.push(makeIssuedInvoice("org-1"));
    const app = buildTestApp(db);
    const res = await app.request("/billing/invoices/inv-1/post-to-journal", {
      method: "POST",
      headers: HEADERS
    });
    expect(res.status).toBe(201);
    const body = await res.json() as { status: string; sourceType: string; lines: Array<{ debit: BillingMoney; credit: BillingMoney }> };
    expect(body.status).toBe("posted");
    expect(body.sourceType).toBe("invoice");
    const sumDebits = body.lines.reduce((s, l) => s + l.debit.amountMinor, 0);
    const sumCredits = body.lines.reduce((s, l) => s + l.credit.amountMinor, 0);
    expect(sumDebits).toBe(sumCredits);
  });

  it("POST /billing/payments/:id/post-to-journal returns 422 for unknown payment", async () => {
    const { db } = makeFakeAccountingDb();
    const app = buildTestApp(db);
    const res = await app.request("/billing/payments/no-such-id/post-to-journal", {
      method: "POST",
      headers: HEADERS
    });
    expect(res.status).toBe(422);
    const body = await res.json() as { code: string };
    expect(body.code).toBe("JOURNAL_POSTING_ERROR");
  });

  it("POST /billing/payments/:id/post-to-journal posts a balanced journal entry (201)", async () => {
    const { db, accounts, payments } = makeFakeAccountingDb();
    seedChartAccounts(accounts, "org-1");
    payments.push(makeRecordedPayment("org-1"));
    const app = buildTestApp(db);
    const res = await app.request("/billing/payments/pay-1/post-to-journal", {
      method: "POST",
      headers: HEADERS
    });
    expect(res.status).toBe(201);
    const body = await res.json() as { status: string; sourceType: string; lines: Array<{ debit: BillingMoney; credit: BillingMoney }> };
    expect(body.status).toBe("posted");
    expect(body.sourceType).toBe("payment");
    const sumDebits = body.lines.reduce((s, l) => s + l.debit.amountMinor, 0);
    const sumCredits = body.lines.reduce((s, l) => s + l.credit.amountMinor, 0);
    expect(sumDebits).toBe(sumCredits);
  });
});
