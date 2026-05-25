import { env } from "$env/dynamic/private";

import type { Company } from "@sentropic/openerp-domain/crm";
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

const DEMO_FALLBACK: { company: Company; timeline: TimelineEntry[] } = {
  company: {
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
  },
  timeline: [
    {
      id: "te-co-1",
      organizationId: "demo-org",
      resourceType: "company",
      resourceId: "demo-co-1",
      actorUserIdentityId: null,
      entryType: "crm.company.created",
      payloadSummary: { displayName: "Acme Northwind" },
      occurredAt: new Date(Date.now() - 86_400_000 * 3).toISOString()
    },
    {
      id: "te-co-2",
      organizationId: "demo-org",
      resourceType: "company",
      resourceId: "demo-co-1",
      actorUserIdentityId: null,
      entryType: "crm.company.updated",
      payloadSummary: { website: "https://example.com" },
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
    const [company, timeline] = await Promise.all([
      session.client.getCompany(params.id),
      session.client.listCrmTimeline({
        resourceType: "company",
        resourceId: params.id,
        limit: 50
      })
    ]);
    return {
      company,
      timeline,
      source: "api" as const,
      locale: locals.locale
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const notFound =
      err && typeof err === "object" && "status" in err && (err as { status?: number }).status === 404;
    return {
      company: null as Company | null,
      timeline: [] as TimelineEntry[],
      source: notFound ? ("not_found" as const) : ("error" as const),
      locale: locals.locale,
      message
    };
  }
};
