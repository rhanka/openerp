import { env } from "$env/dynamic/private";
import { error, fail, type Actions } from "@sveltejs/kit";

import type { InvoiceWithLines, JournalEntryWithLines, Payment } from "@sentropic/openerp-domain/billing";

import { createApiClient } from "$lib/api/client";

import type { PageServerLoad } from "./$types";

const DEMO_FALLBACK: InvoiceWithLines = {
  id: "demo-inv-1",
  organizationId: "demo-org",
  companyId: "demo-company-1",
  projectId: null,
  invoiceProposalId: null,
  invoiceNumber: "INV-000001",
  status: "issued",
  currency: "CAD",
  subtotal: { amountMinor: 15000, currency: "CAD", scale: 2 },
  taxTotal: { amountMinor: 0, currency: "CAD", scale: 2 },
  total: { amountMinor: 15000, currency: "CAD", scale: 2 },
  taxCategoryId: null,
  taxBreakdown: null,
  issueDate: "2026-05-01",
  dueDate: null,
  issuedAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  lines: [
    {
      id: "demo-line-1",
      organizationId: "demo-org",
      invoiceId: "demo-inv-1",
      sourceType: "manual",
      sourceId: null,
      description: "Consulting services — May 2026",
      quantity: 60,
      unitPrice: { amountMinor: 10000, currency: "CAD", scale: 2 },
      amount: { amountMinor: 10000, currency: "CAD", scale: 2 },
      createdAt: new Date().toISOString()
    },
    {
      id: "demo-line-2",
      organizationId: "demo-org",
      invoiceId: "demo-inv-1",
      sourceType: "manual",
      sourceId: null,
      description: "Project management — May 2026",
      quantity: 30,
      unitPrice: { amountMinor: 10000, currency: "CAD", scale: 2 },
      amount: { amountMinor: 5000, currency: "CAD", scale: 2 },
      createdAt: new Date().toISOString()
    }
  ]
};

const DEMO_PAYMENTS: Payment[] = [
  {
    id: "demo-pay-1",
    organizationId: "demo-org",
    invoiceId: "demo-inv-1",
    companyId: "demo-company-1",
    amount: { amountMinor: 10000, currency: "CAD", scale: 2 },
    paymentDate: "2026-05-10",
    method: "bank_transfer",
    reference: "REF-001",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

function clientFromLocalsOrEnv(
  fetchImpl: typeof fetch,
  locals: App.Locals
): { client: ReturnType<typeof createApiClient> } | null {
  const baseUrl = env.OPENERP_API_URL ?? "http://127.0.0.1:4000";
  const token = locals.session?.token;
  if (token) {
    return {
      client: createApiClient({ baseUrl, token, fetch: fetchImpl as typeof globalThis.fetch })
    };
  }
  const organizationId = env.OPENERP_DEV_ORG_ID ?? "";
  const actorUserId = env.OPENERP_DEV_USER_ID ?? "";
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

export const load: PageServerLoad = async ({ params, fetch, locals }) => {
  const session = clientFromLocalsOrEnv(fetch, locals);
  if (!session) {
    // Demo fallback: return demo if id matches, else 404
    if (params.id === "demo-inv-1") {
      return {
        invoice: DEMO_FALLBACK,
        payments: DEMO_PAYMENTS,
        journalEntry: null,
        source: "demo" as const,
        locale: locals.locale
      };
    }
    error(404, "Invoice not found");
  }
  try {
    const [invoice, payments] = await Promise.all([
      session.client.getInvoice(params.id),
      session.client.listPayments({ invoiceId: params.id })
    ]);
    // Try to find an existing journal entry for this invoice
    let journalEntry: JournalEntryWithLines | null = null;
    try {
      const jeResult = await session.client.listJournalEntries({
        sourceType: "invoice",
        sourceId: params.id,
        status: "posted"
      });
      if (jeResult.items.length > 0) {
        journalEntry = await session.client.getJournalEntry(jeResult.items[0]!.id);
      }
    } catch {
      // Non-fatal: journal entry lookup is best-effort
    }
    return { invoice, payments, journalEntry, source: "api" as const, locale: locals.locale };
  } catch (err) {
    const apiErr = err as { status?: number };
    if (apiErr.status === 404) {
      error(404, "Invoice not found");
    }
    error(500, "Could not load invoice");
  }
};

export const actions: Actions = {
  computeTaxes: async ({ params, fetch, locals }) => {
    const id = params.id;
    if (!id) return fail(400, { code: "ID_REQUIRED" });
    const session = clientFromLocalsOrEnv(fetch, locals);
    if (!session) return fail(503, { code: "DEMO_MODE_NO_API" });
    try {
      const updated = await session.client.computeInvoiceTaxes(id);
      return { ok: true as const, id: updated.id, action: "taxesComputed" };
    } catch (err) {
      const apiErr = err as { status?: number; code?: string };
      if (apiErr.status === 404) return fail(404, { code: "NOT_FOUND" });
      return fail(502, { code: "API_ERROR", message: err instanceof Error ? err.message : String(err) });
    }
  },

  postToJournal: async ({ params, fetch, locals }) => {
    const id = params.id;
    if (!id) return fail(400, { code: "ID_REQUIRED" });
    const session = clientFromLocalsOrEnv(fetch, locals);
    if (!session) return fail(503, { code: "DEMO_MODE_NO_API" });
    try {
      const entry = await session.client.postInvoiceToJournal(id);
      return { ok: true as const, id: entry.id, action: "postedToJournal" };
    } catch (err) {
      const apiErr = err as { status?: number; code?: string };
      if (apiErr.status === 404) return fail(404, { code: "NOT_FOUND" });
      if (apiErr.status === 422) return fail(422, { code: apiErr.code ?? "JOURNAL_POSTING_ERROR" });
      return fail(502, { code: "API_ERROR", message: err instanceof Error ? err.message : String(err) });
    }
  }
};
