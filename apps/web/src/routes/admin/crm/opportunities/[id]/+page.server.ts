import { env } from "$env/dynamic/private";

import type { Opportunity, PipelineStage } from "@sentropic/openerp-domain/crm";
import type { TimelineEntry } from "@sentropic/openerp-domain";

import { createApiClient } from "$lib/api/client";

import type { PageServerLoad } from "./$types";

// Demo Slice 2.2 — opportunity detail page. Pairs the live record with its
// TimelineEntry projection so the human-readable activity stream is visible
// alongside the static metadata. Stage labels come from listPipelineStages so
// the timeline reads "Proposal" rather than the raw stage UUID.

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

const DEMO_FALLBACK: { opportunity: Opportunity; stages: PipelineStage[]; timeline: TimelineEntry[] } = {
  opportunity: {
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
  },
  stages: [
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
    }
  ],
  timeline: [
    {
      id: "te-1",
      organizationId: "demo-org",
      resourceType: "opportunity",
      resourceId: "demo-op-1",
      actorUserIdentityId: null,
      entryType: "crm.opportunity.created",
      payloadSummary: {
        name: "Annual licence renewal",
        stageId: "demo-ps-1",
        status: "open"
      },
      occurredAt: new Date(Date.now() - 86_400_000 * 2).toISOString()
    },
    {
      id: "te-2",
      organizationId: "demo-org",
      resourceType: "opportunity",
      resourceId: "demo-op-1",
      actorUserIdentityId: null,
      entryType: "crm.opportunity.stage_changed",
      payloadSummary: { stageId: "demo-ps-2" },
      occurredAt: new Date(Date.now() - 3_600_000).toISOString()
    }
  ]
};

export const load: PageServerLoad = async ({ fetch, locals, params }) => {
  const session = clientFromLocalsOrEnv(fetch, locals);
  if (!session) {
    return {
      ...DEMO_FALLBACK,
      source: "demo" as const,
      locale: locals.locale
    };
  }
  try {
    const [opportunity, stages, timeline] = await Promise.all([
      session.client.getOpportunity(params.id),
      session.client.listPipelineStages({ activeOnly: true }),
      session.client.listCrmTimeline({
        resourceType: "opportunity",
        resourceId: params.id,
        limit: 50
      })
    ]);
    return {
      opportunity,
      stages,
      timeline,
      source: "api" as const,
      locale: locals.locale
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const notFound =
      err && typeof err === "object" && "status" in err && (err as { status?: number }).status === 404;
    return {
      opportunity: null as Opportunity | null,
      stages: [] as PipelineStage[],
      timeline: [] as TimelineEntry[],
      source: notFound ? ("not_found" as const) : ("error" as const),
      locale: locals.locale,
      message
    };
  }
};
