import type { Handle } from "@sveltejs/kit";

import { isLocaleCode, type LocaleCode } from "$lib/i18n";

const LOCALE_COOKIE = "openerp_locale";
const DEFAULT_LOCALE: LocaleCode = "fr";

// hooks.server.ts: resolves the active locale from the `openerp_locale`
// cookie (falls back to Accept-Language, then the FR default) and exposes
// it via `event.locals.locale`. The +layout.server.ts loader picks it up
// from there; the locale switcher writes the cookie via a form action.

export const handle: Handle = async ({ event, resolve }) => {
  event.locals.locale = pickLocale(event.request, event.cookies.get(LOCALE_COOKIE));
  return resolve(event, {
    transformPageChunk: ({ html }) => html.replace('lang="en"', `lang="${event.locals.locale}"`)
  });
};

function pickLocale(request: Request, cookieValue: string | undefined): LocaleCode {
  if (cookieValue && isLocaleCode(cookieValue)) return cookieValue;
  const header = request.headers.get("accept-language") ?? "";
  const firstTag = header.split(",")[0]?.trim().slice(0, 2).toLowerCase() ?? "";
  if (isLocaleCode(firstTag)) return firstTag;
  return DEFAULT_LOCALE;
}
