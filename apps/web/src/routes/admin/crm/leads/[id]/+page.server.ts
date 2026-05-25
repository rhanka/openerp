import { env } from "$env/dynamic/private";

import type { Lead } from "@sentropic/openerp-domain/crm";
import type { TimelineEntry } from "@sentropic/openerp-domain";

import { createApiClient } from "$lib/api/client";

import type { PageServerLoad } from "./$types";

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

const DEMO_FALLBACK: { lead: Lead; timeline: TimelineEntry[] } = {
  lead: {
    id: "demo-lead-1",
    organizationId: "demo-org",
    source: "web_form",
    displayName: "Acme — inbound demo request",
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
  },
  timeline: [
    {
      id: "te-lead-1",
      organizationId: "demo-org",
      resourceType: "lead",
      resourceId: "demo-lead-1",
      actorUserIdentityId: null,
      entryType: "crm.lead.created",
      payloadSummary: { displayName: "Acme — inbound demo request", source: "web_form" },
      occurredAt: new Date(Date.now() - 86_400_000).toISOString()
    },
    {
      id: "te-lead-2",
      organizationId: "demo-org",
      resourceType: "lead",
      resourceId: "demo-lead-1",
      actorUserIdentityId: null,
      entryType: "crm.lead.updated",
      payloadSummary: { status: "working" },
      occurredAt: new Date(Date.now() - 43_200_000).toISOString()
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
    const [lead, timeline] = await Promise.all([
      session.client.getLead(params.id),
      session.client.listCrmTimeline({
        resourceType: "lead",
        resourceId: params.id,
        limit: 50
      })
    ]);
    return {
      lead,
      timeline,
      source: "api" as const,
      locale: locals.locale
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const notFound =
      err && typeof err === "object" && "status" in err && (err as { status?: number }).status === 404;
    return {
      lead: null as Lead | null,
      timeline: [] as TimelineEntry[],
      source: notFound ? ("not_found" as const) : ("error" as const),
      locale: locals.locale,
      message
    };
  }
};
