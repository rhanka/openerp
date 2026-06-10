import type { AuthHonoCookiePort } from "@sentropic/auth-hono";

// AuthHonoCookiePort adapter — manages `openerp_session` and `openerp_refresh` cookies.
// HttpOnly, SameSite=Lax, Secure in production.

const SESSION_COOKIE = "openerp_session";
const REFRESH_COOKIE = "openerp_refresh";
const IS_PRODUCTION = process.env.NODE_ENV === "production";

function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get("cookie");
  if (!header) return null;
  const match = header.match(new RegExp(`(?:^|; )${name}=([^;]+)`));
  return match ? (match[1] ?? null) : null;
}

function maxAgeFrom(expiresAt: Date): number {
  return Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
}

function serialize(name: string, value: string, maxAgeSeconds: number): string {
  return [
    `${name}=${value}`,
    "HttpOnly",
    IS_PRODUCTION ? "Secure" : "",
    "SameSite=Lax",
    "Path=/",
    `Max-Age=${maxAgeSeconds}`,
  ]
    .filter(Boolean)
    .join("; ");
}

export function createOpenERPCookiePort(): AuthHonoCookiePort {
  return {
    readSessionToken(request: Request): string | null {
      return readCookie(request, SESSION_COOKIE);
    },

    readRefreshToken(request: Request): string | null {
      return readCookie(request, REFRESH_COOKIE);
    },

    serializeSessionCookie({ token, expiresAt }: { token: string; expiresAt: Date }): string {
      return serialize(SESSION_COOKIE, token, maxAgeFrom(expiresAt));
    },

    serializeRefreshCookie({ token, expiresAt }: { token: string; expiresAt: Date }): string {
      return serialize(REFRESH_COOKIE, token, maxAgeFrom(expiresAt));
    },

    serializeClearedSessionCookie(): string {
      return serialize(SESSION_COOKIE, "", 0);
    },

    serializeClearedRefreshCookie(): string {
      return serialize(REFRESH_COOKIE, "", 0);
    },
  };
}
