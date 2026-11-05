import type { AuthHonoCookiePort } from "@sentropic/auth-hono";

// AuthHonoCookiePort adapter — manages `openerp_session` and `openerp_refresh` cookies.
// HttpOnly, SameSite=Lax, Secure in production.

const SESSION_COOKIE = "openerp_session";
const REFRESH_COOKIE = "openerp_refresh";
const PENDING_TENANT_COOKIE = "openerp_auth_pending";

export interface OpenERPCookiePortOptions {
  isProduction?: boolean;
  now?: () => Date;
}

export interface OpenERPCookiePort extends AuthHonoCookiePort {
  readPendingTenantToken(request: Request): string | null;
  serializePendingTenantCookie(input: { token: string; expiresAt: Date }): string;
  serializeClearedPendingTenantCookie(): string;
}

function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get("cookie");
  if (!header) return null;
  const match = header.match(new RegExp(`(?:^|; )${name}=([^;]+)`));
  return match ? (match[1] ?? null) : null;
}

function maxAgeFrom(expiresAt: Date, now: () => Date): number {
  return Math.max(0, Math.floor((expiresAt.getTime() - now().getTime()) / 1000));
}

function serialize(name: string, value: string, maxAgeSeconds: number, isProduction: boolean): string {
  return [
    `${name}=${value}`,
    "HttpOnly",
    isProduction ? "Secure" : "",
    "SameSite=Lax",
    "Path=/",
    `Max-Age=${maxAgeSeconds}`,
  ]
    .filter(Boolean)
    .join("; ");
}

export function createOpenERPCookiePort(options: OpenERPCookiePortOptions = {}): OpenERPCookiePort {
  const isProduction = options.isProduction ?? process.env.NODE_ENV === "production";
  const now = options.now ?? (() => new Date());
  const serializeWithEnvironment = (name: string, value: string, maxAgeSeconds: number) =>
    serialize(name, value, maxAgeSeconds, isProduction);

  return {
    readSessionToken(request: Request): string | null {
      return readCookie(request, SESSION_COOKIE);
    },

    readRefreshToken(request: Request): string | null {
      return readCookie(request, REFRESH_COOKIE);
    },

    readPendingTenantToken(request: Request): string | null {
      return readCookie(request, PENDING_TENANT_COOKIE);
    },

    serializeSessionCookie({ token, expiresAt }: { token: string; expiresAt: Date }): string {
      return serializeWithEnvironment(SESSION_COOKIE, token, maxAgeFrom(expiresAt, now));
    },

    serializeRefreshCookie({ token, expiresAt }: { token: string; expiresAt: Date }): string {
      return serializeWithEnvironment(REFRESH_COOKIE, token, maxAgeFrom(expiresAt, now));
    },

    serializePendingTenantCookie({ token, expiresAt }: { token: string; expiresAt: Date }): string {
      return serializeWithEnvironment(PENDING_TENANT_COOKIE, token, maxAgeFrom(expiresAt, now));
    },

    serializeClearedSessionCookie(): string {
      return serializeWithEnvironment(SESSION_COOKIE, "", 0);
    },

    serializeClearedRefreshCookie(): string {
      return serializeWithEnvironment(REFRESH_COOKIE, "", 0);
    },

    serializeClearedPendingTenantCookie(): string {
      return serializeWithEnvironment(PENDING_TENANT_COOKIE, "", 0);
    },
  };
}
