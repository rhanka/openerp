import { env } from "$env/dynamic/private";

import type { Project } from "@sentropic/openerp-domain/project";
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

const DEMO_FALLBACK: { project: Project; timeline: TimelineEntry[] } = {
  project: {
    id: "demo-pr-1",
    organizationId: "demo-org",
    name: "Northwind Implementation",
    description: "Core ERP delivery for Northwind Services.",
    status: "active",
    code: "NW-2026",
    companyId: null,
    ownerUserId: null,
    startDate: "2026-01-01",
    endDate: "2026-12-31",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  timeline: [
    {
      id: "te-pr-1",
      organizationId: "demo-org",
      resourceType: "project",
      resourceId: "demo-pr-1",
      actorUserIdentityId: null,
      entryType: "project.project.created",
      payloadSummary: { name: "Northwind Implementation" },
      occurredAt: new Date(Date.now() - 86_400_000 * 3).toISOString()
    },
    {
      id: "te-pr-2",
      organizationId: "demo-org",
      resourceType: "project",
      resourceId: "demo-pr-1",
      actorUserIdentityId: null,
      entryType: "project.project.updated",
      payloadSummary: { status: "active" },
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
    const [project, timeline] = await Promise.all([
      session.client.getProject(params.id),
      session.client.listProjectTimeline({
        resourceId: params.id,
        limit: 50
      })
    ]);
    return {
      project,
      timeline,
      source: "api" as const,
      locale: locals.locale
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const notFound =
      err && typeof err === "object" && "status" in err && (err as { status?: number }).status === 404;
    return {
      project: null as Project | null,
      timeline: [] as TimelineEntry[],
      source: notFound ? ("not_found" as const) : ("error" as const),
      locale: locals.locale,
      message
    };
  }
};
