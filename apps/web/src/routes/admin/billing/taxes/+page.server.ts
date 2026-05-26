import { env } from "$env/dynamic/private";
import { fail, type Actions } from "@sveltejs/kit";

import type { TaxCategory, TaxRateVersion } from "@sentropic/openerp-domain/billing";

import { createApiClient } from "$lib/api/client";

import type { PageServerLoad } from "./$types";

export interface TaxPageData {
  categories: TaxCategory[];
  rates: TaxRateVersion[];
  source: "api" | "demo" | "error";
  locale: string;
  message?: string;
}

const DEMO_CATEGORIES: TaxCategory[] = [
  {
    id: "demo-cat-std",
    organizationId: "demo-org",
    name: "Standard",
    code: "STD",
    description: "Federal + provincial standard rates",
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

const DEMO_RATES: TaxRateVersion[] = [
  {
    id: "demo-rate-gst",
    organizationId: "demo-org",
    taxCategoryId: "demo-cat-std",
    jurisdiction: "CA-QC",
    label: "GST",
    rateBps: 5000,
    compound: false,
    effectiveFrom: "2013-01-01",
    effectiveTo: null,
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "demo-rate-qst",
    organizationId: "demo-org",
    taxCategoryId: "demo-cat-std",
    jurisdiction: "CA-QC",
    label: "QST",
    rateBps: 9975,
    compound: false,
    effectiveFrom: "2013-01-01",
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
      categories: DEMO_CATEGORIES,
      rates: DEMO_RATES,
      source: "demo" as const,
      locale: locals.locale
    };
  }
  try {
    const [categories, rates] = await Promise.all([
      session.client.listTaxCategories(),
      session.client.listTaxRateVersions()
    ]);
    return { categories, rates, source: "api" as const, locale: locals.locale };
  } catch (err) {
    return {
      categories: [] as TaxCategory[],
      rates: [] as TaxRateVersion[],
      source: "error" as const,
      locale: locals.locale,
      message: err instanceof Error ? err.message : String(err)
    };
  }
};

export const actions: Actions = {
  createCategory: async ({ request, fetch, locals }) => {
    const form = await request.formData();
    const name = String(form.get("name") ?? "").trim();
    const code = String(form.get("code") ?? "").trim();
    const description = String(form.get("description") ?? "").trim() || null;
    if (!name) return fail(400, { code: "NAME_REQUIRED" });
    if (!code) return fail(400, { code: "CODE_REQUIRED" });
    const session = clientFromLocalsOrEnv(fetch, locals);
    if (!session) return fail(503, { code: "DEMO_MODE_NO_API" });
    try {
      const created = await session.client.createTaxCategory({ name, code, description });
      return { ok: true as const, id: created.id, action: "categoryCreated" };
    } catch (err) {
      const apiErr = err as { status?: number; code?: string; message?: string };
      if (apiErr.status === 409) return fail(409, { code: apiErr.code ?? "CONFLICT", message: apiErr.message });
      return fail(502, { code: "API_ERROR", message: err instanceof Error ? err.message : String(err) });
    }
  },

  deleteCategory: async ({ request, fetch, locals }) => {
    const form = await request.formData();
    const id = String(form.get("id") ?? "").trim();
    if (!id) return fail(400, { code: "ID_REQUIRED" });
    const session = clientFromLocalsOrEnv(fetch, locals);
    if (!session) return fail(503, { code: "DEMO_MODE_NO_API" });
    try {
      await session.client.deleteTaxCategory(id);
      return { ok: true as const, id, action: "categoryDeleted" };
    } catch (err) {
      const apiErr = err as { status?: number; code?: string };
      if (apiErr.status === 404) return fail(404, { code: "NOT_FOUND" });
      return fail(502, { code: "API_ERROR", message: err instanceof Error ? err.message : String(err) });
    }
  },

  createRate: async ({ request, fetch, locals }) => {
    const form = await request.formData();
    const taxCategoryId = String(form.get("taxCategoryId") ?? "").trim();
    const jurisdiction = String(form.get("jurisdiction") ?? "").trim();
    const label = String(form.get("label") ?? "").trim();
    const ratePercent = parseFloat(String(form.get("ratePercent") ?? ""));
    const compound = form.get("compound") === "on";
    const effectiveFrom = String(form.get("effectiveFrom") ?? "").trim();
    if (!taxCategoryId) return fail(400, { code: "TAX_CATEGORY_REQUIRED" });
    if (!jurisdiction) return fail(400, { code: "JURISDICTION_REQUIRED" });
    if (!label) return fail(400, { code: "LABEL_REQUIRED" });
    if (isNaN(ratePercent) || ratePercent < 0) return fail(400, { code: "RATE_INVALID" });
    if (!effectiveFrom) return fail(400, { code: "EFFECTIVE_FROM_REQUIRED" });
    // Convert percent (e.g. 9.975) to milli-percent basis points (9975)
    const rateBps = Math.round(ratePercent * 1000);
    const session = clientFromLocalsOrEnv(fetch, locals);
    if (!session) return fail(503, { code: "DEMO_MODE_NO_API" });
    try {
      const created = await session.client.createTaxRateVersion({
        taxCategoryId,
        jurisdiction,
        label,
        rateBps,
        compound,
        effectiveFrom
      });
      return { ok: true as const, id: created.id, action: "rateCreated" };
    } catch (err) {
      return fail(502, { code: "API_ERROR", message: err instanceof Error ? err.message : String(err) });
    }
  },

  deleteRate: async ({ request, fetch, locals }) => {
    const form = await request.formData();
    const id = String(form.get("id") ?? "").trim();
    if (!id) return fail(400, { code: "ID_REQUIRED" });
    const session = clientFromLocalsOrEnv(fetch, locals);
    if (!session) return fail(503, { code: "DEMO_MODE_NO_API" });
    try {
      await session.client.deleteTaxRateVersion(id);
      return { ok: true as const, id, action: "rateDeleted" };
    } catch (err) {
      const apiErr = err as { status?: number; code?: string };
      if (apiErr.status === 404) return fail(404, { code: "NOT_FOUND" });
      return fail(502, { code: "API_ERROR", message: err instanceof Error ? err.message : String(err) });
    }
  }
};
