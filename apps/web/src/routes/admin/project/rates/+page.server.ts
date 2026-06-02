import { env } from "$env/dynamic/private";
import { fail, type Actions } from "@sveltejs/kit";

import type { Rate } from "@sentropic/openerp-domain/project";

import { createApiClient } from "$lib/api/client";

import type { PageServerLoad } from "./$types";

const DEMO_FALLBACK: Rate[] = [
  {
    id: "demo-rate-1",
    organizationId: "demo-org",
    name: "Senior consultant",
    amount: { amountMinor: 15000, currency: "CAD", scale: 2 },
    effectiveFrom: "2026-01-01",
    effectiveTo: null,
    active: true,
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
    return { rates: DEMO_FALLBACK, source: "demo" as const, locale: locals.locale };
  }
  try {
    const rates = await session.client.listRates();
    return { rates, source: "api" as const, locale: locals.locale };
  } catch (err) {
    return {
      rates: [] as Rate[],
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
    const amountDollarsRaw = String(form.get("amountDollars") ?? "").trim();
    const currency = String(form.get("currency") ?? "CAD").trim().toUpperCase() || "CAD";
    const effectiveFrom = String(form.get("effectiveFrom") ?? "").trim();
    if (!effectiveFrom) return fail(400, { code: "EFFECTIVE_FROM_REQUIRED" });
    const amountDollars = parseFloat(amountDollarsRaw);
    if (!Number.isFinite(amountDollars) || amountDollars < 0) return fail(400, { code: "AMOUNT_REQUIRED" });
    const amountMinor = Math.round(amountDollars * 100);

    const session = clientFromLocalsOrEnv(fetch, locals);
    if (!session) return fail(503, { code: "DEMO_MODE_NO_API" });
    try {
      const created = await session.client.createRate({
        name,
        amount: { amountMinor, currency, scale: 2 },
        effectiveFrom
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
      await session.client.deleteRate(id);
      return { ok: true as const, id, deleted: true };
    } catch (err) {
      return fail(502, { code: "API_ERROR", message: err instanceof Error ? err.message : String(err) });
    }
  }
};
