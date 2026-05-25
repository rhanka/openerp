import { env } from "$env/dynamic/private";
import { fail, type Actions } from "@sveltejs/kit";

import type { Contact } from "@sentropic/openerp-domain/crm";

import { createApiClient } from "$lib/api/client";

import type { PageServerLoad } from "./$types";

const DEMO_FALLBACK: Contact[] = [
  {
    id: "demo-ct-1",
    organizationId: "demo-org",
    companyId: "demo-co-1",
    displayName: "Alice Tremblay",
    firstName: "Alice",
    lastName: "Tremblay",
    title: "VP Operations",
    email: "alice@example.com",
    phone: null,
    language: "fr",
    status: "active",
    ownerUserId: null,
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
    return { contacts: DEMO_FALLBACK, source: "demo" as const, locale: locals.locale };
  }
  try {
    const contacts = await session.client.listContacts();
    return { contacts, source: "api" as const, locale: locals.locale };
  } catch (err) {
    return {
      contacts: [] as Contact[],
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
    const email = String(form.get("email") ?? "").trim() || null;
    const phone = String(form.get("phone") ?? "").trim() || null;
    const title = String(form.get("title") ?? "").trim() || null;
    const firstName = String(form.get("firstName") ?? "").trim() || null;
    const lastName = String(form.get("lastName") ?? "").trim() || null;

    const session = clientFromLocalsOrEnv(fetch, locals);
    if (!session) return fail(503, { code: "DEMO_MODE_NO_API" });
    try {
      const created = await session.client.createContact({
        displayName,
        firstName,
        lastName,
        title,
        email,
        phone
      });
      return { ok: true as const, id: created.id, displayName: created.displayName };
    } catch (err) {
      return fail(502, { code: "API_ERROR", message: err instanceof Error ? err.message : String(err) });
    }
  },

  deactivate: async ({ request, fetch, locals }) => {
    const form = await request.formData();
    const id = String(form.get("id") ?? "");
    if (!id) return fail(400, { code: "ID_REQUIRED" });
    const session = clientFromLocalsOrEnv(fetch, locals);
    if (!session) return fail(503, { code: "DEMO_MODE_NO_API" });
    try {
      await session.client.updateContact(id, { status: "inactive" });
      return { ok: true as const, id, inactive: true };
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
      await session.client.updateContact(id, { status: "active" });
      return { ok: true as const, id, inactive: false };
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
      await session.client.deleteContact(id);
      return { ok: true as const, id, deleted: true };
    } catch (err) {
      return fail(502, { code: "API_ERROR", message: err instanceof Error ? err.message : String(err) });
    }
  }
};
