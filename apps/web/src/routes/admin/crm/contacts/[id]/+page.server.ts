import { env } from "$env/dynamic/private";

import type { Contact } from "@sentropic/openerp-domain/crm";
import type { TimelineEntry } from "@sentropic/openerp-domain";

import { createApiClient } from "$lib/api/client";

import type { PageServerLoad } from "./$types";

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

const DEMO_FALLBACK: { contact: Contact; timeline: TimelineEntry[] } = {
  contact: {
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
  },
  timeline: [
    {
      id: "te-ct-1",
      organizationId: "demo-org",
      resourceType: "contact",
      resourceId: "demo-ct-1",
      actorUserIdentityId: null,
      entryType: "crm.contact.created",
      payloadSummary: { displayName: "Alice Tremblay" },
      occurredAt: new Date(Date.now() - 86_400_000 * 2).toISOString()
    },
    {
      id: "te-ct-2",
      organizationId: "demo-org",
      resourceType: "contact",
      resourceId: "demo-ct-1",
      actorUserIdentityId: null,
      entryType: "crm.contact.updated",
      payloadSummary: { email: "alice@example.com" },
      occurredAt: new Date(Date.now() - 7_200_000).toISOString()
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
    const [contact, timeline] = await Promise.all([
      session.client.getContact(params.id),
      session.client.listCrmTimeline({
        resourceType: "contact",
        resourceId: params.id,
        limit: 50
      })
    ]);
    return {
      contact,
      timeline,
      source: "api" as const,
      locale: locals.locale
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const notFound =
      err && typeof err === "object" && "status" in err && (err as { status?: number }).status === 404;
    return {
      contact: null as Contact | null,
      timeline: [] as TimelineEntry[],
      source: notFound ? ("not_found" as const) : ("error" as const),
      locale: locals.locale,
      message
    };
  }
};
