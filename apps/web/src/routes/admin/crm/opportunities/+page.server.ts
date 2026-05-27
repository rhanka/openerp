import { env } from "$env/dynamic/private";
import { fail, type Actions } from "@sveltejs/kit";

import type { Company, Opportunity, PipelineStage } from "@sentropic/openerp-domain/crm";

import { createApiClient } from "$lib/api/client";

import type { PageServerLoad } from "./$types";

const DEMO_COMPANIES: Company[] = [
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

const DEMO_STAGES: PipelineStage[] = [
  {
    id: "demo-ps-1",
    organizationId: "demo-org",
    name: "Discovery",
    orderIndex: 0,
    isInitial: true,
    isWon: false,
    isLost: false,
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "demo-ps-2",
    organizationId: "demo-org",
    name: "Proposal",
    orderIndex: 1,
    isInitial: false,
    isWon: false,
    isLost: false,
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "demo-ps-3",
    organizationId: "demo-org",
    name: "Closed Won",
    orderIndex: 2,
    isInitial: false,
    isWon: true,
    isLost: false,
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

const DEMO_OPPORTUNITIES: Opportunity[] = [
  {
    id: "demo-op-1",
    organizationId: "demo-org",
    companyId: "demo-co-1",
    primaryContactId: null,
    name: "Annual licence renewal",
    stageId: "demo-ps-2",
    status: "open",
    ownerUserId: null,
    teamId: null,
    expectedValue: { amountMinor: 12_000_00, currency: "CAD", scale: 2 },
    currency: "CAD",
    expectedCloseDate: null,
    probabilityBand: "medium",
    serviceSummary: null,
    lossReason: null,
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
      opportunities: DEMO_OPPORTUNITIES,
      stages: DEMO_STAGES,
      companies: DEMO_COMPANIES,
      source: "demo" as const,
      locale: locals.locale
    };
  }
  try {
    const [opportunities, stages, companies] = await Promise.all([
      session.client.listOpportunities(),
      session.client.listPipelineStages({ activeOnly: true }),
      session.client.listCompanies({ status: "active" })
    ]);
    return { opportunities, stages, companies, source: "api" as const, locale: locals.locale };
  } catch (err) {
    return {
      opportunities: [] as Opportunity[],
      stages: [] as PipelineStage[],
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
    const name = String(form.get("name") ?? "").trim();
    const companyId = String(form.get("companyId") ?? "").trim();
    const stageId = String(form.get("stageId") ?? "").trim();
    const expectedAmount = String(form.get("expectedAmount") ?? "").trim();
    if (!name) return fail(400, { code: "NAME_REQUIRED" });
    if (!companyId) return fail(400, { code: "COMPANY_REQUIRED" });
    if (!stageId) return fail(400, { code: "STAGE_REQUIRED" });

    const session = clientFromLocalsOrEnv(fetch, locals);
    if (!session) return fail(503, { code: "DEMO_MODE_NO_API" });

    const expectedAmountMinor = expectedAmount ? Math.round(Number(expectedAmount) * 100) : null;
    const expectedValue =
      expectedAmountMinor !== null && Number.isFinite(expectedAmountMinor)
        ? { amountMinor: expectedAmountMinor, currency: "CAD", scale: 2 }
        : null;

    try {
      const created = await session.client.createOpportunity({
        companyId,
        name,
        stageId,
        expectedValue,
        currency: "CAD"
      });
      return { ok: true as const, id: created.id, name: created.name };
    } catch (err) {
      return fail(502, { code: "API_ERROR", message: err instanceof Error ? err.message : String(err) });
    }
  },

  advance: async ({ request, fetch, locals }) => {
    const form = await request.formData();
    const id = String(form.get("id") ?? "");
    const stageId = String(form.get("stageId") ?? "");
    if (!id || !stageId) return fail(400, { code: "ID_AND_STAGE_REQUIRED" });
    const session = clientFromLocalsOrEnv(fetch, locals);
    if (!session) return fail(503, { code: "DEMO_MODE_NO_API" });
    try {
      const updated = await session.client.updateOpportunity(id, { stageId });
      return { ok: true as const, id: updated.id, stageId: updated.stageId };
    } catch (err) {
      return fail(502, { code: "API_ERROR", message: err instanceof Error ? err.message : String(err) });
    }
  },

  win: async ({ request, fetch, locals }) => {
    const form = await request.formData();
    const id = String(form.get("id") ?? "");
    if (!id) return fail(400, { code: "ID_REQUIRED" });
    const session = clientFromLocalsOrEnv(fetch, locals);
    if (!session) return fail(503, { code: "DEMO_MODE_NO_API" });
    try {
      const updated = await session.client.updateOpportunity(id, { status: "won" });
      return { ok: true as const, id: updated.id, status: updated.status };
    } catch (err) {
      return fail(502, { code: "API_ERROR", message: err instanceof Error ? err.message : String(err) });
    }
  },

  lose: async ({ request, fetch, locals }) => {
    const form = await request.formData();
    const id = String(form.get("id") ?? "");
    const lossReason = String(form.get("lossReason") ?? "").trim();
    if (!id) return fail(400, { code: "ID_REQUIRED" });
    if (!lossReason) return fail(400, { code: "LOSS_REASON_REQUIRED", id });
    const session = clientFromLocalsOrEnv(fetch, locals);
    if (!session) return fail(503, { code: "DEMO_MODE_NO_API" });
    try {
      const updated = await session.client.updateOpportunity(id, {
        status: "lost",
        lossReason
      });
      return { ok: true as const, id: updated.id, status: updated.status };
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
      await session.client.deleteOpportunity(id);
      return { ok: true as const, id, deleted: true };
    } catch (err) {
      return fail(502, { code: "API_ERROR", message: err instanceof Error ? err.message : String(err) });
    }
  }
};
