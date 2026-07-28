import type {
  AuthHonoAccountPolicyPort,
  AuthHonoDeviceInfo,
  AuthHonoRandomPort,
  AuthHonoUserPort,
  AuthHonoUserRecord,
} from "@sentropic/auth-hono";
import type { IdentityProvider, OrganizationMember } from "@sentropic/openerp-domain";

import type { OpenERPCookiePort } from "./openerp-cookie-port.js";
import type { OpenERPPendingTenantSelectionPort } from "./openerp-pending-tenant-port.js";
import type { OpenERPSessionPort, OpenERPSessionRecord } from "./openerp-session-port.js";
import type { OpenERPTokenPort, OpenERPSessionClaims } from "./openerp-token-port.js";

export class OpenERPTenantSessionError extends Error {
  constructor(
    readonly code:
      | "AUTHENTICATION_FORBIDDEN"
      | "NO_ACTIVE_MEMBERSHIPS"
      | "ORGANIZATION_NOT_MEMBER"
      | "PENDING_TENANT_SELECTION_INVALID"
      | "SESSION_INVALID",
    readonly status: 401 | 403 | 410,
    message: string
  ) {
    super(message);
  }
}

export interface OpenERPAuthUiSession {
  expiresAt: string;
  user: {
    id: string;
    email: string | null;
    displayName: string | null;
    role: string;
  };
}

export interface OpenERPTenantSessionTokens {
  expiresAt: Date;
  refreshToken: string;
  sessionId: string;
  sessionToken: string;
}

export type OpenERPTenantIssuance =
  | {
      kind: "session";
      cookieHeaders: [string, string];
      response: OpenERPAuthUiSession;
      tokens: OpenERPTenantSessionTokens;
    }
  | {
      kind: "tenant-selection-required";
      cookieHeader: string;
      response: OpenERPAuthUiSession & { requiresTenantSelection: true };
    };

export interface OpenERPValidatedTenantSession {
  claims: OpenERPSessionClaims;
  organizationId: string;
  sessionRecord: OpenERPSessionRecord;
  user: AuthHonoUserRecord;
}

export interface OpenERPTenantSessionService {
  issueForVerifiedUser(input: {
    userId: string;
    ceremonyId: string;
    deviceInfo?: AuthHonoDeviceInfo;
    mfaVerified?: boolean;
  }): Promise<OpenERPTenantIssuance>;
  selectTenant(input: {
    pendingToken: string;
    organizationId: string;
    deviceInfo?: AuthHonoDeviceInfo;
    mfaVerified?: boolean;
  }): Promise<Extract<OpenERPTenantIssuance, { kind: "session" }>>;
  refresh(refreshToken: string): Promise<Extract<OpenERPTenantIssuance, { kind: "session" }> | null>;
  validate(sessionToken: string): Promise<OpenERPValidatedTenantSession | null>;
  logout(sessionToken: string): Promise<{ cookieHeaders: [string, string] } | null>;
}

export interface CreateOpenERPTenantSessionServiceOptions {
  accountPolicy: Pick<AuthHonoAccountPolicyPort, "canAuthenticate" | "resolveSessionRole">;
  activeMembershipsForUser: (userIdentityId: string) => Promise<OrganizationMember[]>;
  clock: { now(): Date; addSeconds(date: Date, seconds: number): Date };
  cookies: OpenERPCookiePort;
  identityProvider: IdentityProvider;
  pendingSelections: OpenERPPendingTenantSelectionPort;
  random: Pick<AuthHonoRandomPort, "token" | "uuid">;
  sessions: OpenERPSessionPort;
  tokens: OpenERPTokenPort;
  users: Pick<AuthHonoUserPort, "findById">;
  sessionTtlSeconds?: number;
  refreshTokenBytes?: number;
  pendingTenantTtlSeconds?: number;
}

/**
 * Host-only tenant session flow. The published platform session service cannot
 * accept an organization on create or refresh, so it must not issue OpenERP
 * human sessions. This service is intentionally unmounted in Lot 2.
 */
export function createOpenERPTenantSessionService(
  options: CreateOpenERPTenantSessionServiceOptions
): OpenERPTenantSessionService {
  const sessionTtlSeconds = options.sessionTtlSeconds ?? 7 * 24 * 60 * 60;
  const refreshTokenBytes = options.refreshTokenBytes ?? 32;
  const pendingTenantTtlSeconds = options.pendingTenantTtlSeconds ?? 5 * 60;

  async function loadAuthenticatedHuman(userId: string, now: Date): Promise<AuthHonoUserRecord> {
    const user = await options.users.findById(userId);
    if (!user || user.role !== "user") {
      throw new OpenERPTenantSessionError(
        "AUTHENTICATION_FORBIDDEN",
        403,
        "Only an authenticated human may receive an OpenERP session."
      );
    }
    const decision = await options.accountPolicy.canAuthenticate(user, now);
    if (!decision.allowed) {
      throw new OpenERPTenantSessionError(
        "AUTHENTICATION_FORBIDDEN",
        403,
        decision.message ?? "This account is not allowed to authenticate."
      );
    }
    return user;
  }

  async function requireActiveMembership(userId: string, organizationId: string): Promise<OrganizationMember> {
    const memberships = await options.activeMembershipsForUser(userId);
    const member = memberships.find((candidate) => candidate.organizationId === organizationId);
    if (!member) {
      throw new OpenERPTenantSessionError(
        "ORGANIZATION_NOT_MEMBER",
        403,
        "The authenticated user is not an active member of this organization."
      );
    }
    return member;
  }

  function responseFor(user: AuthHonoUserRecord, expiresAt: Date): OpenERPAuthUiSession {
    return {
      expiresAt: expiresAt.toISOString(),
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
      },
    };
  }

  async function issueForOrganization(input: {
    userId: string;
    organizationId: string;
    now: Date;
    deviceInfo?: AuthHonoDeviceInfo;
    mfaVerified?: boolean;
  }): Promise<Extract<OpenERPTenantIssuance, { kind: "session" }>> {
    const user = await loadAuthenticatedHuman(input.userId, input.now);
    await requireActiveMembership(user.id, input.organizationId);
    const role = await options.accountPolicy.resolveSessionRole(user, input.now);
    const sessionId = options.random.uuid();
    const expiresAt = options.clock.addSeconds(input.now, sessionTtlSeconds);
    const refreshToken = options.random.token(refreshTokenBytes);
    const sessionToken = await options.tokens.signSessionToken(
      {
        userId: user.id,
        sessionId,
        role,
        email: user.email,
        displayName: user.displayName,
        org: input.organizationId,
      },
      expiresAt
    );
    const [sessionTokenHash, refreshTokenHash] = await Promise.all([
      options.tokens.hashSecret(sessionToken),
      options.tokens.hashSecret(refreshToken),
    ]);
    const session = await options.sessions.create({
      id: sessionId,
      userId: user.id,
      organizationId: input.organizationId,
      sessionTokenHash,
      refreshTokenHash,
      ...(input.deviceInfo ? { deviceInfo: input.deviceInfo } : {}),
      ...(input.mfaVerified !== undefined ? { mfaVerified: input.mfaVerified } : {}),
      expiresAt,
      now: input.now,
    });
    const tokens: OpenERPTenantSessionTokens = {
      expiresAt: session.expiresAt,
      refreshToken,
      sessionId: session.id,
      sessionToken,
    };
    return {
      kind: "session",
      cookieHeaders: [
        options.cookies.serializeSessionCookie({ token: sessionToken, expiresAt: session.expiresAt }),
        options.cookies.serializeRefreshCookie({ token: refreshToken, expiresAt: session.expiresAt }),
      ],
      response: responseFor(user, session.expiresAt),
      tokens,
    };
  }

  return {
    async issueForVerifiedUser(input) {
      const now = options.clock.now();
      const user = await loadAuthenticatedHuman(input.userId, now);
      const memberships = await options.activeMembershipsForUser(user.id);
      if (memberships.length === 0) {
        throw new OpenERPTenantSessionError(
          "NO_ACTIVE_MEMBERSHIPS",
          403,
          "This account has no active organization membership."
        );
      }
      if (memberships.length === 1) {
        return issueForOrganization({
          userId: user.id,
          organizationId: memberships[0]!.organizationId,
          now,
          ...(input.deviceInfo ? { deviceInfo: input.deviceInfo } : {}),
          ...(input.mfaVerified !== undefined ? { mfaVerified: input.mfaVerified } : {}),
        });
      }

      const expiresAt = options.clock.addSeconds(now, pendingTenantTtlSeconds);
      const pendingToken = options.random.token(refreshTokenBytes);
      const tokenHash = await options.tokens.hashSecret(pendingToken);
      await options.pendingSelections.create({
        userIdentityId: user.id,
        ceremonyId: input.ceremonyId,
        tokenHash,
        expiresAt,
        now,
      });
      return {
        kind: "tenant-selection-required",
        cookieHeader: options.cookies.serializePendingTenantCookie({ token: pendingToken, expiresAt }),
        response: { ...responseFor(user, expiresAt), requiresTenantSelection: true },
      };
    },

    async selectTenant(input) {
      const now = options.clock.now();
      const tokenHash = await options.tokens.hashSecret(input.pendingToken);
      const pending = await options.pendingSelections.findValid(tokenHash, now);
      if (!pending) {
        throw new OpenERPTenantSessionError(
          "PENDING_TENANT_SELECTION_INVALID",
          410,
          "The pending organization selection is invalid or has expired."
        );
      }
      await requireActiveMembership(pending.userIdentityId, input.organizationId);
      const consumed = await options.pendingSelections.consume({
        id: pending.id,
        userIdentityId: pending.userIdentityId,
        ceremonyId: pending.ceremonyId,
        tokenHash,
        now,
      });
      if (!consumed) {
        throw new OpenERPTenantSessionError(
          "PENDING_TENANT_SELECTION_INVALID",
          410,
          "The pending organization selection has already been used."
        );
      }
      return issueForOrganization({
        userId: pending.userIdentityId,
        organizationId: input.organizationId,
        now,
        ...(input.deviceInfo ? { deviceInfo: input.deviceInfo } : {}),
        ...(input.mfaVerified !== undefined ? { mfaVerified: input.mfaVerified } : {}),
      });
    },

    async refresh(refreshToken) {
      const now = options.clock.now();
      const refreshTokenHash = await options.tokens.hashSecret(refreshToken);
      const session = await options.sessions.findByRefreshTokenHash(refreshTokenHash);
      if (!session || session.revokedAt || session.expiresAt <= now || !session.organizationId) return null;

      const user = await loadAuthenticatedHuman(session.userId, now).catch(() => null);
      if (!user) return null;
      const memberships = await options.activeMembershipsForUser(user.id);
      if (!memberships.some((membership) => membership.organizationId === session.organizationId)) return null;

      const role = await options.accountPolicy.resolveSessionRole(user, now);
      const expiresAt = options.clock.addSeconds(now, sessionTtlSeconds);
      const nextRefreshToken = options.random.token(refreshTokenBytes);
      const nextSessionToken = await options.tokens.signSessionToken(
        {
          userId: user.id,
          sessionId: session.id,
          role,
          email: user.email,
          displayName: user.displayName,
          org: session.organizationId,
        },
        expiresAt
      );
      const [sessionTokenHash, nextRefreshTokenHash] = await Promise.all([
        options.tokens.hashSecret(nextSessionToken),
        options.tokens.hashSecret(nextRefreshToken),
      ]);
      const updated = await options.sessions.updateTokens({
        sessionId: session.id,
        sessionTokenHash,
        refreshTokenHash: nextRefreshTokenHash,
        expiresAt,
      });
      if (!updated || updated.organizationId !== session.organizationId) return null;
      return {
        kind: "session",
        cookieHeaders: [
          options.cookies.serializeSessionCookie({ token: nextSessionToken, expiresAt: updated.expiresAt }),
          options.cookies.serializeRefreshCookie({ token: nextRefreshToken, expiresAt: updated.expiresAt }),
        ],
        response: responseFor(user, updated.expiresAt),
        tokens: {
          expiresAt: updated.expiresAt,
          refreshToken: nextRefreshToken,
          sessionId: updated.id,
          sessionToken: nextSessionToken,
        },
      };
    },

    async validate(sessionToken) {
      const now = options.clock.now();
      let identity;
      try {
        identity = await options.identityProvider.verify(sessionToken);
      } catch {
        return null;
      }
      if (identity.actorType !== "human" || !identity.scopes.includes("session")) return null;
      const claims = await options.tokens.verifySessionToken(sessionToken);
      if (!claims) return null;
      const sessionTokenHash = await options.tokens.hashSecret(sessionToken);
      const session = await options.sessions.findByTokenHash(sessionTokenHash);
      if (
        !session ||
        session.revokedAt ||
        session.expiresAt <= now ||
        session.id !== claims.sessionId ||
        session.userId !== claims.userId ||
        session.organizationId !== claims.org ||
        identity.organizationId !== session.organizationId ||
        identity.subjectUserIdentityId !== session.userId
      ) {
        return null;
      }
      const user = await loadAuthenticatedHuman(session.userId, now).catch(() => null);
      if (!user) return null;
      const memberships = await options.activeMembershipsForUser(user.id);
      if (!memberships.some((membership) => membership.organizationId === session.organizationId)) return null;
      await options.sessions.touch(session.id, now);
      return { claims, organizationId: session.organizationId, sessionRecord: session, user };
    },

    async logout(sessionToken) {
      const session = await this.validate(sessionToken);
      if (!session) return null;
      const revoked = await options.sessions.revoke(session.sessionRecord.id);
      if (!revoked) return null;
      await options.identityProvider.revoke(sessionToken);
      return {
        cookieHeaders: [
          options.cookies.serializeClearedSessionCookie(),
          options.cookies.serializeClearedRefreshCookie(),
        ],
      };
    },
  };
}
