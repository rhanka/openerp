import type { Handle } from "@sveltejs/kit";

import { isLocaleCode, type LocaleCode } from "$lib/i18n";

const LOCALE_COOKIE = "openerp_locale";
const SESSION_COOKIE = "openerp_session";
const DEFAULT_LOCALE: LocaleCode = "fr";

// hooks.server.ts: resolves the active locale + session from cookies. The
// locale falls back to Accept-Language then the FR default. The session
// cookie carries the JWT raw token + the user/org IDs that the API needs
// to satisfy its tenant resolver — when present, SSR loaders use that
// pair instead of OPENERP_DEV_* env (which stays as a dev convenience).

export const handle: Handle = async ({ event, resolve }) => {
  event.locals.locale = pickLocale(event.request, event.cookies.get(LOCALE_COOKIE));
  event.locals.session = pickSession(event.cookies.get(SESSION_COOKIE));
  return resolve(event, {
    transformPageChunk: ({ html }) => html.replace('lang="en"', `lang="${event.locals.locale}"`)
  });
};

function pickSession(raw: string | undefined): App.Locals["session"] {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { token?: string; userIdentityId?: string; organizationId?: string };
    if (!parsed.userIdentityId || !parsed.organizationId) return null;
    return {
      token: parsed.token ?? "",
      userIdentityId: parsed.userIdentityId,
      organizationId: parsed.organizationId
    };
  } catch {
    return null;
  }
}

function pickLocale(request: Request, cookieValue: string | undefined): LocaleCode {
  if (cookieValue && isLocaleCode(cookieValue)) return cookieValue;
  const header = request.headers.get("accept-language") ?? "";
  const firstTag = header.split(",")[0]?.trim().slice(0, 2).toLowerCase() ?? "";
  if (isLocaleCode(firstTag)) return firstTag;
  return DEFAULT_LOCALE;
}
