import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { BankTransaction } from "@sentropic/openerp-domain/banking";

import { runMigrations } from "../../src/db/migrate";
import { createPgPool, type PgPoolHandle } from "../../src/db/pg-client";
import {
  BankingConflictError,
  confirmReconciliationProposal,
  ignoreBankTransaction,
  importBankingSnapshot,
  listStoredProposals,
  rejectReconciliationProposal,
  refreshReconciliationProposals,
  unignoreBankTransaction,
  unmatchReconciliationProposal
} from "../../src/reconciliation/banking-persistence";
import { buildApp, headerTenantResolver } from "../../src/http/app";
import { createEphemeralDb, type EphemeralDb } from "./helpers/ephemeral-db";

const url = process.env.OPENERP_INTEGRATION_DATABASE_URL;
const describeOrSkip = url ? describe : describe.skip;

interface SeedTenant {
  organizationId: string;
  actorUserId: string;
}

function importInput(providerRef: string, amount = 100): Record<string, unknown> {
  return {
    provider: "ofx-upload",
    account: {
      id: "clean-account",
      providerRef: "clean-account",
      name: "Synthetic account",
      type: "checking",
      currency: "CAD",
      institution: "Synthetic Bank"
    },
    transactions: [{
      id: providerRef,
      accountId: "clean-account",
      postedAt: "2026-07-21",
      amount,
      currency: "CAD",
      description: `Synthetic ${providerRef}`,
      status: "posted",
      providerRef
    }]
  };
}

describeOrSkip("D9 banking persistence against PostgreSQL", () => {
  let pool: PgPoolHandle;
  let ephemeral: EphemeralDb;

  beforeAll(async () => {
    ephemeral = await createEphemeralDb("banking_d9");
    pool = createPgPool({ connectionString: ephemeral.connectionString, max: 8 });
    await runMigrations(pool, {
      directory: new URL("../../src/db/migrations", import.meta.url).pathname
    });
  }, 30000);

  afterAll(async () => {
    if (pool) await pool.end();
    if (ephemeral) await ephemeral.drop();
  });

  async function seedTenant(label: string): Promise<SeedTenant> {
    const organizationId = randomUUID();
    const actorUserId = randomUUID();
    await pool.withClient(async (client) => {
      await client.query("begin");
      try {
        await client.query("select set_config('app.current_organization_id', $1, true)", [organizationId]);
        await client.query(
          `insert into organizations (
             id, legal_name, display_name, slug, status, default_locale, default_currency,
             default_timezone, country, province_state
           ) values ($1, $2, $2, $3, 'active', 'en', 'CAD', 'America/Toronto', 'CA', 'QC')`,
          [organizationId, `D9 ${label}`, `d9-${label}-${organizationId.slice(0, 8)}`]
        );
        await client.query(
          `with identity as (
             insert into user_identities (
               id, email, display_name, preferred_locale, mfa_state, status, actor_type
             ) values ($1, $2, 'D9 actor', 'en', 'passkey', 'active', 'human')
             returning id
           )
           insert into users (id, organization_id, email, display_name, preferred_locale, status)
           select identity.id, $3, $2, 'D9 actor', 'en', 'active' from identity`,
          [actorUserId, `d9-${label}-${organizationId.slice(0, 8)}@test.local`, organizationId]
        );
        await client.query("commit");
      } catch (error) {
        await client.query("rollback");
        throw error;
      }
    });
    return { organizationId, actorUserId };
  }

  async function insertPayment(tenant: SeedTenant, amountMinor: number): Promise<string> {
    return pool.withClient(async (client) => {
      await client.query("begin");
      try {
        await client.query("select set_config('app.current_organization_id', $1, true)", [tenant.organizationId]);
        const company = await client.query<{ id: string }>(
          `insert into companies (organization_id, display_name)
           values ($1, 'D9 customer') returning id`,
          [tenant.organizationId]
        );
        const money = JSON.stringify({ amountMinor, currency: "CAD", scale: 2 });
        const invoice = await client.query<{ id: string }>(
          `insert into invoices (
             organization_id, company_id, invoice_number, status, currency, subtotal, tax_total, total
           ) values ($1, $2, $3, 'issued', 'CAD', $4::jsonb, $5::jsonb, $4::jsonb) returning id`,
          [tenant.organizationId, company.rows[0]!.id, `D9-${randomUUID()}`, money, JSON.stringify({ amountMinor: 0, currency: "CAD", scale: 2 })]
        );
        const payment = await client.query<{ id: string }>(
          `insert into payments (organization_id, invoice_id, amount, payment_date, method, reference)
           values ($1, $2, $3::jsonb, '2026-07-21', 'bank_transfer', 'D9') returning id`,
          [tenant.organizationId, invoice.rows[0]!.id, money]
        );
        await client.query("commit");
        return payment.rows[0]!.id;
      } catch (error) {
        await client.query("rollback");
        throw error;
      }
    });
  }

  async function insertProposedLink(tenant: SeedTenant, transactionId: string, paymentId: string): Promise<string> {
    return pool.withClient(async (client) => {
      await client.query("begin");
      try {
        await client.query("select set_config('app.current_organization_id', $1, true)", [tenant.organizationId]);
        const result = await client.query<{ id: string }>(
          `insert into reconciliation_links (
             organization_id, bank_transaction_id, candidate_kind, candidate_id, score, reasons
           ) values ($1, $2, 'payment', $3, 0.8, '["test"]'::jsonb) returning id`,
          [tenant.organizationId, transactionId, paymentId]
        );
        await client.query("commit");
        return result.rows[0]!.id;
      } catch (error) {
        await client.query("rollback");
        throw error;
      }
    });
  }

  it("enforces RLS and rejects composite cross-tenant or provider/account references", async () => {
    const tenantA = await seedTenant("a");
    const tenantB = await seedTenant("b");
    const [transactionA] = (await importBankingSnapshot(pool, tenantA, importInput("a-tx"))).imported;
    const [transactionB] = (await importBankingSnapshot(pool, tenantB, importInput("b-tx"))).imported;
    const paymentA = await insertPayment(tenantA, 10000);
    const linkA = await insertProposedLink(tenantA, transactionA!.id, paymentA);
    const paymentB = await insertPayment(tenantB, 10000);

    const app = buildApp({ db: pool, resolveTenant: headerTenantResolver });
    const worklist = await app.request("/banking/transactions", {
      headers: {
        "x-organization-id": tenantA.organizationId,
        "x-user-identity-id": tenantA.actorUserId
      }
    });
    expect(worklist.status).toBe(200);
    const worklistItems = (await worklist.json() as { items: Array<{ id: string }> }).items.map((item) => item.id);
    expect(worklistItems).toContain(transactionA!.id);
    expect(worklistItems).not.toContain(transactionB!.id);

    await pool.withClient(async (client) => {
      await client.query("begin");
      try {
        await client.query("set local role openerp_app");
        const unscoped = await client.query("select id from bank_transactions");
        expect(unscoped.rows).toEqual([]);
        expect((await client.query("select id from bank_accounts")).rows).toEqual([]);
        expect((await client.query("select id from reconciliation_links")).rows).toEqual([]);
        await client.query("select set_config('app.current_organization_id', $1, true)", [tenantA.organizationId]);
        const scoped = await client.query<{ id: string }>("select id from bank_transactions");
        expect(scoped.rows.map((row) => row.id)).toContain(transactionA!.id);
        expect((await client.query<{ id: string }>("select id from bank_accounts")).rows.map((row) => row.id)).toContain(transactionA!.bankAccountId);
        expect((await client.query<{ id: string }>("select id from reconciliation_links")).rows.map((row) => row.id)).toContain(linkA);

        await client.query("savepoint cross_org_reference");
        await expect(client.query(
          `insert into bank_transactions (
             organization_id, bank_account_id, provider, provider_transaction_ref, posted_at, amount, raw_description, normalized_snapshot
           ) values ($1, $2, 'ofx', 'cross-org', '2026-07-21T00:00:00.000Z',
             '{"amountMinor":100,"currency":"CAD","scale":2}'::jsonb, 'x',
             '{"sourceId":"cross-org","providerRef":"cross-org","postedAt":"2026-07-21T00:00:00.000Z","amount":{"amountMinor":100,"currency":"CAD","scale":2},"description":"x"}'::jsonb)`,
          [tenantA.organizationId, transactionB!.bankAccountId]
        )).rejects.toMatchObject({ code: "23503" });
        await client.query("rollback to savepoint cross_org_reference");
        await client.query("savepoint provider_account_mismatch");
        await expect(client.query(
          `insert into bank_transactions (
             organization_id, bank_account_id, provider, provider_transaction_ref, posted_at, amount, raw_description, normalized_snapshot
           ) values ($1, $2, 'plaid_sandbox', 'wrong-provider', '2026-07-21T00:00:00.000Z',
             '{"amountMinor":100,"currency":"CAD","scale":2}'::jsonb, 'x',
             '{"sourceId":"wrong-provider","providerRef":"wrong-provider","postedAt":"2026-07-21T00:00:00.000Z","amount":{"amountMinor":100,"currency":"CAD","scale":2},"description":"x"}'::jsonb)`,
          [tenantA.organizationId, transactionA!.bankAccountId]
        )).rejects.toMatchObject({ code: "23503" });
        await client.query("rollback to savepoint provider_account_mismatch");
        await client.query("savepoint cross_org_payment_candidate");
        await expect(client.query(
          `insert into reconciliation_links (
             organization_id, bank_transaction_id, candidate_kind, candidate_id, score, reasons
           ) values ($1, $2, 'payment', $3, 0.8, '["test"]'::jsonb)`,
          [tenantA.organizationId, transactionA!.id, paymentB]
        )).rejects.toMatchObject({ code: "23503" });
        await client.query("rollback to savepoint cross_org_payment_candidate");
        await client.query("rollback");
      } catch (error) {
        await client.query("rollback");
        throw error;
      }
    });
  });

  it("blocks noncanonical providers, malformed snapshots, and imported evidence mutation for openerp_app", async () => {
    const tenant = await seedTenant("immutability");
    const [transaction] = (await importBankingSnapshot(pool, tenant, importInput("immutable-tx"))).imported;

    await pool.withClient(async (client) => {
      await client.query("begin");
      try {
        await client.query("set local role openerp_app");
        await client.query("select set_config('app.current_organization_id', $1, true)", [tenant.organizationId]);

        await client.query("savepoint noncanonical_provider");
        await expect(client.query(
          `insert into bank_accounts (
             organization_id, provider, provider_account_ref, display_name, account_type, currency, institution
           ) values ($1, 'plaid-prod', 'blocked-provider', 'blocked', 'checking', 'CAD', 'Synthetic')`,
          [tenant.organizationId]
        )).rejects.toMatchObject({ code: "23514" });
        await client.query("rollback to savepoint noncanonical_provider");

        await client.query("savepoint malformed_snapshot");
        await expect(client.query(
          `insert into bank_transactions (
             organization_id, bank_account_id, provider, provider_transaction_ref, posted_at, amount, raw_description, normalized_snapshot
           ) values ($1, $2, 'ofx', 'malformed-snapshot', now(),
             '{"amountMinor":100,"currency":"CAD","scale":2}'::jsonb, 'x', '{}'::jsonb)`,
          [tenant.organizationId, transaction!.bankAccountId]
        )).rejects.toMatchObject({ code: "23514" });
        await client.query("rollback to savepoint malformed_snapshot");

        await client.query("savepoint immutable_content");
        await expect(client.query(
          "update bank_transactions set raw_description = 'rewritten' where id = $1",
          [transaction!.id]
        )).rejects.toMatchObject({ code: "23514" });
        await client.query("rollback to savepoint immutable_content");

        await client.query("savepoint immutable_delete");
        await expect(client.query("delete from bank_transactions where id = $1", [transaction!.id]))
          .rejects.toMatchObject({ code: "23514" });
        await client.query("rollback to savepoint immutable_delete");

        const statusUpdate = await client.query<{ reconciliation_status: string }>(
          "update bank_transactions set reconciliation_status = 'ignored', updated_at = now() where id = $1 returning reconciliation_status",
          [transaction!.id]
        );
        expect(statusUpdate.rows[0]?.reconciliation_status).toBe("ignored");
        await client.query("rollback");
      } catch (error) {
        await client.query("rollback");
        throw error;
      }
    });
  });

  it("allows only one concurrent confirmation for a bank transaction and for a payment candidate", async () => {
    const tenant = await seedTenant("concurrent");
    const imported = (await importBankingSnapshot(pool, tenant, {
      ...importInput("tx-one"),
      transactions: [
        (importInput("tx-one") as { transactions: unknown[] }).transactions[0],
        { ...(importInput("tx-two") as { transactions: Record<string, unknown>[] }).transactions[0], providerRef: "tx-two", id: "tx-two" }
      ]
    })).imported;
    const [transactionOne, transactionTwo] = imported as BankTransaction[];
    const paymentOne = await insertPayment(tenant, 10000);
    const paymentTwo = await insertPayment(tenant, 10000);

    const sameTransactionOne = await insertProposedLink(tenant, transactionOne!.id, paymentOne);
    const sameTransactionTwo = await insertProposedLink(tenant, transactionOne!.id, paymentTwo);
    const sameTransactionResults = await Promise.allSettled([
      confirmReconciliationProposal(pool, tenant, sameTransactionOne),
      confirmReconciliationProposal(pool, tenant, sameTransactionTwo)
    ]);
    expect(sameTransactionResults.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(sameTransactionResults.filter((result) => result.status === "rejected")).toHaveLength(1);
    const sameTransactionFailure = sameTransactionResults.find((result) => result.status === "rejected");
    expect(sameTransactionFailure?.status === "rejected" && sameTransactionFailure.reason).toBeInstanceOf(BankingConflictError);

    const sharedPaymentOne = await insertPayment(tenant, 10000);
    const sharedPaymentLink = await insertProposedLink(tenant, transactionTwo!.id, sharedPaymentOne);
    const transactionThree = (await importBankingSnapshot(pool, tenant, importInput("tx-three"))).imported[0]!;
    const sharedPaymentOtherLink = await insertProposedLink(tenant, transactionThree.id, sharedPaymentOne);
    const sameCandidateResults = await Promise.allSettled([
      confirmReconciliationProposal(pool, tenant, sharedPaymentLink),
      confirmReconciliationProposal(pool, tenant, sharedPaymentOtherLink)
    ]);
    expect(sameCandidateResults.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(sameCandidateResults.filter((result) => result.status === "rejected")).toHaveLength(1);
    const sameCandidateFailure = sameCandidateResults.find((result) => result.status === "rejected");
    expect(sameCandidateFailure?.status === "rejected" && sameCandidateFailure.reason).toBeInstanceOf(BankingConflictError);

    const transactionFour = (await importBankingSnapshot(pool, tenant, importInput("tx-four"))).imported[0]!;
    const paymentFour = await insertPayment(tenant, 10000);
    const linkFour = await insertProposedLink(tenant, transactionFour.id, paymentFour);
    const confirmIgnore = await Promise.allSettled([
      confirmReconciliationProposal(pool, tenant, linkFour),
      ignoreBankTransaction(pool, tenant, transactionFour.id)
    ]);
    expect(confirmIgnore.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    const confirmIgnoreFailure = confirmIgnore.find((result) => result.status === "rejected");
    expect(confirmIgnoreFailure?.status === "rejected" && confirmIgnoreFailure.reason).toBeInstanceOf(BankingConflictError);

    const transactionFive = (await importBankingSnapshot(pool, tenant, importInput("tx-five"))).imported[0]!;
    const paymentFive = await insertPayment(tenant, 10000);
    const linkFive = await insertProposedLink(tenant, transactionFive.id, paymentFive);
    const rejectIgnore = await Promise.allSettled([
      rejectReconciliationProposal(pool, tenant, linkFive),
      ignoreBankTransaction(pool, tenant, transactionFive.id)
    ]);
    expect(rejectIgnore.every((result) =>
      result.status === "fulfilled" || result.reason instanceof BankingConflictError
    )).toBe(true);

    await pool.withClient(async (client) => {
      await client.query("begin");
      try {
        await client.query("select set_config('app.current_organization_id', $1, true)", [tenant.organizationId]);
        const confirmed = await client.query<{ count: string }>(
          `select count(*)::text as count from reconciliation_links
            where organization_id = $1 and status = 'confirmed'`,
          [tenant.organizationId]
        );
        const confirmationAudits = await client.query<{ count: string }>(
          `select count(*)::text as count from audit_events
            where organization_id = $1 and action = 'banking.reconciliation.confirmed'`,
          [tenant.organizationId]
        );
        expect(Number(confirmed.rows[0]?.count)).toBe(3);
        expect(Number(confirmationAudits.rows[0]?.count)).toBe(3);
        await client.query("rollback");
      } catch (error) {
        await client.query("rollback");
        throw error;
      }
    });
  });

  it("refreshes a persisted PostgreSQL transaction into a durable proposal", async () => {
    const tenant = await seedTenant("refresh");
    await importBankingSnapshot(pool, tenant, importInput("refresh-transaction"));
    await insertPayment(tenant, 10000);

    const refreshed = await refreshReconciliationProposals(pool, tenant);
    expect(refreshed.created).toHaveLength(1);
    expect(refreshed.created[0]?.status).toBe("proposed");
    expect(refreshed.proposals.map((proposal) => proposal.id)).toContain(refreshed.created[0]?.id);
  });

  it("makes a dormant proposed link visible again after ignore then unignore", async () => {
    const tenant = await seedTenant("unignore");
    const transaction = (await importBankingSnapshot(pool, tenant, importInput("unignore-transaction"))).imported[0]!;
    const ignored = await ignoreBankTransaction(pool, tenant, transaction.id);
    const paymentId = await insertPayment(tenant, 10000);
    const dormantProposalId = await insertProposedLink(tenant, transaction.id, paymentId);

    expect(ignored.reconciliationStatus).toBe("ignored");
    expect(await listStoredProposals(pool, tenant)).toEqual([]);

    const restored = await unignoreBankTransaction(pool, tenant, transaction.id);
    const visible = await listStoredProposals(pool, tenant);

    expect(restored.reconciliationStatus).toBe("unmatched");
    expect(visible.map((link) => link.id)).toContain(dormantProposalId);
  });

  it("retrieves a confirmed link through suggestions and unmatches it using that link id", async () => {
    const tenant = await seedTenant("confirmed-read");
    const transaction = (await importBankingSnapshot(pool, tenant, importInput("confirmed-read-transaction"))).imported[0]!;
    const paymentId = await insertPayment(tenant, 10000);
    const proposalId = await insertProposedLink(tenant, transaction.id, paymentId);
    await confirmReconciliationProposal(pool, tenant, proposalId);
    const app = buildApp({ db: pool, resolveTenant: headerTenantResolver });
    const headers = {
      "x-organization-id": tenant.organizationId,
      "x-user-identity-id": tenant.actorUserId
    };

    const confirmed = await app.request("/banking/reconciliation/suggestions?status=confirmed", { headers });
    const confirmedItems = (await confirmed.json() as { items: Array<{ id: string; status: string }> }).items;
    const unmatch = await app.request(`/banking/reconciliation/${confirmedItems[0]!.id}/unmatch`, { method: "POST", headers });
    const proposed = await app.request("/banking/reconciliation/suggestions", { headers });

    expect(confirmed.status).toBe(200);
    expect(confirmedItems).toEqual([expect.objectContaining({ id: proposalId, status: "confirmed" })]);
    expect(unmatch.status).toBe(200);
    expect((await proposed.json() as { items: Array<{ id: string; status: string }> }).items).toEqual([
      expect.objectContaining({ id: proposalId, status: "proposed" })
    ]);
  });
});
