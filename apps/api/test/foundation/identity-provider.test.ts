import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";

import type { OrganizationMember, UserIdentity } from "@openerp/domain";

import {
  IdentityTokenInvalidError,
  IdentityTokenRevokedError,
  InMemoryRevocationStore,
  createIdentityProvider
} from "../../src/foundation/identity-provider";

const SECRET = randomBytes(32);

function makeIdentity(overrides: Partial<UserIdentity> = {}): UserIdentity {
  return {
    id: "uid_human",
    email: "alice@example.com",
    displayName: "Alice",
    preferredLocale: "fr",
    mfaState: "passkey",
    status: "active",
    actorType: "human",
    lastLoginAt: null,
    createdAt: "2026-05-14T00:00:00.000Z",
    updatedAt: "2026-05-14T00:00:00.000Z",
    ...overrides
  };
}

function makeMember(overrides: Partial<OrganizationMember> = {}): OrganizationMember {
  return {
    id: "om_1",
    userIdentityId: "uid_human",
    organizationId: "org_1",
    status: "active",
    preferredLocale: null,
    joinedAt: "2026-05-14T00:00:00.000Z",
    updatedAt: "2026-05-14T00:00:00.000Z",
    ...overrides
  };
}

describe("IdentityProvider (PG-09, RFC 8693)", () => {
  it("requires a 32-byte secret for HS256", () => {
    expect(() =>
      createIdentityProvider({ secret: randomBytes(16), issuer: "openerp" })
    ).toThrow(/at least 32 bytes/);
  });

  it("issues a human session JWT carrying organization + actor_type + sub", async () => {
    const provider = createIdentityProvider({ secret: SECRET, issuer: "openerp" });
    const token = await provider.issueHumanSession(makeIdentity(), makeMember(), 600);
    expect(token.subjectUserIdentityId).toBe("uid_human");
    expect(token.organizationId).toBe("org_1");
    expect(token.actorType).toBe("human");
    expect(token.actingForUserIdentityId).toBeNull();
    expect(token.scopes).toContain("session");

    const verified = await provider.verify(token.raw);
    expect(verified.subjectUserIdentityId).toBe("uid_human");
    expect(verified.organizationId).toBe("org_1");
  });

  it("refuses to issue a human session if identity is not human", async () => {
    const provider = createIdentityProvider({ secret: SECRET, issuer: "openerp" });
    const agentIdentity = makeIdentity({ actorType: "agent" });
    await expect(
      provider.issueHumanSession(agentIdentity, makeMember(), 600)
    ).rejects.toThrow(/actorType must be 'human'/);
  });

  it("refuses to issue a session when identity and member do not match", async () => {
    const provider = createIdentityProvider({ secret: SECRET, issuer: "openerp" });
    await expect(
      provider.issueHumanSession(makeIdentity({ id: "uid_other" }), makeMember(), 600)
    ).rejects.toThrow(/identity and member do not match/);
  });

  it("exchanges a human session for an agent token with RFC 8693 act claim", async () => {
    const provider = createIdentityProvider({ secret: SECRET, issuer: "openerp" });
    const session = await provider.issueHumanSession(makeIdentity(), makeMember(), 3600);

    const agentToken = await provider.exchangeForAgentToken({
      subjectToken: session.raw,
      subjectUserIdentityId: "uid_human",
      actingForUserIdentityId: "uid_agent_invoice_drafter",
      requestedScopes: ["approval_request.read", "invoice.draft"],
      organizationId: "org_1",
      approvalRequestId: "appr_1",
      policyDecisionId: "policy_1"
    });

    expect(agentToken.actorType).toBe("agent");
    expect(agentToken.subjectUserIdentityId).toBe("uid_agent_invoice_drafter");
    expect(agentToken.actingForUserIdentityId).toBe("uid_human");
    expect(agentToken.organizationId).toBe("org_1");
    expect(agentToken.scopes).toEqual(["approval_request.read", "invoice.draft"]);
    expect(agentToken.approvalRequestId).toBe("appr_1");
    expect(agentToken.policyDecisionId).toBe("policy_1");

    const verified = await provider.verify(agentToken.raw);
    expect(verified.actorType).toBe("agent");
    expect(verified.actingForUserIdentityId).toBe("uid_human");
  });

  it("rejects token exchange if the subject token is not human", async () => {
    const provider = createIdentityProvider({ secret: SECRET, issuer: "openerp" });
    const session = await provider.issueHumanSession(makeIdentity(), makeMember(), 3600);
    const agentToken = await provider.exchangeForAgentToken({
      subjectToken: session.raw,
      subjectUserIdentityId: "uid_human",
      actingForUserIdentityId: "uid_agent",
      requestedScopes: [],
      organizationId: "org_1",
      approvalRequestId: null,
      policyDecisionId: null
    });
    // Re-exchange an agent token should fail.
    await expect(
      provider.exchangeForAgentToken({
        subjectToken: agentToken.raw,
        subjectUserIdentityId: "uid_agent",
        actingForUserIdentityId: "uid_other_agent",
        requestedScopes: [],
        organizationId: "org_1",
        approvalRequestId: null,
        policyDecisionId: null
      })
    ).rejects.toBeInstanceOf(IdentityTokenInvalidError);
  });

  it("rejects token exchange when the org does not match the subject token", async () => {
    const provider = createIdentityProvider({ secret: SECRET, issuer: "openerp" });
    const session = await provider.issueHumanSession(makeIdentity(), makeMember(), 3600);
    await expect(
      provider.exchangeForAgentToken({
        subjectToken: session.raw,
        subjectUserIdentityId: "uid_human",
        actingForUserIdentityId: "uid_agent",
        requestedScopes: [],
        organizationId: "org_2",
        approvalRequestId: null,
        policyDecisionId: null
      })
    ).rejects.toThrow(/organization does not match/);
  });

  it("revokes a token by jti and refuses subsequent verification", async () => {
    const revocations = new InMemoryRevocationStore();
    const provider = createIdentityProvider({
      secret: SECRET,
      issuer: "openerp",
      revocationStore: revocations
    });
    const session = await provider.issueHumanSession(makeIdentity(), makeMember(), 600);
    await provider.verify(session.raw);

    await provider.revoke(session.raw);
    await expect(provider.verify(session.raw)).rejects.toBeInstanceOf(IdentityTokenRevokedError);
  });

  it("rejects an invalid token signature", async () => {
    const provider = createIdentityProvider({ secret: SECRET, issuer: "openerp" });
    const other = createIdentityProvider({ secret: randomBytes(32), issuer: "openerp" });
    const session = await other.issueHumanSession(makeIdentity(), makeMember(), 600);
    await expect(provider.verify(session.raw)).rejects.toBeInstanceOf(IdentityTokenInvalidError);
  });
});
