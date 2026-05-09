import { describe, expect, it } from "vitest";
import {
  BASELINE_ROLES,
  FOUNDATION_EVENTS,
  FOUNDATION_PERMISSIONS,
  createPermissionKey,
  requiresAudit
} from "./foundation";
import type { AuditEvent, DomainEvent, Notification, PermissionGrant } from "./foundation";

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
});
