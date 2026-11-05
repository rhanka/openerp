import type { OpenERPCookiePort } from "./openerp-cookie-port.js";
import {
  OpenERPTenantSessionError,
  type OpenERPTenantSessionService,
} from "./openerp-tenant-session.js";

export interface OpenERPTenantSessionHandlers {
  listTenantSelection(request: Request): Promise<Response>;
  logout(request: Request): Promise<Response>;
  refresh(request: Request): Promise<Response>;
  sessionInfo(request: Request): Promise<Response>;
  selectTenant(request: Request): Promise<Response>;
}

/**
 * Host handlers prepared for the later dark auth router. They are deliberately
 * not mounted in Lot 2. Keeping request parsing here makes the platform's
 * body-less auth-ui refresh contract explicit and independently testable.
 */
export function createOpenERPTenantSessionHandlers(options: {
  cookies: OpenERPCookiePort;
  service: OpenERPTenantSessionService;
}): OpenERPTenantSessionHandlers {
  return {
    async listTenantSelection(request) {
      const pendingToken = options.cookies.readPendingTenantToken(request);
      if (!pendingToken) {
        return error(410, "PENDING_TENANT_SELECTION_INVALID", "No pending tenant selection was provided.");
      }
      const pending = await options.service.getPendingTenantSelection(pendingToken);
      if (!pending) {
        return error(410, "PENDING_TENANT_SELECTION_INVALID", "The pending organization selection is invalid or has expired.");
      }
      return json({
        expiresAt: pending.expiresAt.toISOString(),
        memberships: pending.memberships.map((membership) => ({
          organizationId: membership.organizationId,
          preferredLocale: membership.preferredLocale,
        })),
        user: {
          id: pending.user.id,
          email: pending.user.email,
          displayName: pending.user.displayName,
          role: pending.user.role,
        },
      });
    },

    async sessionInfo(request) {
      const sessionToken = readSessionToken(request, options.cookies);
      if (!sessionToken) return error(401, "SESSION_INVALID", "No session token was provided.");
      const session = await options.service.validate(sessionToken);
      if (!session) return error(401, "SESSION_INVALID", "The session is invalid or expired.");
      return json({
        expiresAt: session.sessionRecord.expiresAt.toISOString(),
        organizationId: session.organizationId,
        user: {
          id: session.user.id,
          email: session.user.email,
          displayName: session.user.displayName,
          role: session.user.role,
        },
      });
    },

    async refresh(request) {
      const refreshToken = options.cookies.readRefreshToken(request);
      if (!refreshToken) return error(401, "SESSION_INVALID", "No refresh token was provided.");
      const refreshed = await options.service.refresh(refreshToken);
      if (!refreshed) return error(401, "SESSION_INVALID", "The refresh token is invalid or expired.");
      return json(refreshed.response, 200, refreshed.cookieHeaders);
    },

    async logout(request) {
      const sessionToken = readSessionToken(request, options.cookies);
      if (!sessionToken) return error(401, "SESSION_INVALID", "No session token was provided.");
      const loggedOut = await options.service.logout(sessionToken);
      if (!loggedOut) return error(401, "SESSION_INVALID", "The session is invalid or expired.");
      return json({ success: true }, 200, loggedOut.cookieHeaders);
    },

    async selectTenant(request) {
      const pendingToken = options.cookies.readPendingTenantToken(request);
      if (!pendingToken) {
        return error(410, "PENDING_TENANT_SELECTION_INVALID", "No pending tenant selection was provided.");
      }
      const body = await request.json().catch(() => null);
      const organizationId = isOrganizationSelection(body) ? body.organizationId : null;
      if (!organizationId) return error(400, "INVALID_INPUT", "organizationId is required.");
      try {
        const selected = await options.service.selectTenant({ pendingToken, organizationId });
        return json(
          selected.response,
          200,
          [...selected.cookieHeaders, options.cookies.serializeClearedPendingTenantCookie()]
        );
      } catch (err) {
        return tenantSessionError(err);
      }
    },
  };
}

function isOrganizationSelection(value: unknown): value is { organizationId: string } {
  return Boolean(
    value &&
      typeof value === "object" &&
      "organizationId" in value &&
      typeof (value as { organizationId?: unknown }).organizationId === "string"
  );
}

function readSessionToken(request: Request, cookies: OpenERPCookiePort): string | null {
  const cookieToken = cookies.readSessionToken(request);
  if (cookieToken) return cookieToken;
  const authorization = request.headers.get("authorization");
  const match = /^Bearer\s+(\S+)$/i.exec(authorization ?? "");
  return match?.[1] ?? null;
}

function tenantSessionError(errorValue: unknown): Response {
  if (errorValue instanceof OpenERPTenantSessionError) {
    return error(errorValue.status, errorValue.code, errorValue.message);
  }
  throw errorValue;
}

function error(status: 400 | 401 | 403 | 410, code: string, message: string): Response {
  return json({ error: { code, message } }, status);
}

function json(body: unknown, status = 200, cookies: readonly string[] = []): Response {
  const headers = new Headers({ "content-type": "application/json" });
  for (const cookie of cookies) headers.append("set-cookie", cookie);
  return new Response(JSON.stringify(body), { status, headers });
}
