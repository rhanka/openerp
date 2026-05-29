import { env } from "$env/dynamic/private";
import { fail, type Actions } from "@sveltejs/kit";

import type { SavedView } from "@sentropic/openerp-domain/reporting";

import { createApiClient } from "$lib/api/client";

import type { PageServerLoad } from "./$types";

// Demo Slice 5.0 — Reporting saved-views admin page.
// SSR loader hits the live API when session is present, otherwise falls back
// to a deterministic demo list so the route remains reviewable without the API.

const DEMO_FALLBACK: SavedView[] = [
  {
    id: "demo-sv-1",
    organizationId: "demo-org",
    ownerUserId: null,
    resourceType: "crm.opportunity",
    name: "Open opportunities",
    filters: { status: "open" },
    columns: ["name", "status", "expectedValue"],
    sortBy: null,
    isShared: true,
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
    return { savedViews: DEMO_FALLBACK, source: "demo" as const, locale: locals.locale };
  }
  try {
    const savedViews = await session.client.listSavedViews();
    return { savedViews, source: "api" as const, locale: locals.locale };
  } catch (err) {
    return {
      savedViews: [] as SavedView[],
      source: "error" as const,
      locale: locals.locale,
      message: err instanceof Error ? err.message : String(err)
    };
  }
};

export const actions: Actions = {
  create: async ({ request, fetch, locals }) => {
    const form = await request.formData();
    const name = String(form.get("name") ?? "").trim();
    if (!name) return fail(400, { code: "NAME_REQUIRED" });
    const resourceType = String(form.get("resourceType") ?? "").trim();
    if (!resourceType) return fail(400, { code: "RESOURCE_TYPE_REQUIRED" });
    const isShared = form.get("isShared") === "on";

    const session = clientFromLocalsOrEnv(fetch, locals);
    if (!session) return fail(503, { code: "DEMO_MODE_NO_API" });
    try {
      const created = await session.client.createSavedView({
        name,
        resourceType,
        isShared
      });
      return { ok: true as const, id: created.id, name: created.name };
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
      await session.client.deleteSavedView(id);
      return { ok: true as const, id, deleted: true };
    } catch (err) {
      return fail(502, { code: "API_ERROR", message: err instanceof Error ? err.message : String(err) });
    }
  }
};
