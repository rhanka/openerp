import type { Handle } from "@sveltejs/kit";
import { env } from "$env/dynamic/private";

import { isLocaleCode, type LocaleCode } from "$lib/i18n";

const LOCALE_COOKIE = "openerp_locale";
const SESSION_COOKIE = "openerp_session";
const DEFAULT_LOCALE: LocaleCode = "fr";

const PLATFORM_AUTH_BASE_URL = "/api/v1/auth";
const API_BASE_URL = "http://127.0.0.1:4000";

// During the rollback window the cookie may still hold the legacy JSON wrapper.
// A platform session is instead the raw JWT and must be validated by the API
// before it can populate locals or become an SSR Authorization bearer.

export const handle: Handle = async ({ event, resolve }) => {
  event.locals.locale = pickLocale(event.request, event.cookies.get(LOCALE_COOKIE));
  event.locals.session = await pickSession({
    locale: event.locals.locale,
    raw: event.cookies.get(SESSION_COOKIE),
  });
  return resolve(event, {
    transformPageChunk: ({ html }) => html.replace('lang="en"', `lang="${event.locals.locale}"`)
  });
};

async function pickSession(input: {
  locale: LocaleCode;
  raw: string | undefined;
}): Promise<App.Locals["session"]> {
  const raw = input.raw;
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
    return resolveRawPlatformSession(raw, input.locale);
  }
}

async function resolveRawPlatformSession(rawToken: string, locale: LocaleCode): Promise<App.Locals["session"]> {
  try {
    const apiBase = new URL(env.OPENERP_API_URL ?? API_BASE_URL);
    apiBase.pathname = PLATFORM_AUTH_BASE_URL;
    apiBase.search = "";
    const response = await fetch(new URL("session", `${apiBase.toString()}/`), {
      headers: {
        cookie: `${SESSION_COOKIE}=${encodeURIComponent(rawToken)}`,
        "x-app-locale": locale,
      },
    });
    if (!response.ok) return null;
    const body: unknown = await response.json();
    return isSessionInfo(body)
      ? {
          token: rawToken,
          userIdentityId: body.user.id,
          organizationId: body.organizationId,
          user: body.user,
        }
      : null;
  } catch {
    // A malformed/obsolete cookie or a temporarily unavailable dark surface
    // must leave the application signed out, never make SSR fail.
    return null;
  }
}

function isSessionInfo(value: unknown): value is {
  organizationId: string;
  user: { displayName: string | null; email: string | null; id: string; role: string };
} {
  if (!value || typeof value !== "object") return false;
  const record = value as { organizationId?: unknown; user?: unknown };
  if (typeof record.organizationId !== "string" || !record.user || typeof record.user !== "object") return false;
  const user = record.user as Record<string, unknown>;
  return (
    typeof user.id === "string" &&
    typeof user.role === "string" &&
    (typeof user.email === "string" || user.email === null) &&
    (typeof user.displayName === "string" || user.displayName === null)
  );
}

function pickLocale(request: Request, cookieValue: string | undefined): LocaleCode {
  if (cookieValue && isLocaleCode(cookieValue)) return cookieValue;
  const header = request.headers.get("accept-language") ?? "";
  const firstTag = header.split(",")[0]?.trim().slice(0, 2).toLowerCase() ?? "";
  if (isLocaleCode(firstTag)) return firstTag;
  return DEFAULT_LOCALE;
}
