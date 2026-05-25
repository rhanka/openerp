import { Hono } from "hono";

import type { IdentityProvider } from "@sentropic/openerp-domain";

import type { Queryable, TenantContext } from "../db/client";
import type { PasskeyService } from "../foundation/passkey-service";
import { mountApprovalRequestRoutes } from "./handlers/approval-requests";
import { mountAuditEventsRoutes } from "./handlers/audit-events";
import { mountCrmCompanyRoutes } from "./handlers/crm-companies";
import { mountCrmContactRoutes } from "./handlers/crm-contacts";
import { mountCrmLeadRoutes } from "./handlers/crm-leads";
import { mountCrmOpportunityRoutes } from "./handlers/crm-opportunities";
import { mountCrmPipelineRoutes } from "./handlers/crm-pipeline";
import { mountCrmTimelineRoutes } from "./handlers/crm-timeline";
import { mountWebAuthnRoutes } from "./handlers/webauthn";

// Hono app builder. Aligned with @sentropic stack (hono + @hono/node-server).
// The HTTP server itself is started by apps/api/src/server.ts via the
// @hono/node-server adapter; this file owns the route surface only.

export interface AppBindings {
  Variables: {
    db: Queryable;
    tenant: TenantContext;
  };
}

export interface BuildAppOptions {
  /** Resolves a TenantContext from the inbound request. Auth wiring lives elsewhere; for MVP
   *  the resolver can read trusted internal headers (x-organization-id / x-user-identity-id)
   *  in tests, and be replaced with the JWT-backed implementation once Lot 1/PG-09 lands. */
  resolveTenant: (request: Request) => Promise<TenantContext | null> | TenantContext | null;
  db: Queryable;
  passkey?: {
    service: PasskeyService;
    identityProvider: IdentityProvider;
    sessionTtlSeconds?: number;
  };
}

const PUBLIC_PATH_PREFIXES = ["/webauthn/"] as const;

function isPublicPath(path: string): boolean {
  return PUBLIC_PATH_PREFIXES.some((p) => path.startsWith(p));
}

export class TenantResolutionError extends Error {
  readonly code = "TENANT_RESOLUTION_REQUIRED";
  constructor() {
    super("Could not resolve a tenant context for this request");
  }
}

export function buildApp(options: BuildAppOptions): Hono<AppBindings> {
  const app = new Hono<AppBindings>();

  app.use("*", async (c, next) => {
    if (isPublicPath(c.req.path)) {
      c.set("db", options.db);
      await next();
      return;
    }
    const tenant = await options.resolveTenant(c.req.raw);
    if (!tenant) {
      return c.json({ code: "TENANT_RESOLUTION_REQUIRED" }, 401);
    }
    c.set("db", options.db);
    c.set("tenant", tenant);
    await next();
  });

  app.get("/healthz", (c) => c.json({ status: "ok" }));

  if (options.passkey) {
    mountWebAuthnRoutes(app, {
      db: options.db,
      passkeyService: options.passkey.service,
      identityProvider: options.passkey.identityProvider,
      ...(options.passkey.sessionTtlSeconds !== undefined
        ? { sessionTtlSeconds: options.passkey.sessionTtlSeconds }
        : {})
    });
  }

  mountApprovalRequestRoutes(app);
  mountAuditEventsRoutes(app);
  mountCrmCompanyRoutes(app);
  mountCrmContactRoutes(app);
  mountCrmPipelineRoutes(app);
  mountCrmOpportunityRoutes(app);
  mountCrmLeadRoutes(app);
  mountCrmTimelineRoutes(app);

  return app;
}

/** Convenience tenant resolver for tests and internal dev: trusts `x-organization-id`
 *  and `x-user-identity-id` (or `x-user-id`) headers. Production must replace this
 *  with the JWT-backed resolver from PG-09. */
export function headerTenantResolver(request: Request): TenantContext | null {
  const organizationId = request.headers.get("x-organization-id");
  const actorUserId =
    request.headers.get("x-user-identity-id") ?? request.headers.get("x-user-id");
  if (!organizationId || !actorUserId) return null;
  return { organizationId, actorUserId };
}
