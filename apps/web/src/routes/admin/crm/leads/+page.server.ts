import { env } from "$env/dynamic/private";
import { fail, type Actions } from "@sveltejs/kit";

import type { Lead } from "@sentropic/openerp-domain/crm";

import { createApiClient } from "$lib/api/client";

import type { PageServerLoad } from "./$types";

const DEMO_FALLBACK: Lead[] = [
  {
    id: "demo-lead-1",
    organizationId: "demo-org",
    source: "web_form",
    displayName: "Acme, inbound demo request",
    companyName: "Acme Acquisition Corp.",
    contactName: "Alice Tremblay",
    email: "alice@acme.example",
    phone: "+1-514-555-0100",
    description: "Requested a 30-day evaluation of the bilingual platform.",
    status: "new",
    ownerUserId: null,
    teamId: null,
    convertedAt: null,
    convertedCompanyId: null,
    convertedContactId: null,
    convertedOpportunityId: null,
    createdAt: new Date(Date.now() - 86_400_000).toISOString(),
    updatedAt: new Date(Date.now() - 86_400_000).toISOString()
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

export const load: PageServerLoad = async ({ fetch, locals }) => {
  const session = clientFromLocalsOrEnv(fetch, locals);
  if (!session) {
    return { leads: DEMO_FALLBACK, source: "demo" as const, locale: locals.locale };
  }
  try {
    const leads = await session.client.listLeads();
    return { leads, source: "api" as const, locale: locals.locale };
  } catch (err) {
    return {
      leads: [] as Lead[],
      source: "error" as const,
      locale: locals.locale,
      message: err instanceof Error ? err.message : String(err)
    };
  }
};

export const actions: Actions = {
  create: async ({ request, fetch, locals }) => {
    const form = await request.formData();
    const displayName = String(form.get("displayName") ?? "").trim();
    if (!displayName) return fail(400, { code: "DISPLAYNAME_REQUIRED" });
    const source = String(form.get("source") ?? "").trim() || null;
    const companyName = String(form.get("companyName") ?? "").trim() || null;
    const contactName = String(form.get("contactName") ?? "").trim() || null;
    const email = String(form.get("email") ?? "").trim() || null;
    const phone = String(form.get("phone") ?? "").trim() || null;
    const description = String(form.get("description") ?? "").trim() || null;

    const session = clientFromLocalsOrEnv(fetch, locals);
    if (!session) return fail(503, { code: "DEMO_MODE_NO_API" });
    try {
      const created = await session.client.createLead({
        displayName,
        source,
        companyName,
        contactName,
        email,
        phone,
        description
      });
      return { ok: true as const, id: created.id, displayName: created.displayName };
    } catch (err) {
      return fail(502, { code: "API_ERROR", message: err instanceof Error ? err.message : String(err) });
    }
  },

  convert: async ({ request, fetch, locals }) => {
    const form = await request.formData();
    const id = String(form.get("id") ?? "");
    if (!id) return fail(400, { code: "ID_REQUIRED" });
    const session = clientFromLocalsOrEnv(fetch, locals);
    if (!session) return fail(503, { code: "DEMO_MODE_NO_API" });
    try {
      const result = await session.client.convertLead(id);
      return {
        ok: true as const,
        id: result.lead.id,
        opportunityId: result.opportunity.id,
        companyId: result.company.id
      };
    } catch (err) {
      return fail(502, { code: "API_ERROR", message: err instanceof Error ? err.message : String(err) });
    }
  },

  disqualify: async ({ request, fetch, locals }) => {
    const form = await request.formData();
    const id = String(form.get("id") ?? "");
    if (!id) return fail(400, { code: "ID_REQUIRED" });
    const session = clientFromLocalsOrEnv(fetch, locals);
    if (!session) return fail(503, { code: "DEMO_MODE_NO_API" });
    try {
      await session.client.updateLead(id, { status: "disqualified" });
      return { ok: true as const, id, status: "disqualified" };
    } catch (err) {
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
      await session.client.deleteLead(id);
      return { ok: true as const, id, deleted: true };
    } catch (err) {
      return fail(502, { code: "API_ERROR", message: err instanceof Error ? err.message : String(err) });
    }
  }
};
