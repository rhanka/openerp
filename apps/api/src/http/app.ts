import { Hono } from "hono";

import type { IdentityProvider } from "@sentropic/openerp-domain";

import type { Queryable, TenantContext } from "../db/client";
import type { PasskeyService } from "../foundation/passkey-service";
import type { ApiEnv } from "../config/env";
import type { EmailSender } from "../foundation/email-sender";
import {
  createOpenERPAuthRouter,
  type PlatformAuthWebAuthnVerifierOverrides,
} from "../auth/router";
import { mountApprovalRequestRoutes } from "./handlers/approval-requests";
import { mountAuditEventsRoutes } from "./handlers/audit-events";
import { mountCrmCompanyRoutes } from "./handlers/crm-companies";
import { mountCrmContactRoutes } from "./handlers/crm-contacts";
import { mountCrmLeadRoutes } from "./handlers/crm-leads";
import { mountCrmOpportunityRoutes } from "./handlers/crm-opportunities";
import { mountCrmQuoteHandoffRoutes } from "./handlers/crm-quote-handoffs";
import { mountCrmPipelineRoutes } from "./handlers/crm-pipeline";
import { mountCrmTimelineRoutes } from "./handlers/crm-timeline";
import { mountProjectRoutes } from "./handlers/project-projects";
import { mountProjectTaskRoutes } from "./handlers/project-tasks";
import { mountProjectTimelineRoutes } from "./handlers/project-timeline";
import { mountTimeEntryRoutes } from "./handlers/project-time-entries";
import { mountRateRoutes } from "./handlers/project-rates";
import { mountAssignmentRoutes } from "./handlers/project-assignments";
import { mountInvoiceProposalRoutes } from "./handlers/project-invoice-proposals";
import { mountBillingInvoiceRoutes } from "./handlers/billing-invoices";
import { mountBillingPaymentRoutes } from "./handlers/billing-payments";
import { mountBillingTaxRoutes } from "./handlers/billing-taxes";
import { mountBillingAccountingRoutes } from "./handlers/billing-accounting";
import { mountBillingRecurringScheduleRoutes } from "./handlers/billing-recurring-schedules";
import { mountBankingRoutes } from "./handlers/banking";
import { mountReportingSavedViewRoutes } from "./handlers/reporting-saved-views";
import { mountReportingReportDefinitionRoutes } from "./handlers/reporting-report-definitions";
import { mountReportingDashboardRoutes } from "./handlers/reporting-dashboards";
import { mountReportingScheduledDeliveryRoutes } from "./handlers/reporting-scheduled-deliveries";
import { mountWorkflowRoutes } from "./handlers/workflow-definitions";
import { mountWebhookRoutes } from "./handlers/webhook-endpoints";
import { mountWebhookAdminRoutes } from "./handlers/webhook-admin";
import { mountUsersRoutes } from "./handlers/users";
import { mountAgentTokenExchangeRoute } from "./handlers/auth-token-exchange";
import { setWorkflowEvaluator, setWebhookEvaluator } from "../foundation/audit-emit";
import { makeWorkflowEvaluator } from "../workflow/workflow-evaluator";
import { makeWebhookEvaluator } from "../webhook/webhook-evaluator";
import { buildOpenApiDocument } from "./openapi";

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
  /**
   * Identity provider for routes that must survive independently of the
   * legacy WebAuthn mount (notably the OFX agent-token exchange endpoint).
   */
  identityProvider?: IdentityProvider;
  /**
   * Default-off dark mount for the platform auth surface. Its dependencies are
   * intentionally absent unless the explicit environment flag enables it.
   */
  platformAuth?:
    | { enabled: false }
    | {
        enabled: true;
        emailSender?: EmailSender;
        env: ApiEnv;
        identityProvider: IdentityProvider;
        rp: { id: string; expectedOrigin: string };
        sessionTtlSeconds: number;
        webAuthn?: PlatformAuthWebAuthnVerifierOverrides;
      };
}

const PUBLIC_PATH_PREFIXES = [
  "/readyz",
  "/api/v1/auth/",
  "/openapi.json",
] as const;

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
  // Register the workflow evaluator so that audit events trigger matching workflows.
  // This is a no-op if called multiple times (safe for tests).
  setWorkflowEvaluator(makeWorkflowEvaluator());

  // Register the webhook evaluator so that audit events record matching deliveries.
  setWebhookEvaluator(makeWebhookEvaluator());

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
  app.get("/readyz", (c) => c.json({ status: "ok" }));

  // GET /openapi.json — public (no tenant required); returns the machine-readable
  // OpenAPI 3.1 description of the REST surface for Sentropic chat / agent tooling.
  // Contains only route metadata — no tenant data.
  app.get("/openapi.json", (c) => c.json(buildOpenApiDocument()));

  const agentTokenIdentityProvider =
    options.identityProvider ??
    options.passkey?.identityProvider ??
    (options.platformAuth?.enabled ? options.platformAuth.identityProvider : undefined);
  if (agentTokenIdentityProvider) {
    mountAgentTokenExchangeRoute(app, { identityProvider: agentTokenIdentityProvider });
  }

  if (options.platformAuth?.enabled) {
    const platformAuthRouter = createOpenERPAuthRouter({
      db: options.db,
      ...(options.platformAuth.emailSender ? { emailSender: options.platformAuth.emailSender } : {}),
      env: options.platformAuth.env,
      identityProvider: options.platformAuth.identityProvider,
      rp: options.platformAuth.rp,
      sessionTtlSeconds: options.platformAuth.sessionTtlSeconds,
      ...(options.platformAuth.webAuthn ? { webAuthn: options.platformAuth.webAuthn } : {}),
    });
    app.route("/api/v1/auth", platformAuthRouter);
  }

  mountUsersRoutes(app);
  mountApprovalRequestRoutes(app);
  mountAuditEventsRoutes(app);
  mountCrmCompanyRoutes(app);
  mountCrmContactRoutes(app);
  mountCrmPipelineRoutes(app);
  mountCrmOpportunityRoutes(app);
  mountCrmLeadRoutes(app);
  mountCrmTimelineRoutes(app);
  mountCrmQuoteHandoffRoutes(app);
  mountProjectRoutes(app);
  mountProjectTaskRoutes(app);
  mountProjectTimelineRoutes(app);
  mountTimeEntryRoutes(app);
  mountRateRoutes(app);
  mountAssignmentRoutes(app);
  mountInvoiceProposalRoutes(app);
  mountBillingInvoiceRoutes(app);
  mountBillingPaymentRoutes(app);
  mountBillingTaxRoutes(app);
  mountBillingAccountingRoutes(app);
  mountBillingRecurringScheduleRoutes(app);
  mountBankingRoutes(app);
  mountReportingSavedViewRoutes(app);
  mountReportingReportDefinitionRoutes(app);
  mountReportingDashboardRoutes(app);
  mountReportingScheduledDeliveryRoutes(app);
  mountWorkflowRoutes(app);
  mountWebhookRoutes(app);
  mountWebhookAdminRoutes(app);

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
