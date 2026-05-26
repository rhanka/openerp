import { env } from "$env/dynamic/private";

import type { Account, JournalEntryWithLines } from "@sentropic/openerp-domain/billing";

import { createApiClient } from "$lib/api/client";

import type { PageServerLoad } from "./$types";

const DEMO_ACCOUNTS: Account[] = [
  {
    id: "demo-acc-1000",
    organizationId: "demo-org",
    code: "1000",
    name: "Cash / Bank",
    type: "asset",
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "demo-acc-1100",
    organizationId: "demo-org",
    code: "1100",
    name: "Accounts Receivable",
    type: "asset",
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "demo-acc-2300",
    organizationId: "demo-org",
    code: "2300",
    name: "Tax Payable",
    type: "liability",
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "demo-acc-2310",
    organizationId: "demo-org",
    code: "2310",
    name: "GST Payable",
    type: "liability",
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "demo-acc-2320",
    organizationId: "demo-org",
    code: "2320",
    name: "QST Payable",
    type: "liability",
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "demo-acc-4000",
    organizationId: "demo-org",
    code: "4000",
    name: "Service Revenue",
    type: "revenue",
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

const DEMO_JOURNAL_ENTRIES: JournalEntryWithLines[] = [
  {
    id: "demo-je-1",
    organizationId: "demo-org",
    entryDate: "2026-05-25",
    reference: "INV-000001",
    description: "Journal entry for invoice INV-000001",
    sourceType: "invoice",
    sourceId: "demo-inv-1",
    status: "posted",
    postedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lines: [
      {
        id: "demo-jel-1",
        organizationId: "demo-org",
        journalEntryId: "demo-je-1",
        accountId: "demo-acc-1100",
        debit: { amountMinor: 11498, currency: "CAD", scale: 2 },
        credit: { amountMinor: 0, currency: "CAD", scale: 2 },
        description: "AR — INV-000001",
        createdAt: new Date().toISOString()
      },
      {
        id: "demo-jel-2",
        organizationId: "demo-org",
        journalEntryId: "demo-je-1",
        accountId: "demo-acc-4000",
        debit: { amountMinor: 0, currency: "CAD", scale: 2 },
        credit: { amountMinor: 10000, currency: "CAD", scale: 2 },
        description: "Revenue — INV-000001",
        createdAt: new Date().toISOString()
      },
      {
        id: "demo-jel-3",
        organizationId: "demo-org",
        journalEntryId: "demo-je-1",
        accountId: "demo-acc-2310",
        debit: { amountMinor: 0, currency: "CAD", scale: 2 },
        credit: { amountMinor: 500, currency: "CAD", scale: 2 },
        description: "GST — INV-000001",
        createdAt: new Date().toISOString()
      },
      {
        id: "demo-jel-4",
        organizationId: "demo-org",
        journalEntryId: "demo-je-1",
        accountId: "demo-acc-2320",
        debit: { amountMinor: 0, currency: "CAD", scale: 2 },
        credit: { amountMinor: 998, currency: "CAD", scale: 2 },
        description: "QST — INV-000001",
        createdAt: new Date().toISOString()
      }
    ]
  }
];

function clientFromLocalsOrEnv(
  fetchImpl: typeof fetch,
  locals: App.Locals
): { client: ReturnType<typeof createApiClient> } | null {
  const baseUrl = env.OPENERP_API_URL ?? "http://127.0.0.1:4000";
  const organizationId = locals.session?.organizationId ?? env.OPENERP_DEV_ORG_ID ?? "";
  const actorUserId = locals.session?.userIdentityId ?? env.OPENERP_DEV_USER_ID ?? "";
  if (!organizationId || !actorUserId) return null;
  return {
    client: createApiClient({
      baseUrl,
      organizationId,
      actorUserId,
      fetch: fetchImpl as typeof globalThis.fetch
    })
  };
}

export const load: PageServerLoad = async ({ fetch, locals }) => {
  const session = clientFromLocalsOrEnv(fetch, locals);
  if (!session) {
    return {
      accounts: DEMO_ACCOUNTS,
      journalEntries: DEMO_JOURNAL_ENTRIES,
      source: "demo" as const,
      locale: locals.locale
    };
  }
  try {
    const [accountsResult, journalResult] = await Promise.all([
      session.client.listAccounts(),
      session.client.listJournalEntries()
    ]);
    const accounts = accountsResult.items;
    // Fetch lines for each entry
    const journalEntries: JournalEntryWithLines[] = await Promise.all(
      journalResult.items.slice(0, 20).map(async (je) => {
        try {
          return await session.client.getJournalEntry(je.id);
        } catch {
          return { ...je, lines: [] };
        }
      })
    );
    return { accounts, journalEntries, source: "api" as const, locale: locals.locale };
  } catch {
    return {
      accounts: DEMO_ACCOUNTS,
      journalEntries: DEMO_JOURNAL_ENTRIES,
      source: "error" as const,
      locale: locals.locale
    };
  }
};
