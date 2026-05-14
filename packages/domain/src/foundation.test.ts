import { describe, expect, it } from "vitest";
import {
  BASELINE_ROLES,
  FOUNDATION_EVENTS,
  FOUNDATION_PERMISSIONS,
  createPermissionKey,
  makeMoney,
  requiresAudit,
  sameCurrency
} from "./foundation";
import type {
  ApprovalRequest,
  AuditEvent,
  DomainEvent,
  FxRateSnapshot,
  IdempotencyRecord,
  Money,
  Notification,
  OrganizationMember,
  PermissionGrant,
  TimelineEntry,
  UserIdentity
} from "./foundation";

describe("foundation domain contracts", () => {
  it("defines every baseline role required by tenant setup", () => {
    expect(BASELINE_ROLES.map((role) => role.key)).toEqual([
      "owner",
      "admin",
      "manager",
      "standard_user",
      "auditor",
      "external_user"
    ]);
  });

  it("builds permission keys from resource, action, and scope", () => {
    expect(createPermissionKey("admin.user", "manage", "organization")).toBe(
      "admin.user.manage.organization"
    );
  });

  it("keeps foundation events available for audit and automation", () => {
    expect(FOUNDATION_EVENTS).toContain("organization.created");
    expect(FOUNDATION_EVENTS).toContain("system.update_preflight_requested");
  });

  it("requires audit for sensitive foundation actions", () => {
    expect(requiresAudit("user.roles_changed")).toBe(true);
    expect(requiresAudit("notification.sent")).toBe(false);
  });

  it("contains the permissions needed by admin and audit APIs", () => {
    expect(FOUNDATION_PERMISSIONS).toContain("admin.user.manage.organization");
    expect(FOUNDATION_PERMISSIONS).toContain("audit.event.read.organization");
  });

  it("carries cross-cutting fields on audit, permission, notification, and domain events", () => {
    const auditEvent: AuditEvent = {
      id: "audit_1",
      organizationId: "org_1",
      actorUserId: "user_1",
      actorType: "user",
      action: "user.roles_changed",
      resourceType: "user",
      resourceId: "user_2",
      beforeSummary: { roleKeys: ["standard_user"] },
      afterSummary: { roleKeys: ["auditor"] },
      ipHash: "ip_hash",
      userAgentHash: "ua_hash",
      createdAt: "2026-05-09T14:00:01.000Z"
    };

    const permissionGrant: PermissionGrant = {
      id: "grant_1",
      organizationId: "org_1",
      roleId: "role_auditor",
      userId: null,
      resource: "audit.event",
      action: "read",
      scope: "organization",
      conditions: {},
      createdByUserId: "user_1",
      createdAt: "2026-05-09T14:00:02.000Z"
    };

    const notification: Notification = {
      id: "notification_1",
      organizationId: "org_1",
      recipientUserId: "user_2",
      channel: "in_app",
      subjectKey: "notification.roleUpdated.title",
      bodyKey: "notification.roleUpdated.body",
      payload: {
        roleKey: "auditor"
      },
      status: "sent",
      createdAt: "2026-05-09T14:00:03.000Z",
      readAt: null,
    };

    const domainEvent: DomainEvent = {
      id: "event_1",
      organizationId: "org_1",
      eventType: "notification.sent",
      resourceType: "notification",
      resourceId: "notification_1",
      payloadSummary: {
        channel: "in_app"
      },
      emittedAt: "2026-05-09T14:00:04.000Z",
      consumedAt: null
    };

    expect(auditEvent.actorUserId).toBe("user_1");
    expect(permissionGrant.scope).toBe("organization");
    expect(notification.payload.roleKey).toBe("auditor");
    expect(domainEvent.resourceType).toBe("notification");
  });

  it("carries the agentic extension fields on AuditEvent (PG-09)", () => {
    const auditEvent: AuditEvent = {
      id: "audit_2",
      organizationId: "org_1",
      actorUserId: "user_1",
      actorType: "user",
      action: "invoice.issued",
      resourceType: "invoice",
      resourceId: "invoice_1",
      beforeSummary: null,
      afterSummary: { status: "issued" },
      ipHash: null,
      userAgentHash: null,
      createdAt: "2026-05-14T09:00:00.000Z",
      source: "agent",
      agentId: "agent_invoice_drafter",
      toolCallId: "tool_1",
      policyDecisionId: "policy_1",
      delegationId: "delegation_1",
      approvalRequestId: "approval_1"
    };
    expect(auditEvent.source).toBe("agent");
    expect(auditEvent.delegationId).toBe("delegation_1");
  });
});

describe("canon entities (shared-entities-v1.md, arbitrage 2026-05-14)", () => {
  it("constructs Money values with ISO 4217 currency and minor units", () => {
    const cad = makeMoney(1234, "cad");
    expect(cad).toEqual({ amountMinor: 1234, currency: "CAD", scale: 2 });

    expect(() => makeMoney(100, "USDOLLAR")).toThrow(/ISO 4217/);
    expect(() => makeMoney(1.5, "USD")).toThrow(/integer/);
    expect(() => makeMoney(100, "USD", -1)).toThrow(/non-negative/);
  });

  it("compares Money values for currency compatibility before arithmetic", () => {
    const usd = makeMoney(500, "USD");
    const usdScale3 = makeMoney(500, "USD", 3);
    const cad = makeMoney(500, "CAD");

    expect(sameCurrency(usd, makeMoney(700, "USD"))).toBe(true);
    expect(sameCurrency(usd, cad)).toBe(false);
    expect(sameCurrency(usd, usdScale3)).toBe(false);
  });

  it("carries the UserIdentity + OrganizationMember canon (PG-02)", () => {
    const identity: UserIdentity = {
      id: "uid_1",
      email: "fabien@example.com",
      displayName: "Fabien Antoine",
      preferredLocale: "fr",
      mfaState: "passkey",
      status: "active",
      actorType: "human",
      createdAt: "2026-05-14T09:00:00.000Z",
      updatedAt: "2026-05-14T09:00:00.000Z",
      lastLoginAt: null
    };

    const member: OrganizationMember = {
      id: "om_1",
      userIdentityId: identity.id,
      organizationId: "org_1",
      status: "active",
      preferredLocale: null,
      joinedAt: "2026-05-14T09:00:00.000Z",
      updatedAt: "2026-05-14T09:00:00.000Z"
    };

    expect(member.userIdentityId).toBe(identity.id);
    expect(identity.actorType).toBe("human");
  });

  it("carries TimelineEntry, ApprovalRequest, IdempotencyRecord, FxRateSnapshot (PG-06/07/08)", () => {
    const entry: TimelineEntry = {
      id: "tl_1",
      organizationId: "org_1",
      resourceType: "opportunity",
      resourceId: "opp_1",
      actorUserIdentityId: "uid_1",
      entryType: "crm.opportunity.stage_changed",
      payloadSummary: { from: "discovery", to: "proposal" },
      occurredAt: "2026-05-14T10:00:00.000Z"
    };

    const approval: ApprovalRequest = {
      id: "appr_1",
      organizationId: "org_1",
      requesterUserIdentityId: "uid_agent",
      approverUserIdentityId: "uid_human",
      approverRoleId: null,
      subjectType: "invoice",
      subjectId: "invoice_1",
      reason: "Amount above auto-approve threshold",
      urgency: "normal",
      status: "pending",
      decisionReason: null,
      decidedAt: null,
      expiresAt: "2026-05-15T10:00:00.000Z",
      createdAt: "2026-05-14T10:00:00.000Z"
    };

    const idempotency: IdempotencyRecord = {
      organizationId: "org_1",
      key: "import_job_42",
      requestHash: "sha256:abcd",
      responseBodyHash: "sha256:efgh",
      statusCode: 201,
      createdAt: "2026-05-14T10:00:00.000Z",
      expiresAt: "2026-05-15T10:00:00.000Z"
    };

    const fx: FxRateSnapshot = {
      id: "fx_1",
      organizationId: "org_1",
      sourceCurrency: "USD",
      targetCurrency: "CAD",
      rate: "1.3625",
      effectiveAt: "2026-05-14T00:00:00.000Z",
      source: "boc"
    };

    expect(entry.entryType).toContain(".");
    expect(approval.status).toBe("pending");
    expect(idempotency.statusCode).toBe(201);
    expect(fx.rate).toBe("1.3625");
  });
});
