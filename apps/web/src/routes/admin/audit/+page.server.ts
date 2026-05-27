import { env } from "$env/dynamic/private";

import { createApiClient } from "$lib/api/client";

import type { PageServerLoad } from "./$types";

// SSR loader for the admin audit page. Hits the API via createApiClient with
// dev-mode tenant headers sourced from env (OPENERP_API_URL, OPENERP_DEV_*).
// When passkey-backed session cookies ship, the headers will be replaced by
// a JWT lifted from the request cookie.

export const load: PageServerLoad = async ({ fetch, locals }) => {
  const baseUrl = env.OPENERP_API_URL ?? "http://127.0.0.1:4000";
  // Session cookie wins (real login); OPENERP_DEV_* env stays as the
  // pre-login dev convenience.
  const organizationId = locals.session?.organizationId ?? env.OPENERP_DEV_ORG_ID ?? "";
  const actorUserId = locals.session?.userIdentityId ?? env.OPENERP_DEV_USER_ID ?? "";

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
};
