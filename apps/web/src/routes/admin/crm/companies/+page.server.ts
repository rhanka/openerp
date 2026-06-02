import { env } from "$env/dynamic/private";
import { fail, type Actions } from "@sveltejs/kit";

import type { Company } from "@sentropic/openerp-domain/crm";

import { createApiClient } from "$lib/api/client";

import type { PageServerLoad } from "./$types";

// Demo Slice 2 — CRM companies admin page. Mirrors the approvals page pattern:
// SSR loader hits the live API when locals.session is present, otherwise falls
// back to a deterministic demo list so the route remains reviewable without
// the API up.

const DEMO_FALLBACK: Company[] = [
  {
    id: "demo-co-1",
    organizationId: "demo-org",
    displayName: "Acme Northwind",
    legalName: "Acme Northwind Inc.",
    status: "active",
    ownerUserId: null,
    teamId: null,
    website: "https://example.com",
    phone: null,
    email: null,
    language: "en",
    taxRegion: "CA-QC",
    billingAddress: null,
    shippingAddress: null,
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

export const load: PageServerLoad = async ({ fetch, locals }) => {
  const session = clientFromLocalsOrEnv(fetch, locals);
  if (!session) {
    return { companies: DEMO_FALLBACK, source: "demo" as const, locale: locals.locale };
  }
  try {
    const companies = await session.client.listCompanies();
    return { companies, source: "api" as const, locale: locals.locale };
  } catch (err) {
    return {
      companies: [] as Company[],
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
    const legalName = String(form.get("legalName") ?? "").trim() || null;
    const website = String(form.get("website") ?? "").trim() || null;
    const email = String(form.get("email") ?? "").trim() || null;
    const phone = String(form.get("phone") ?? "").trim() || null;

    const session = clientFromLocalsOrEnv(fetch, locals);
    if (!session) return fail(503, { code: "DEMO_MODE_NO_API" });
    try {
      const created = await session.client.createCompany({
        displayName,
        legalName,
        website,
        email,
        phone
      });
      return { ok: true as const, id: created.id, displayName: created.displayName };
    } catch (err) {
      return fail(502, { code: "API_ERROR", message: err instanceof Error ? err.message : String(err) });
    }
  },

  archive: async ({ request, fetch, locals }) => {
    const form = await request.formData();
    const id = String(form.get("id") ?? "");
    if (!id) return fail(400, { code: "ID_REQUIRED" });
    const session = clientFromLocalsOrEnv(fetch, locals);
    if (!session) return fail(503, { code: "DEMO_MODE_NO_API" });
    try {
      await session.client.updateCompany(id, { status: "archived" });
      return { ok: true as const, id, archived: true };
    } catch (err) {
      return fail(502, { code: "API_ERROR", message: err instanceof Error ? err.message : String(err) });
    }
  },

  reactivate: async ({ request, fetch, locals }) => {
    const form = await request.formData();
    const id = String(form.get("id") ?? "");
    if (!id) return fail(400, { code: "ID_REQUIRED" });
    const session = clientFromLocalsOrEnv(fetch, locals);
    if (!session) return fail(503, { code: "DEMO_MODE_NO_API" });
    try {
      await session.client.updateCompany(id, { status: "active" });
      return { ok: true as const, id, archived: false };
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
      await session.client.deleteCompany(id);
      return { ok: true as const, id, deleted: true };
    } catch (err) {
      return fail(502, { code: "API_ERROR", message: err instanceof Error ? err.message : String(err) });
    }
  }
};
