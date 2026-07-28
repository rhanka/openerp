import { goto } from "$app/navigation";
import {
  createDefaultAuthUiLabels,
  createFrenchAuthUiLabels,
  type AuthUiLabels,
  type AuthUiSession,
} from "@sentropic/auth-ui";
import { createDefaultFetchTransport } from "@sentropic/auth-ui/transport-fetch";

import { t, type LocaleCode } from "$lib/i18n";

export const PLATFORM_AUTH_BASE_URL = "/api/v1/auth";

interface TenantSelectionSession extends AuthUiSession {
  requiresTenantSelection?: boolean;
}

/**
 * The platform transport is deliberately browser-relative. Production ingress
 * can own this path; the generic SvelteKit pass-through is its portable
 * fallback for environments where ingress cannot yet provide it.
 */
export function createOpenERPAuthTransport(
  locale: LocaleCode,
  options: { onUnauthorized?: () => void | Promise<void> } = {},
) {
  return createDefaultFetchTransport({
    baseUrl: PLATFORM_AUTH_BASE_URL,
    fetch: (input, init) => fetchPlatformAuth(input, init, locale),
    headers: { "x-app-locale": locale },
    onUnauthorized: options.onUnauthorized ?? (() => {
      if (typeof window !== "undefined") void goto("/login");
    }),
    withCredentials: true,
  });
}

export function resolveAuthUiLabels(locale: LocaleCode): AuthUiLabels {
  return locale === "fr" ? createFrenchAuthUiLabels() : createDefaultAuthUiLabels();
}

export function requiresTenantSelection(session: AuthUiSession): boolean {
  return (session as TenantSelectionSession).requiresTenantSelection === true;
}

/** Only accept an application-relative return target; never reflect an origin. */
export function safeRelativeReturnUrl(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return "/";
  }
  return value;
}

async function fetchPlatformAuth(input: string, init: RequestInit | undefined, locale: LocaleCode): Promise<Response> {
  const response = await fetch(input, init);
  if (response.ok) return response;

  const code = await readNestedPlatformErrorCode(response);
  const message = t(locale, platformErrorMessageKey(code));

  // auth-ui@0.7.1 reads a top-level `message`; auth-hono returns
  // `{ error: { message } }`. This is the one shared adaptation seam.
  const headers = new Headers(response.headers);
  headers.set("content-type", "application/json");
  headers.delete("content-length");
  return new Response(JSON.stringify({ message }), {
    headers,
    status: response.status,
    statusText: response.statusText,
  });
}

async function readNestedPlatformErrorCode(response: Response): Promise<string | null> {
  try {
    const payload: unknown = await response.clone().json();
    if (!payload || typeof payload !== "object") return null;
    const nested = (payload as { error?: unknown }).error;
    if (!nested || typeof nested !== "object") return null;
    const code = (nested as { code?: unknown }).code;
    return typeof code === "string" && code ? code : null;
  } catch {
    return null;
  }
}

function platformErrorMessageKey(code: string | null): string {
  const keys: Record<string, string> = {
    AUTHENTICATION_FORBIDDEN: "auth.platformError.authenticationForbidden",
    NO_ACTIVE_MEMBERSHIPS: "auth.platformError.noActiveMemberships",
    ORGANIZATION_NOT_MEMBER: "auth.platformError.organizationNotMember",
    PENDING_TENANT_SELECTION_INVALID: "auth.platformError.pendingTenantSelectionInvalid",
    SESSION_INVALID: "auth.platformError.sessionInvalid",
    email_verification_invalid: "auth.platformError.emailVerificationInvalid",
    email_verification_required: "auth.platformError.emailVerificationRequired",
    registration_membership_required: "auth.platformError.registrationMembershipRequired",
    registration_not_preprovisioned: "auth.platformError.registrationNotPreprovisioned",
  };
  return code ? (keys[code] ?? "auth.platformError.generic") : "auth.platformError.generic";
}
