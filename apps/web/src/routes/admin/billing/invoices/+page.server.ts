import { env } from "$env/dynamic/private";
import { fail, type Actions } from "@sveltejs/kit";

import type { Invoice } from "@sentropic/openerp-domain/billing";
import type { InvoiceProposal } from "@sentropic/openerp-domain/project";

import { createApiClient } from "$lib/api/client";

import type { PageServerLoad } from "./$types";

const DEMO_PROPOSALS: InvoiceProposal[] = [
  {
    id: "demo-prop-1",
    organizationId: "demo-org",
    projectId: "demo-pr-1",
    companyId: null,
    status: "approved",
    periodStart: "2026-05-01",
    periodEnd: "2026-05-31",
    total: { amountMinor: 15000, currency: "CAD", scale: 2 },
    currency: "CAD",
    submittedAt: new Date(Date.now() - 3_600_000).toISOString(),
    createdAt: new Date(Date.now() - 7_200_000).toISOString(),
    updatedAt: new Date(Date.now() - 3_600_000).toISOString()
  }
];

const DEMO_FALLBACK: Invoice[] = [
  {
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
    taxCategoryId: null,
    taxBreakdown: null,
    issueDate: null,
    dueDate: null,
    issuedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
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
    return { invoices: DEMO_FALLBACK, approvedProposals: DEMO_PROPOSALS, source: "demo" as const, locale: locals.locale };
  }
  try {
    const [invoices, approvedProposals] = await Promise.all([
      session.client.listInvoices(),
      session.client.listInvoiceProposals({ status: "approved", limit: 100 })
    ]);
    return { invoices, approvedProposals, source: "api" as const, locale: locals.locale };
  } catch (err) {
    return {
      invoices: [] as Invoice[],
      approvedProposals: [] as InvoiceProposal[],
      source: "error" as const,
      locale: locals.locale,
      message: err instanceof Error ? err.message : String(err)
    };
  }
};

export const actions: Actions = {
  fromProposal: async ({ request, fetch, locals }) => {
    const form = await request.formData();
    const invoiceProposalId = String(form.get("invoiceProposalId") ?? "").trim();
    if (!invoiceProposalId) return fail(400, { code: "PROPOSAL_ID_REQUIRED" });
    const session = clientFromLocalsOrEnv(fetch, locals);
    if (!session) return fail(503, { code: "DEMO_MODE_NO_API" });
    try {
      const created = await session.client.createInvoiceFromProposal(invoiceProposalId);
      return { ok: true as const, id: created.id, invoiceNumber: created.invoiceNumber };
    } catch (err) {
      const apiErr = err as { status?: number; code?: string; message?: string };
      if (apiErr.status === 409) return fail(409, { code: apiErr.code ?? "CONFLICT", message: apiErr.message });
      if (apiErr.status === 404) return fail(404, { code: "NOT_FOUND" });
      return fail(502, { code: "API_ERROR", message: err instanceof Error ? err.message : String(err) });
    }
  },

  issue: async ({ request, fetch, locals }) => {
    const form = await request.formData();
    const id = String(form.get("id") ?? "");
    if (!id) return fail(400, { code: "ID_REQUIRED" });
    const session = clientFromLocalsOrEnv(fetch, locals);
    if (!session) return fail(503, { code: "DEMO_MODE_NO_API" });
    try {
      await session.client.issueInvoice(id);
      return { ok: true as const, id, action: "issued" };
    } catch (err) {
      const apiErr = err as { status?: number; code?: string };
      if (apiErr.status === 409) return fail(409, { code: "ILLEGAL_TRANSITION" });
      if (apiErr.status === 404) return fail(404, { code: "NOT_FOUND" });
      return fail(502, { code: "API_ERROR", message: err instanceof Error ? err.message : String(err) });
    }
  },

  pay: async ({ request, fetch, locals }) => {
    const form = await request.formData();
    const id = String(form.get("id") ?? "");
    if (!id) return fail(400, { code: "ID_REQUIRED" });
    const session = clientFromLocalsOrEnv(fetch, locals);
    if (!session) return fail(503, { code: "DEMO_MODE_NO_API" });
    try {
      await session.client.payInvoice(id);
      return { ok: true as const, id, action: "paid" };
    } catch (err) {
      const apiErr = err as { status?: number; code?: string };
      if (apiErr.status === 409) return fail(409, { code: "ILLEGAL_TRANSITION" });
      if (apiErr.status === 404) return fail(404, { code: "NOT_FOUND" });
      return fail(502, { code: "API_ERROR", message: err instanceof Error ? err.message : String(err) });
    }
  },

  void: async ({ request, fetch, locals }) => {
    const form = await request.formData();
    const id = String(form.get("id") ?? "");
    if (!id) return fail(400, { code: "ID_REQUIRED" });
    const session = clientFromLocalsOrEnv(fetch, locals);
    if (!session) return fail(503, { code: "DEMO_MODE_NO_API" });
    try {
      await session.client.voidInvoice(id);
      return { ok: true as const, id, action: "voided" };
    } catch (err) {
      const apiErr = err as { status?: number; code?: string };
      if (apiErr.status === 409) return fail(409, { code: "ILLEGAL_TRANSITION" });
      if (apiErr.status === 404) return fail(404, { code: "NOT_FOUND" });
      return fail(502, { code: "API_ERROR", message: err instanceof Error ? err.message : String(err) });
    }
  },

  delete: async ({ request, fetch, locals }) => {
    const form = await request.formData();
    const id = String(form.get("id") ?? "");
    if (!id) return fail(400, { code: "ID_REQUIRED" });
    const session = clientFromLocalsOrEnv(fetch, locals);
    if (!session) return fail(503, { code: "DEMO_MODE_NO_API" });
    try {
      await session.client.deleteInvoice(id);
      return { ok: true as const, id, deleted: true };
    } catch (err) {
      const apiErr = err as { status?: number; code?: string };
      if (apiErr.status === 409) return fail(409, { code: "ILLEGAL_TRANSITION" });
      if (apiErr.status === 404) return fail(404, { code: "NOT_FOUND" });
      return fail(502, { code: "API_ERROR", message: err instanceof Error ? err.message : String(err) });
    }
  }
};
