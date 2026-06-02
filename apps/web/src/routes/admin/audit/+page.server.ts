import { env } from "$env/dynamic/private";

import { createApiClient } from "$lib/api/client";

import type { PageServerLoad } from "./$types";

// SSR loader for the admin audit page. Forwards the session JWT as Bearer when
// present (PG-09 / integration 0-A). Falls back to OPENERP_DEV_* plain headers
// for local dev without a logged-in session.

export const load: PageServerLoad = async ({ fetch, locals }) => {
  const baseUrl = env.OPENERP_API_URL ?? "http://127.0.0.1:4000";
  const token = locals.session?.token;

  if (!token) {
    const organizationId = env.OPENERP_DEV_ORG_ID ?? "";
    const actorUserId = env.OPENERP_DEV_USER_ID ?? "";
    if (!organizationId || !actorUserId) {
      return { events: null as null, source: "demo" as const, locale: locals.locale };
    }
    const client = createApiClient({
      baseUrl,
      organizationId,
      actorUserId,
      fetch: fetch as typeof globalThis.fetch
    });
    try {
      const events = await client.listAuditEvents({ limit: 50 });
      return { events, source: "api" as const, locale: locals.locale };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { events: null as null, source: "error" as const, message, locale: locals.locale };
    }
  }

  const client = createApiClient({
    baseUrl,
    token,
    fetch: fetch as typeof globalThis.fetch
  });

  try {
    const events = await client.listAuditEvents({ limit: 50 });
    return { events, source: "api" as const, locale: locals.locale };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { events: null as null, source: "error" as const, message, locale: locals.locale };
  }
};
