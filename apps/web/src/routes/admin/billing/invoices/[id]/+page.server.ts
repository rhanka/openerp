import { env } from "$env/dynamic/private";
import { error } from "@sveltejs/kit";

import type { InvoiceWithLines } from "@sentropic/openerp-domain/billing";

import { createApiClient } from "$lib/api/client";

import type { PageServerLoad } from "./$types";

const DEMO_FALLBACK: InvoiceWithLines = {
  id: "demo-inv-1",
  organizationId: "demo-org",
  companyId: "demo-company-1",
  projectId: null,
  invoiceProposalId: null,
  invoiceNumber: "INV-000001",
  status: "draft",
  currency: "CAD",
  subtotal: { amountMinor: 15000, currency: "CAD", scale: 2 },
  taxTotal: { amountMinor: 0, currency: "CAD", scale: 2 },
  total: { amountMinor: 15000, currency: "CAD", scale: 2 },
  issueDate: null,
  dueDate: null,
  issuedAt: null,
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

export const load: PageServerLoad = async ({ params, fetch, locals }) => {
  const session = clientFromLocalsOrEnv(fetch, locals);
  if (!session) {
    // Demo fallback: return demo if id matches, else 404
    if (params.id === "demo-inv-1") {
      return { invoice: DEMO_FALLBACK, source: "demo" as const, locale: locals.locale };
    }
    error(404, "Invoice not found");
  }
  try {
    const invoice = await session.client.getInvoice(params.id);
    return { invoice, source: "api" as const, locale: locals.locale };
  } catch (err) {
    const apiErr = err as { status?: number };
    if (apiErr.status === 404) {
      error(404, "Invoice not found");
    }
    error(500, "Could not load invoice");
  }
};
