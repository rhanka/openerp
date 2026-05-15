import type { Hono } from "hono";

import type {
  AuthenticationResponseJSON,
  RegistrationResponseJSON
} from "@simplewebauthn/server";

import type {
  IdentityProvider,
  IdentityToken,
  OrganizationMember,
  UserIdentity
} from "@sentropic/openerp-domain";

import type { Queryable } from "../../db/client";
import {
  findUserIdentityByEmail,
  findUserIdentityById,
  recordUserIdentityLogin
} from "../../foundation/user-identities";
import { listActiveMembershipsForUser } from "../../foundation/organization-members";
import {
  PasskeyError,
  type PasskeyService
} from "../../foundation/passkey-service";

import type { AppBindings } from "../app";

// Public (pre-auth) HTTP endpoints for passkey ceremonies and session
// exchange. These deliberately do NOT live behind the tenant resolver — the
// caller has not yet authenticated.

export interface WebAuthnRoutesDeps {
  db: Queryable;
  passkeyService: PasskeyService;
  identityProvider: IdentityProvider;
  sessionTtlSeconds?: number;
}

export function mountWebAuthnRoutes(
  app: Hono<AppBindings>,
  deps: WebAuthnRoutesDeps
): void {
  const sessionTtl = deps.sessionTtlSeconds ?? 3600;

  app.post("/webauthn/register/begin", async (c) => {
    const body = await parseJson<{ email: string }>(c);
    if (!body) return c.json({ code: "INVALID_JSON" }, 400);
    if (!body.email) return c.json({ code: "INVALID_INPUT", errors: { email: "REQUIRED" } }, 400);
    const identity = await findUserIdentityByEmail(deps.db, body.email);
    if (!identity) return c.json({ code: "USER_NOT_FOUND" }, 404);
    if (identity.status !== "active" && identity.status !== "invited") {
      return c.json({ code: "USER_NOT_ELIGIBLE" }, 409);
    }
    const opts = await deps.passkeyService.beginRegistration(deps.db, { identity });
    return c.json(opts);
  });

  app.post("/webauthn/register/finish", async (c) => {
    const body = await parseJson<{
      userIdentityId: string;
      response: RegistrationResponseJSON;
      label?: string;
    }>(c);
    if (!body) return c.json({ code: "INVALID_JSON" }, 400);
    if (!body.userIdentityId || !body.response) {
      return c.json({ code: "INVALID_INPUT" }, 400);
    }
    const identity = await findUserIdentityById(deps.db, body.userIdentityId);
    if (!identity) return c.json({ code: "USER_NOT_FOUND" }, 404);
    try {
      const credential = await deps.passkeyService.finishRegistration(deps.db, {
        identity,
        response: body.response,
        ...(body.label ? { label: body.label } : {})
      });
      return c.json(
        {
          id: credential.id,
          credentialId: credential.credentialId,
          label: credential.label,
          deviceType: credential.deviceType,
          backedUp: credential.backedUp,
          createdAt: credential.createdAt
        },
        201
      );
    } catch (err) {
      return passkeyErrorResponse(c, err);
    }
  });

  app.post("/webauthn/login/begin", async (c) => {
    const body = (await parseJson<{ email?: string }>(c)) ?? {};
    let identity: UserIdentity | null = null;
    if (body.email) {
      identity = await findUserIdentityByEmail(deps.db, body.email);
      if (!identity) return c.json({ code: "USER_NOT_FOUND" }, 404);
    }
    const opts = await deps.passkeyService.beginAuthentication(
      deps.db,
      identity ? { identity } : {}
    );
    return c.json(opts);
  });

  app.post("/webauthn/login/finish", async (c) => {
    const body = await parseJson<{
      response: AuthenticationResponseJSON;
      organizationId?: string;
    }>(c);
    if (!body?.response) return c.json({ code: "INVALID_INPUT" }, 400);
    let result;
    try {
      result = await deps.passkeyService.finishAuthentication(deps.db, body.response);
    } catch (err) {
      return passkeyErrorResponse(c, err);
    }
    const identity = await findUserIdentityById(deps.db, result.userIdentityId);
    if (!identity) return c.json({ code: "USER_NOT_FOUND" }, 404);
    const activeMembers = await listActiveMembershipsForUser(deps.db, identity.id);
    if (activeMembers.length === 0) {
      return c.json({ code: "NO_ACTIVE_MEMBERSHIP" }, 403);
    }

    // Org selection: explicit body.organizationId wins; otherwise single
    // membership auto-selects; otherwise the client must pick.
    let chosen: OrganizationMember | null = null;
    if (body.organizationId) {
      chosen = activeMembers.find((m) => m.organizationId === body.organizationId) ?? null;
      if (!chosen) return c.json({ code: "ORGANIZATION_NOT_MEMBER" }, 403);
    } else if (activeMembers.length === 1) {
      chosen = activeMembers[0]!;
    }
    if (!chosen) {
      return c.json(
        {
          code: "ORGANIZATION_SELECTION_REQUIRED",
          userIdentityId: identity.id,
          memberships: activeMembers.map((m) => ({
            organizationId: m.organizationId,
            preferredLocale: m.preferredLocale
          }))
        },
        409
      );
    }

    const token = await deps.identityProvider.issueHumanSession(identity, chosen, sessionTtl);
    await recordUserIdentityLogin(deps.db, identity.id, token.issuedAt);
    return c.json({
      token: serializeToken(token),
      userIdentityId: identity.id,
      organizationId: chosen.organizationId,
      credentialId: result.credentialId
    });
  });
}

async function parseJson<T>(c: { req: { json: () => Promise<unknown> } }): Promise<T | null> {
  try {
    return (await c.req.json()) as T;
  } catch {
    return null;
  }
}

function passkeyErrorResponse(
  c: { json: (b: unknown, s?: number) => Response },
  err: unknown
): Response {
  if (err instanceof PasskeyError) {
    const status = err.code === "PASSKEY_CHALLENGE_INVALID"
      || err.code === "PASSKEY_CHALLENGE_MISSING"
      || err.code === "PASSKEY_CREDENTIAL_UNKNOWN"
      ? 400
      : err.code === "PASSKEY_COUNTER_REPLAY"
        ? 409
        : 401;
    return c.json({ code: err.code, message: err.message }, status);
  }
  throw err as Error;
}

function serializeToken(token: IdentityToken): {
  raw: string;
  expiresAt: string;
  issuedAt: string;
} {
  return { raw: token.raw, expiresAt: token.expiresAt, issuedAt: token.issuedAt };
}
