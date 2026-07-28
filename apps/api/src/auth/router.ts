import { Hono, type Context } from "hono";

import {
  createAuthRouter,
  type AuthHonoRouteHandlers,
} from "@sentropic/auth-hono/router";
import { createAuthCredentialRouteHandlers } from "@sentropic/auth-hono/credential-route-handlers";
import { createAuthEmailVerificationService } from "@sentropic/auth-hono/email-verification";
import { createAuthEmailRouteHandlers } from "@sentropic/auth-hono/route-handlers";
import { createAuthSessionService } from "@sentropic/auth-hono/session";
import { createAuthSessionRouteHandlers } from "@sentropic/auth-hono/session-route-handlers";
import {
  createAuthWebAuthnAuthenticationService,
} from "@sentropic/auth-hono/webauthn-authentication";
import {
  createAuthWebAuthnAuthenticationRouteHandlers,
} from "@sentropic/auth-hono/webauthn-authentication-route-handlers";
import {
  createAuthWebAuthnRegistrationService,
} from "@sentropic/auth-hono/webauthn-registration";
import {
  createAuthWebAuthnRegistrationRouteHandlers,
  type AuthHonoRouteHandlerError,
} from "@sentropic/auth-hono/webauthn-registration-route-handlers";
import type { AuthHonoUserRecord } from "@sentropic/auth-hono";
import type {
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";
import type { IdentityProvider } from "@sentropic/openerp-domain";

import type { ApiEnv } from "../config/env.js";
import type { Queryable } from "../db/client.js";
import type { EmailSender } from "../foundation/email-sender.js";
import { listActiveMembershipsForUser } from "../foundation/organization-members.js";
import { createOpenERPTenantSessionHandlers } from "./openerp-tenant-session-handlers.js";
import { createOpenERPPendingTenantSelectionPort } from "./openerp-pending-tenant-port.js";
import type { OpenERPCookiePort } from "./openerp-cookie-port.js";
import type { OpenERPSessionPort } from "./openerp-session-port.js";
import type { OpenERPTokenPort } from "./openerp-token-port.js";
import {
  createOpenERPTenantSessionService,
  OpenERPTenantSessionError,
  type OpenERPTenantIssuance,
} from "./openerp-tenant-session.js";
import { buildAuthHonoPorts } from "./ports.js";

export interface CreateOpenERPAuthRouterOptions {
  db: Queryable;
  emailSender?: EmailSender;
  env: ApiEnv;
  identityProvider: IdentityProvider;
  rp: { id: string; expectedOrigin: string };
  sessionTtlSeconds: number;
  /** Injectable cryptographic verifiers for composed-router tests. */
  webAuthn?: PlatformAuthWebAuthnVerifierOverrides;
}

export interface PlatformAuthWebAuthnVerifierOverrides {
  verifyAuthenticationResponse?: typeof verifyAuthenticationResponse;
  verifyRegistrationResponse?: typeof verifyRegistrationResponse;
}

/**
 * Compose OpenERP's platform-auth HTTP surface. This is the only API auth
 * composition root: platform factories own ceremonies and route parsing while
 * OpenERP supplies persistence, closed-enrollment policy, and tenant-bearing
 * session finalizers.
 */
export function createOpenERPAuthRouter(options: CreateOpenERPAuthRouterOptions): Hono {
  const ports = buildAuthHonoPorts(options.db, options.env, {
    ...(options.emailSender ? { emailSender: options.emailSender } : {}),
  });
  const tenantSessions = createOpenERPTenantSessionService({
    accountPolicy: ports.accountPolicy,
    activeMembershipsForUser: (userId) => listActiveMembershipsForUser(options.db, userId),
    clock: ports.clock,
    cookies: ports.cookies as OpenERPCookiePort,
    identityProvider: options.identityProvider,
    pendingSelections: createOpenERPPendingTenantSelectionPort(options.db),
    random: ports.random,
    sessions: ports.sessions as OpenERPSessionPort,
    tokens: ports.tokens as OpenERPTokenPort,
    users: ports.users,
    sessionTtlSeconds: options.sessionTtlSeconds,
  });
  const tenantHandlers = createOpenERPTenantSessionHandlers({
    cookies: ports.cookies as OpenERPCookiePort,
    service: tenantSessions,
  });
  const rp = {
    id: options.rp.id,
    name: "OpenERP",
    expectedOrigins: [options.rp.expectedOrigin],
  };
  const emailService = createAuthEmailVerificationService({ ports });
  const platformRegistrationService = createAuthWebAuthnRegistrationService({
    ports,
    rp,
    ...(options.webAuthn?.verifyRegistrationResponse
      ? { verifyRegistrationResponse: options.webAuthn.verifyRegistrationResponse }
      : {}),
  });
  const registrationService = {
    generateRegistrationOptions: platformRegistrationService.generateRegistrationOptions,
    async verifyRegistration(input: Parameters<typeof platformRegistrationService.verifyRegistration>[0]) {
      try {
        return await platformRegistrationService.verifyRegistration(input);
      } catch (error) {
        if (error instanceof ClosedEnrollmentPolicyError) {
          return { verified: false as const, error: error.routeError };
        }
        throw error;
      }
    },
  };
  const authenticationService = createAuthWebAuthnAuthenticationService({
    ports,
    rp,
    ...(options.webAuthn?.verifyAuthenticationResponse
      ? { verifyAuthenticationResponse: options.webAuthn.verifyAuthenticationResponse }
      : {}),
  });

  const stockSessionHandlers = createAuthSessionRouteHandlers({
    cookies: ports.cookies,
    // The factory is retained for platform contract composition, but its
    // public refresh/logout handlers are overridden below: they cannot carry
    // OpenERP's required organization claim or revoke the IdentityProvider JWT.
    service: createAuthSessionService({
      ports,
      sessionTtlSeconds: options.sessionTtlSeconds,
    }),
  });

  const handlers: AuthHonoRouteHandlers = {
    ...createAuthEmailRouteHandlers({ service: emailService }),
    ...createAuthWebAuthnRegistrationRouteHandlers({
      service: registrationService,
      prepareRegistrationOptions: async (input) => {
        const enrollment = await requireInvitedEnrollment({
          email: input.email,
          verificationToken: input.verificationToken,
          ports,
          db: options.db,
        });
        if ("error" in enrollment) return enrollment;
        await ports.users.update(enrollment.user.id, { emailVerified: true });
        return {
          userId: enrollment.user.id,
          serviceInput: {
            userId: enrollment.user.id,
            userName: enrollment.user.email ?? normalizeEmail(ports, input.email),
            userDisplayName: enrollment.user.displayName ?? normalizeEmail(ports, input.email),
          },
        };
      },
      resolveRegistrationUser: async (input) => {
        const enrollment = await requireInvitedEnrollment({
          email: input.email,
          verificationToken: input.verificationToken,
          expectedUserId: input.userId,
          ports,
          db: options.db,
        });
        if ("error" in enrollment) return enrollment;
        return { userId: enrollment.user.id };
      },
      // Memberships and invitation state can change after options are issued.
      // The published service invokes this immediately after WebAuthn
      // verification and before credentials.create, so a stale invitation can
      // never leave an unauthorized credential behind.
      resolveBeforePersist: async (input, resolved) => async () => {
        const enrollment = await requireInvitedEnrollment({
          email: input.email,
          verificationToken: input.verificationToken,
          expectedUserId: resolved.userId,
          ports,
          db: options.db,
        });
        if ("error" in enrollment) throw new ClosedEnrollmentPolicyError(enrollment.error);
      },
      finalizeRegistration: async (result, c) => {
        const enrollment = await requireInvitedEnrollment({
          email: result.request.email,
          verificationToken: result.request.verificationToken,
          expectedUserId: result.userId,
          ports,
          db: options.db,
        });
        if ("error" in enrollment) return routeError(c, enrollment.error);

        // A pre-provisioned invitation becomes an active human only after the
        // platform has verified and persisted a credential. No identity or
        // membership is created by this route.
        const activated = await ports.users.update(enrollment.user.id, {
          accountStatus: "active",
          emailVerified: true,
        });
        if (!activated) {
          return c.json({ error: { code: "registration_identity_missing", message: "The invited identity no longer exists." } }, 409);
        }
        return issueTenantSession(c, tenantSessions, {
          userId: activated.id,
          ceremonyId: `registration:${result.credentialId}`,
          ...(result.request.deviceName ? { deviceName: result.request.deviceName } : {}),
        });
      },
    }),
    ...createAuthWebAuthnAuthenticationRouteHandlers({
      service: authenticationService,
      resolveAuthenticationOptions: async (input) => {
        if (!input.email) return {};
        const email = normalizeEmail(ports, input.email);
        const user = await ports.users.findByEmail(email);
        if (!user) return enrollmentError(404, "user_not_found", "No enrolled identity matches this email.");
        const decision = await ports.accountPolicy.canAuthenticate(user, ports.clock.now());
        if (!decision.allowed) {
          return enrollmentError(
            decision.status === 400 || decision.status === 404 ? decision.status : 403,
            decision.code ?? "authentication_forbidden",
            decision.message ?? "This account cannot authenticate."
          );
        }
        return { userId: user.id };
      },
      finalizeAuthentication: (result, c) => issueTenantSession(c, tenantSessions, {
        userId: result.userId,
        ceremonyId: `authentication:${result.credentialId}`,
        ...(result.request.deviceName ? { deviceName: result.request.deviceName } : {}),
      }),
    }),
    ...stockSessionHandlers,
    ...createAuthCredentialRouteHandlers({
      credentials: ports.credentials,
      resolveSession: async (c) => {
        const sessionToken = readSessionToken(c, ports.cookies.readSessionToken(c.req.raw));
        if (!sessionToken) return null;
        const session = await tenantSessions.validate(sessionToken);
        return session ? { userId: session.user.id } : null;
      },
    }),
    // auth-ui sends no JSON refresh token. The host implementation reads the
    // HttpOnly cookie and preserves/rechecks the persisted organization.
    refreshSession: (c) => tenantHandlers.refresh(c.req.raw),
    // Host logout also revokes the raw JWT in IdentityProvider; the stock
    // handler only revokes its session row and would leave bearer replay open.
    logout: (c) => tenantHandlers.logout(c.req.raw),
  };

  const platformRouter = createAuthRouter({
    cookieNames: { session: "openerp_session", refresh: "openerp_refresh" },
    handlers,
    ports,
    routePrefix: "",
    rp,
    serviceName: "openerp-auth",
    session: {
      sessionTtlSeconds: options.sessionTtlSeconds,
      refreshTtlSeconds: options.sessionTtlSeconds,
    },
  });

  const router = new Hono();
  router.get("/session", (c) => tenantHandlers.sessionInfo(c.req.raw));
  router.get("/tenant/select", (c) => tenantHandlers.listTenantSelection(c.req.raw));
  router.post("/tenant/select", (c) => tenantHandlers.selectTenant(c.req.raw));

  // auth-hono@0.13.0's dispatcher always creates the two magic-link routes.
  // Pre-empt them before mounting it so disabled capabilities are externally
  // absent (404) and can never reach a disabled storage port or a 501 stub.
  router.post("/magic-link/*", (c) => c.notFound());
  router.route("/", platformRouter);
  return router;
}

type EnrollmentResult = { user: AuthHonoUserRecord } | AuthHonoRouteHandlerError;

class ClosedEnrollmentPolicyError extends Error {
  constructor(readonly routeError: AuthHonoRouteHandlerError["error"]) {
    super(routeError.message);
  }
}

async function requireInvitedEnrollment(input: {
  db: Queryable;
  email: string;
  expectedUserId?: string;
  ports: ReturnType<typeof buildAuthHonoPorts>;
  verificationToken: string | undefined;
}): Promise<EnrollmentResult> {
  const email = normalizeEmail(input.ports, input.email);
  if (!input.verificationToken) {
    return enrollmentError(400, "email_verification_required", "A verified email token is required to enroll a passkey.");
  }
  const emailVerified = await input.ports.emailVerification.verifyToken(
    email,
    input.verificationToken,
    input.ports.clock.now()
  );
  if (!emailVerified) {
    return enrollmentError(400, "email_verification_invalid", "The email verification token is invalid or expired.");
  }
  const user = await input.ports.users.findByEmail(email);
  if (
    !user ||
    user.id !== (input.expectedUserId ?? user.id) ||
    user.role !== "user" ||
    user.accountStatus !== "pending_admin_approval"
  ) {
    return enrollmentError(403, "registration_not_preprovisioned", "Passkey enrollment requires a pre-provisioned invitation.");
  }
  const memberships = await listActiveMembershipsForUser(input.db, user.id);
  if (memberships.length === 0) {
    return enrollmentError(403, "registration_membership_required", "The invited identity has no active organization membership.");
  }
  return { user };
}

function normalizeEmail(ports: ReturnType<typeof buildAuthHonoPorts>, email: string): string {
  return ports.accountPolicy.normalizeEmail(email);
}

function enrollmentError(
  status: 400 | 403 | 404,
  code: string,
  message: string
): AuthHonoRouteHandlerError {
  return { error: { status, code, message } };
}

async function issueTenantSession(
  c: Context,
  service: ReturnType<typeof createOpenERPTenantSessionService>,
  input: { ceremonyId: string; deviceName?: string; userId: string }
): Promise<Response> {
  try {
    const issuance = await service.issueForVerifiedUser({
      ceremonyId: input.ceremonyId,
      userId: input.userId,
      ...(input.deviceName ? { deviceInfo: { name: input.deviceName } } : {}),
    });
    return sessionIssuanceResponse(c, issuance);
  } catch (error) {
    if (error instanceof OpenERPTenantSessionError) {
      return c.json({ error: { code: error.code, message: error.message } }, error.status);
    }
    throw error;
  }
}

function sessionIssuanceResponse(c: Context, issuance: OpenERPTenantIssuance): Response {
  if (issuance.kind === "session") {
    for (const cookie of issuance.cookieHeaders) c.header("set-cookie", cookie, { append: true });
    return c.json(issuance.response);
  }
  c.header("set-cookie", issuance.cookieHeader, { append: true });
  return c.json(issuance.response);
}

function routeError(c: Context, error: AuthHonoRouteHandlerError["error"]): Response {
  return c.json({ error: { code: error.code, message: error.message } }, error.status);
}

function readSessionToken(c: Context, cookieToken: string | null): string | null {
  if (cookieToken) return cookieToken;
  const authorization = c.req.header("authorization");
  const match = /^Bearer\s+(\S+)$/i.exec(authorization ?? "");
  return match?.[1] ?? null;
}
