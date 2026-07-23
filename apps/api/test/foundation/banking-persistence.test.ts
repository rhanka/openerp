import { describe, expect, it } from "vitest";

import type { BankAccount, BankTransaction, ReconciliationLink } from "@sentropic/openerp-domain/banking";
import type { Payment } from "@sentropic/openerp-domain/billing";

import type { Queryable } from "../../src/db/client";
import { buildApp, headerTenantResolver } from "../../src/http/app";
import {
  BankingConflictError,
  BankingNotFoundError,
  BankingValidationError,
  confirmReconciliationProposal,
  ignoreBankTransaction,
  importBankingSnapshot,
  listBankTransactions,
  listStoredProposals,
  refreshReconciliationProposals,
  rejectReconciliationProposal,
  unmatchReconciliationProposal,
  type QueryablePool
} from "../../src/reconciliation/banking-persistence";

const ORG_1 = "org-1";
const ORG_2 = "org-2";
const TENANT_1 = { organizationId: ORG_1, actorUserId: "user-1" };
const TENANT_2 = { organizationId: ORG_2, actorUserId: "user-2" };

type StoredPayment = Payment & { deleted?: boolean };

function makePool() {
  const accounts: BankAccount[] = [];
  const transactions: BankTransaction[] = [];
  const links: ReconciliationLink[] = [];
  const payments: StoredPayment[] = [];
  const audits: string[] = [];
  const queryLog: string[] = [];
  let nextId = 1;
  const now = "2026-07-22T12:00:00.000Z";

  const pool: QueryablePool = {
    async withClient<T>(work: (client: Queryable) => Promise<T>): Promise<T> {
      return work(pool);
    },
    async query<T = unknown>(text: string, values: unknown[] = []): Promise<{ rows: T[] }> {
      const sql = text.replace(/\s+/g, " ").trim().toLowerCase();
      queryLog.push(sql);
      if (["begin", "begin read only", "commit", "rollback"].includes(sql) || sql.startsWith("select set_config")) {
        return { rows: [] };
      }
      if (sql.includes("insert into audit_events")) {
        audits.push(values[3] as string);
        return { rows: [{ id: `audit-${audits.length}` } as T] };
      }
      if (sql.includes("insert into bank_accounts")) {
        const [organizationId, provider, providerAccountRef, displayName, accountType, currency, institution] = values as [string, string, string, string, string, string, string];
        if (!accounts.some((a) => a.organizationId === organizationId && a.provider === provider && a.providerAccountRef === providerAccountRef)) {
          accounts.push({
            id: `account-${nextId++}`,
            organizationId,
            provider: provider as BankAccount["provider"],
            providerAccountRef,
            displayName,
            accountType: accountType as BankAccount["accountType"],
            currency,
            institution,
            active: true,
            createdAt: now,
            updatedAt: now
          });
        }
        return { rows: [] };
      }
      if (sql.includes("from bank_accounts")) {
        const [organizationId, provider, providerAccountRef] = values as string[];
        const found = accounts.find((a) => a.organizationId === organizationId && a.provider === provider && a.providerAccountRef === providerAccountRef);
        return { rows: found ? [found as T] : [] };
      }
      if (sql.includes("insert into bank_transactions")) {
        const [organizationId, bankAccountId, provider, providerRef, postedAt, amount, rawDescription, snapshot] = values as [string, string, string, string, string, string, string, string];
        const existing = transactions.find((t) => t.organizationId === organizationId && t.bankAccountId === bankAccountId && t.provider === provider && t.providerTransactionRef === providerRef);
        if (existing) return { rows: [] };
        const transaction: BankTransaction = {
          id: `transaction-${nextId++}`,
          organizationId,
          bankAccountId,
          provider: provider as BankTransaction["provider"],
          providerTransactionRef: providerRef,
          postedAt,
          amount: JSON.parse(amount),
          rawDescription,
          normalizedSnapshot: JSON.parse(snapshot),
          reconciliationStatus: "unmatched",
          createdAt: now,
          updatedAt: now
        };
        transactions.push(transaction);
        return { rows: [transaction as T] };
      }
      if (sql.includes("from bank_transactions bt") && sql.includes("not exists")) {
        const organizationId = values[0] as string;
        const eligible = transactions.filter((t) => t.organizationId === organizationId && t.reconciliationStatus === "unmatched" && !links.some((l) => l.organizationId === organizationId && l.bankTransactionId === t.id && (l.status === "proposed" || l.status === "confirmed")));
        return { rows: eligible.map((t) => ({ id: t.id, postedAt: t.postedAt, amount: t.amount, rawDescription: t.rawDescription }) as T) };
      }
      if (sql.includes("from bank_transactions") && sql.includes("where id = $1")) {
        const [id, organizationId] = values as string[];
        const found = transactions.find((t) => t.id === id && t.organizationId === organizationId);
        return { rows: found ? [found as T] : [] };
      }
      if (sql.includes("from bank_transactions") && sql.includes("reconciliation_status = $2")) {
        const [organizationId, status] = values as [string, BankTransaction["reconciliationStatus"] | null];
        return { rows: transactions.filter((t) => t.organizationId === organizationId && (status === null || t.reconciliationStatus === status)) as T[] };
      }
      if (sql.includes("update bank_transactions") && sql.includes("set reconciliation_status = 'matched'")) {
        const [id, organizationId] = values as string[];
        const found = transactions.find((t) => t.id === id && t.organizationId === organizationId && t.reconciliationStatus === "unmatched");
        if (!found) return { rows: [] };
        found.reconciliationStatus = "matched";
        return { rows: [{ id: found.id } as T] };
      }
      if (sql.includes("update bank_transactions") && sql.includes("set reconciliation_status = 'unmatched'")) {
        const [id, organizationId] = values as string[];
        const found = transactions.find((t) => t.id === id && t.organizationId === organizationId && t.reconciliationStatus === "matched");
        if (!found) return { rows: [] };
        found.reconciliationStatus = "unmatched";
        return { rows: [{ id: found.id } as T] };
      }
      if (sql.includes("update bank_transactions") && sql.includes("set reconciliation_status = 'ignored'")) {
        const [id, organizationId] = values as string[];
        const found = transactions.find((t) => t.id === id && t.organizationId === organizationId && t.reconciliationStatus === "unmatched");
        if (!found) return { rows: [] };
        found.reconciliationStatus = "ignored";
        return { rows: [found as T] };
      }
      if (sql.includes("from bank_transactions") && sql.includes("order by posted_at")) {
        const [organizationId, status] = values as [string, BankTransaction["reconciliationStatus"] | null];
        return { rows: transactions.filter((t) => t.organizationId === organizationId && (status === null || status === t.reconciliationStatus)) as T[] };
      }
      if (sql.includes("insert into reconciliation_links")) {
        const [organizationId, bankTransactionId, candidateKind, candidateId, score, reasons] = values as [string, string, ReconciliationLink["candidateKind"], string, number, string];
        const existing = links.find((l) => l.organizationId === organizationId && l.bankTransactionId === bankTransactionId && l.candidateKind === candidateKind && l.candidateId === candidateId);
        if (existing) return { rows: [] };
        const link: ReconciliationLink = {
          id: `00000000-0000-4000-8000-${String(nextId++).padStart(12, "0")}`,
          organizationId,
          bankTransactionId,
          candidateKind,
          candidateId,
          score,
          reasons: JSON.parse(reasons),
          status: "proposed",
          createdAt: now,
          updatedAt: now
        };
        links.push(link);
        return { rows: [link as T] };
      }
      if (sql.includes("from reconciliation_links l") && sql.includes("join bank_transactions bt")) {
        const organizationId = values[0] as string;
        return { rows: links.filter((l) => l.organizationId === organizationId && l.status === "proposed" && transactions.some((t) => t.id === l.bankTransactionId && t.organizationId === organizationId && t.reconciliationStatus === "unmatched")) as T[] };
      }
      if (sql.includes("from reconciliation_links") && sql.includes("status = 'rejected'")) {
        const organizationId = values[0] as string;
        return {
          rows: links
            .filter((link) => link.organizationId === organizationId && link.status === "rejected")
            .map((link) => ({
              bankTransactionId: link.bankTransactionId,
              candidateKind: link.candidateKind,
              candidateId: link.candidateId
            }) as T)
        };
      }
      if (sql.includes("from reconciliation_links") && sql.includes("where id = $1")) {
        const [id, organizationId] = values as string[];
        const found = links.find((l) => l.id === id && l.organizationId === organizationId);
        return { rows: found ? [found as T] : [] };
      }
      if (sql.includes("from reconciliation_links") && sql.includes("candidate_kind = $2")) {
        const [organizationId, candidateKind, candidateId] = values as [string, ReconciliationLink["candidateKind"], string];
        const found = links.find((l) => l.organizationId === organizationId && l.candidateKind === candidateKind && l.candidateId === candidateId && l.status === "confirmed");
        return { rows: found ? [{ id: found.id } as T] : [] };
      }
      if (sql.includes("from reconciliation_links") && sql.includes("bank_transaction_id = $2") && sql.includes("status = 'proposed'")) {
        const [organizationId, transactionId] = values as string[];
        const found = links.find((l) => l.organizationId === organizationId && l.bankTransactionId === transactionId && l.status === "proposed");
        return { rows: found ? [{ id: found.id } as T] : [] };
      }
      if (sql.includes("update reconciliation_links") && sql.includes("set status = 'confirmed'")) {
        const [id, organizationId] = values as string[];
        const found = links.find((l) => l.id === id && l.organizationId === organizationId && l.status === "proposed");
        if (!found) return { rows: [] };
        found.status = "confirmed";
        return { rows: [found as T] };
      }
      if (sql.includes("update reconciliation_links") && sql.includes("set status = 'rejected'")) {
        const [id, organizationId] = values as string[];
        const found = links.find((l) => l.id === id && l.organizationId === organizationId && l.status === "proposed");
        if (!found) return { rows: [] };
        found.status = "rejected";
        return { rows: [found as T] };
      }
      if (sql.includes("update reconciliation_links") && sql.includes("set status = 'proposed'")) {
        const [id, organizationId] = values as string[];
        const found = links.find((l) => l.id === id && l.organizationId === organizationId && l.status === "confirmed");
        if (!found) return { rows: [] };
        found.status = "proposed";
        return { rows: [found as T] };
      }
      if (sql.includes("from payments p")) {
        const organizationId = values[0] as string;
        return {
          rows: payments.filter((payment) => payment.organizationId === organizationId && !payment.deleted && !links.some((link) => link.organizationId === organizationId && link.candidateKind === "payment" && link.candidateId === payment.id && (link.status === "proposed" || link.status === "confirmed"))) as T[]
        };
      }
      if (sql.includes("from payments") && sql.includes("where id = $1")) {
        const [id, organizationId] = values as string[];
        const found = payments.find((payment) => payment.id === id && payment.organizationId === organizationId && !payment.deleted);
        return { rows: found ? [{ id: found.id } as T] : [] };
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    }
  };
  return { pool, accounts, transactions, links, payments, audits, queryLog };
}

function input(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    provider: "ofx-upload",
    account: {
      id: "source-account-1",
      providerRef: "source-account-1",
      name: "Synthetic chequing",
      type: "checking",
      currency: "CAD",
      institution: "Synthetic Bank"
    },
    transactions: [{
      id: "source-transaction-1",
      accountId: "source-account-1",
      postedAt: "2026-07-21",
      amount: 100,
      currency: "CAD",
      description: "ACME INV-100",
      status: "posted",
      providerRef: "provider-transaction-1"
    }],
    ...overrides
  };
}

function payment(id: string, amountMinor = 10000, reference = "INV-100"): StoredPayment {
  return {
    id,
    organizationId: ORG_1,
    invoiceId: "11111111-1111-1111-1111-111111111111",
    companyId: null,
    amount: { amountMinor, currency: "CAD", scale: 2 },
    paymentDate: "2026-07-21",
    method: "bank_transfer",
    reference,
    createdAt: "2026-07-21T00:00:00.000Z",
    updatedAt: "2026-07-21T00:00:00.000Z"
  };
}

describe("banking reconciliation persistence (D9)", () => {
  it("imports posted normalized transactions idempotently and audits only first inserts", async () => {
    const fake = makePool();
    const first = await importBankingSnapshot(fake.pool, TENANT_1, input());
    const second = await importBankingSnapshot(fake.pool, TENANT_1, input());

    expect(first.imported).toHaveLength(1);
    expect(second.imported).toHaveLength(0);
    expect(fake.accounts[0]?.provider).toBe("ofx");
    expect(fake.transactions).toHaveLength(1);
    expect(fake.audits).toEqual(["banking.bank_transaction.imported"]);
  });

  it("skips pending entries without persisting or auditing", async () => {
    const fake = makePool();
    const result = await importBankingSnapshot(fake.pool, TENANT_1, input({
      transactions: [{ status: "pending" }]
    }));

    expect(result).toEqual({ imported: [], skippedPending: 1 });
    expect(fake.accounts).toHaveLength(0);
    expect(fake.transactions).toHaveLength(0);
    expect(fake.audits).toEqual([]);
  });

  it("rejects a malformed posted batch before it writes anything", async () => {
    const fake = makePool();
    await expect(importBankingSnapshot(fake.pool, TENANT_1, input({
      transactions: [{
        id: "bad",
        accountId: "source-account-1",
        postedAt: "not-a-date",
        amount: 10,
        currency: "CAD",
        description: "",
        status: "posted",
        providerRef: "bad"
      }]
    }))).rejects.toBeInstanceOf(BankingValidationError);
    expect(fake.accounts).toHaveLength(0);
    expect(fake.transactions).toHaveLength(0);
    expect(fake.audits).toEqual([]);
  });

  it("persists proposals on refresh while reads only list existing proposals", async () => {
    const fake = makePool();
    await importBankingSnapshot(fake.pool, TENANT_1, input());
    fake.payments.push(payment("payment-1"));

    const refreshed = await refreshReconciliationProposals(fake.pool, TENANT_1);
    const auditCount = fake.audits.length;
    const beforeGetQueries = fake.queryLog.length;
    const app = buildApp({ db: fake.pool, resolveTenant: headerTenantResolver });
    const response = await app.request("/banking/reconciliation/suggestions", {
      headers: { "x-organization-id": ORG_1, "x-user-identity-id": "user-1" }
    });
    const suggestions = await response.json() as { items: ReconciliationLink[] };

    expect(refreshed.created).toHaveLength(1);
    expect(response.status).toBe(200);
    expect(suggestions.items).toHaveLength(1);
    expect(fake.audits).toHaveLength(auditCount);
    expect(fake.queryLog.slice(beforeGetQueries).every((sql) => sql === "begin read only" || sql === "commit" || sql.startsWith("select"))).toBe(true);
  });

  it("does not resurface a rejected pair during later refreshes", async () => {
    const fake = makePool();
    await importBankingSnapshot(fake.pool, TENANT_1, input());
    fake.payments.push(payment("payment-1"));
    const id = (await refreshReconciliationProposals(fake.pool, TENANT_1)).created[0]!.id;

    await rejectReconciliationProposal(fake.pool, TENANT_1, id);
    const repeat = await refreshReconciliationProposals(fake.pool, TENANT_1);

    expect(repeat.created).toEqual([]);
    expect(await listStoredProposals(fake.pool, TENANT_1)).toEqual([]);
  });

  it("uses the next eligible candidate after a rejected best pair without resurfacing that pair", async () => {
    const fake = makePool();
    await importBankingSnapshot(fake.pool, TENANT_1, input());
    fake.payments.push(payment("payment-best", 10000, "INV-100"), payment("payment-next", 10000, "OTHER"));
    const first = await refreshReconciliationProposals(fake.pool, TENANT_1);
    expect(first.created[0]?.candidateId).toBe("payment-best");
    await rejectReconciliationProposal(fake.pool, TENANT_1, first.created[0]!.id);

    const next = await refreshReconciliationProposals(fake.pool, TENANT_1);
    expect(next.created).toHaveLength(1);
    expect(next.created[0]?.candidateId).toBe("payment-next");
    expect(fake.links.find((link) => link.candidateId === "payment-best")?.status).toBe("rejected");
  });

  it("rejects raw payload fields, impossible timestamps, and a persisted account currency change before new transactions", async () => {
    const rawPayloadFake = makePool();
    await expect(importBankingSnapshot(rawPayloadFake.pool, TENANT_1, input({ rawPayload: { token: "forbidden" } }))).rejects.toBeInstanceOf(BankingValidationError);
    await expect(importBankingSnapshot(rawPayloadFake.pool, TENANT_1, input({
      transactions: [{
        id: "bad-date",
        accountId: "source-account-1",
        postedAt: "2026-02-30T12:00:00Z",
        amount: 10,
        currency: "CAD",
        description: "bad date",
        status: "posted",
        providerRef: "bad-date"
      }]
    }))).rejects.toBeInstanceOf(BankingValidationError);
    expect(rawPayloadFake.transactions).toEqual([]);

    const currencyFake = makePool();
    await importBankingSnapshot(currencyFake.pool, TENANT_1, input());
    await expect(importBankingSnapshot(currencyFake.pool, TENANT_1, input({
      account: { ...input().account as Record<string, unknown>, currency: "USD" },
      transactions: [{
        id: "usd-transaction",
        accountId: "source-account-1",
        postedAt: "2026-07-21",
        amount: 100,
        currency: "USD",
        description: "USD transaction",
        status: "posted",
        providerRef: "usd-transaction"
      }]
    }))).rejects.toBeInstanceOf(BankingConflictError);
    expect(currencyFake.transactions).toHaveLength(1);
    expect(currencyFake.audits).toEqual(["banking.bank_transaction.imported"]);
  });

  it("rejects confirmation when the stored payment candidate was deleted", async () => {
    const fake = makePool();
    await importBankingSnapshot(fake.pool, TENANT_1, input());
    const storedPayment = payment("payment-1");
    fake.payments.push(storedPayment);
    const id = (await refreshReconciliationProposals(fake.pool, TENANT_1)).created[0]!.id;
    storedPayment.deleted = true;

    await expect(confirmReconciliationProposal(fake.pool, TENANT_1, id)).rejects.toBeInstanceOf(BankingConflictError);
  });

  it("audits transitions and makes repeats idempotent", async () => {
    const fake = makePool();
    await importBankingSnapshot(fake.pool, TENANT_1, input());
    fake.payments.push(payment("payment-1"));
    const id = (await refreshReconciliationProposals(fake.pool, TENANT_1)).created[0]!.id;

    await confirmReconciliationProposal(fake.pool, TENANT_1, id);
    await confirmReconciliationProposal(fake.pool, TENANT_1, id);
    await unmatchReconciliationProposal(fake.pool, TENANT_1, id);
    await unmatchReconciliationProposal(fake.pool, TENANT_1, id);
    await rejectReconciliationProposal(fake.pool, TENANT_1, id);
    await rejectReconciliationProposal(fake.pool, TENANT_1, id);
    const transactionId = fake.transactions[0]!.id;
    await ignoreBankTransaction(fake.pool, TENANT_1, transactionId);
    await ignoreBankTransaction(fake.pool, TENANT_1, transactionId);

    expect(fake.audits).toEqual([
      "banking.bank_transaction.imported",
      "banking.reconciliation.proposed",
      "banking.reconciliation.confirmed",
      "banking.reconciliation.proposed",
      "banking.reconciliation.rejected",
      "banking.bank_transaction.ignored"
    ]);
  });

  it("keeps stored records tenant-isolated", async () => {
    const fake = makePool();
    const [transaction] = (await importBankingSnapshot(fake.pool, TENANT_1, input())).imported;
    fake.links.push({
      id: "payment-link",
      organizationId: ORG_1,
      bankTransactionId: transaction!.id,
      candidateKind: "payment",
      candidateId: "22222222-2222-2222-2222-222222222222",
      score: 0.8,
      reasons: ["legacy fixture"],
      status: "proposed",
      createdAt: "2026-07-22T00:00:00.000Z",
      updatedAt: "2026-07-22T00:00:00.000Z"
    });

    expect(await listBankTransactions(fake.pool, TENANT_2)).toEqual([]);
    await expect(confirmReconciliationProposal(fake.pool, TENANT_2, "payment-link")).rejects.toBeInstanceOf(BankingNotFoundError);
  });

  it("maps malformed, missing, and illegal banking decisions to 400, 404, and 409", async () => {
    const fake = makePool();
    const app = buildApp({ db: fake.pool, resolveTenant: headerTenantResolver });
    const headers = {
      "content-type": "application/json",
      "x-organization-id": ORG_1,
      "x-user-identity-id": "user-1"
    };
    const malformed = await app.request("/banking/import", {
      method: "POST",
      headers,
      body: JSON.stringify({ provider: "plaid-production" })
    });
    const missing = await app.request("/banking/reconciliation/00000000-0000-4000-8000-000000000099/confirm", {
      method: "POST",
      headers
    });

    await importBankingSnapshot(fake.pool, TENANT_1, input());
    const storedPayment = payment("payment-1");
    fake.payments.push(storedPayment);
    const proposalId = (await refreshReconciliationProposals(fake.pool, TENANT_1)).created[0]!.id;
    storedPayment.deleted = true;
    const illegal = await app.request(`/banking/reconciliation/${proposalId}/confirm`, {
      method: "POST",
      headers
    });

    expect(malformed.status).toBe(400);
    expect(missing.status).toBe(404);
    expect(illegal.status).toBe(409);

    const malformedLinkId = await app.request("/banking/reconciliation/not-a-link/confirm", {
      method: "POST",
      headers
    });
    expect(malformedLinkId.status).toBe(400);

    const malformedLimit = await app.request("/banking/transactions?limit=0", { headers });
    const malformedOffset = await app.request("/banking/transactions?offset=1e3", { headers });
    expect(malformedLimit.status).toBe(400);
    expect(malformedOffset.status).toBe(400);
  });
});
