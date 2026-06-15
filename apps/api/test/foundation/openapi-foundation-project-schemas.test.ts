import { describe, expect, it } from "vitest";

import { buildOpenApiDocument } from "../../src/http/openapi";
import { ENTITY_SCHEMAS } from "../../src/http/openapi-entity-schemas";

// OA-5: Foundation + Project entity JSON Schema assertions — verifies
// presence and shape of all schemas added to ENTITY_SCHEMAS and wired into
// the OpenAPI document.

// ─────────────────────────────────────────────────────────────────────────────
// Foundation entity schemas
// ─────────────────────────────────────────────────────────────────────────────

describe("Foundation helper schemas (OA-5)", () => {
  describe("Schema presence", () => {
    it("ENTITY_SCHEMAS includes all foundation helpers", () => {
      expect(ENTITY_SCHEMAS).toHaveProperty("Money");
      expect(ENTITY_SCHEMAS).toHaveProperty("FxRateSnapshot");
      expect(ENTITY_SCHEMAS).toHaveProperty("PayloadSummary");
    });
  });

  describe("Money", () => {
    it("required includes amountMinor, currency, scale", () => {
      const req = ENTITY_SCHEMAS.Money.required!;
      expect(req).toContain("amountMinor");
      expect(req).toContain("currency");
      expect(req).toContain("scale");
    });

    it("has additionalProperties: false", () => {
      expect(ENTITY_SCHEMAS.Money.additionalProperties).toBe(false);
    });

    it("appears in components.schemas", () => {
      const doc = buildOpenApiDocument();
      expect(doc.components.schemas.Money).toEqual(ENTITY_SCHEMAS.Money);
    });
  });

  describe("FxRateSnapshot", () => {
    it("required includes id, organizationId, sourceCurrency, targetCurrency, rate, effectiveAt, source", () => {
      const req = ENTITY_SCHEMAS.FxRateSnapshot.required!;
      expect(req).toContain("id");
      expect(req).toContain("organizationId");
      expect(req).toContain("sourceCurrency");
      expect(req).toContain("targetCurrency");
      expect(req).toContain("rate");
      expect(req).toContain("effectiveAt");
      expect(req).toContain("source");
    });

    it("effectiveAt has format date-time", () => {
      const prop = ENTITY_SCHEMAS.FxRateSnapshot.properties!.effectiveAt as { format: string };
      expect(prop.format).toBe("date-time");
    });

    it("has additionalProperties: false", () => {
      expect(ENTITY_SCHEMAS.FxRateSnapshot.additionalProperties).toBe(false);
    });
  });

  describe("PayloadSummary", () => {
    it("is a free-form object with additionalProperties: true", () => {
      expect(ENTITY_SCHEMAS.PayloadSummary.type).toBe("object");
      expect(ENTITY_SCHEMAS.PayloadSummary.additionalProperties).toBe(true);
    });
  });
});

describe("Foundation entity schemas (OA-5)", () => {
  describe("Schema presence", () => {
    it("ENTITY_SCHEMAS includes all foundation entities", () => {
      expect(ENTITY_SCHEMAS).toHaveProperty("Organization");
      expect(ENTITY_SCHEMAS).toHaveProperty("TenantSettings");
      expect(ENTITY_SCHEMAS).toHaveProperty("TenantSettingsSelfHostedUpdateState");
      expect(ENTITY_SCHEMAS).toHaveProperty("User");
      expect(ENTITY_SCHEMAS).toHaveProperty("Team");
      expect(ENTITY_SCHEMAS).toHaveProperty("RoleDefinition");
      expect(ENTITY_SCHEMAS).toHaveProperty("Role");
      expect(ENTITY_SCHEMAS).toHaveProperty("PermissionGrant");
      expect(ENTITY_SCHEMAS).toHaveProperty("AuditEvent");
      expect(ENTITY_SCHEMAS).toHaveProperty("FileObject");
      expect(ENTITY_SCHEMAS).toHaveProperty("Comment");
      expect(ENTITY_SCHEMAS).toHaveProperty("Notification");
      expect(ENTITY_SCHEMAS).toHaveProperty("TranslationKey");
      expect(ENTITY_SCHEMAS).toHaveProperty("DomainEvent");
      expect(ENTITY_SCHEMAS).toHaveProperty("UserIdentity");
      expect(ENTITY_SCHEMAS).toHaveProperty("OrganizationMember");
      expect(ENTITY_SCHEMAS).toHaveProperty("TimelineEntry");
      expect(ENTITY_SCHEMAS).toHaveProperty("ApprovalRequest");
      expect(ENTITY_SCHEMAS).toHaveProperty("IdempotencyRecord");
    });
  });

  // ── Organization ────────────────────────────────────────────────────────────

  describe("Organization", () => {
    it("required includes id, legalName, displayName, slug, status, defaultLocale, defaultCurrency, defaultTimezone, country, provinceState, createdAt, updatedAt", () => {
      const req = ENTITY_SCHEMAS.Organization.required!;
      expect(req).toContain("id");
      expect(req).toContain("legalName");
      expect(req).toContain("displayName");
      expect(req).toContain("slug");
      expect(req).toContain("status");
      expect(req).toContain("defaultLocale");
      expect(req).toContain("defaultCurrency");
      expect(req).toContain("defaultTimezone");
      expect(req).toContain("country");
      expect(req).toContain("provinceState");
      expect(req).toContain("createdAt");
      expect(req).toContain("updatedAt");
    });

    it("status enum covers OrganizationStatus values", () => {
      const prop = ENTITY_SCHEMAS.Organization.properties!.status as {
        type: string;
        enum: string[];
      };
      expect(prop.enum).toEqual(["active", "suspended"]);
    });

    it("defaultLocale enum covers LocaleCode values", () => {
      const prop = ENTITY_SCHEMAS.Organization.properties!.defaultLocale as {
        type: string;
        enum: string[];
      };
      expect(prop.enum).toEqual(["en", "fr"]);
    });

    it("createdAt and updatedAt have format date-time", () => {
      const ca = ENTITY_SCHEMAS.Organization.properties!.createdAt as { format: string };
      const ua = ENTITY_SCHEMAS.Organization.properties!.updatedAt as { format: string };
      expect(ca.format).toBe("date-time");
      expect(ua.format).toBe("date-time");
    });

    it("has additionalProperties: false", () => {
      expect(ENTITY_SCHEMAS.Organization.additionalProperties).toBe(false);
    });

    it("appears in components.schemas", () => {
      const doc = buildOpenApiDocument();
      expect(doc.components.schemas.Organization).toEqual(ENTITY_SCHEMAS.Organization);
    });
  });

  // ── User ────────────────────────────────────────────────────────────────────

  describe("User", () => {
    it("required includes id, organizationId, email, displayName, preferredLocale, status, mfaState, createdAt, updatedAt", () => {
      const req = ENTITY_SCHEMAS.User.required!;
      expect(req).toContain("id");
      expect(req).toContain("organizationId");
      expect(req).toContain("email");
      expect(req).toContain("displayName");
      expect(req).toContain("preferredLocale");
      expect(req).toContain("status");
      expect(req).toContain("mfaState");
      expect(req).toContain("createdAt");
      expect(req).toContain("updatedAt");
    });

    it("status enum covers UserStatus values", () => {
      const prop = ENTITY_SCHEMAS.User.properties!.status as { type: string; enum: string[] };
      expect(prop.enum).toEqual(["invited", "active", "deactivated"]);
    });

    it("mfaState enum covers two states", () => {
      const prop = ENTITY_SCHEMAS.User.properties!.mfaState as { type: string; enum: string[] };
      expect(prop.enum).toContain("not_configured");
      expect(prop.enum).toContain("configured");
    });

    it("lastLoginAt is nullable with format date-time", () => {
      const prop = ENTITY_SCHEMAS.User.properties!.lastLoginAt as {
        type: unknown;
        format: string;
      };
      const types = Array.isArray(prop.type) ? prop.type : [prop.type];
      expect(types).toContain("null");
      expect(prop.format).toBe("date-time");
    });

    it("has additionalProperties: false", () => {
      expect(ENTITY_SCHEMAS.User.additionalProperties).toBe(false);
    });

    it("appears in components.schemas", () => {
      const doc = buildOpenApiDocument();
      expect(doc.components.schemas.User).toEqual(ENTITY_SCHEMAS.User);
    });
  });

  // ── Role ────────────────────────────────────────────────────────────────────

  describe("Role", () => {
    it("required includes id, organizationId, name, description, systemRole, status", () => {
      const req = ENTITY_SCHEMAS.Role.required!;
      expect(req).toContain("id");
      expect(req).toContain("organizationId");
      expect(req).toContain("name");
      expect(req).toContain("description");
      expect(req).toContain("systemRole");
      expect(req).toContain("status");
    });

    it("status enum covers active and inactive", () => {
      const prop = ENTITY_SCHEMAS.Role.properties!.status as { type: string; enum: string[] };
      expect(prop.enum).toEqual(["active", "inactive"]);
    });

    it("has additionalProperties: false", () => {
      expect(ENTITY_SCHEMAS.Role.additionalProperties).toBe(false);
    });

    it("appears in components.schemas", () => {
      const doc = buildOpenApiDocument();
      expect(doc.components.schemas.Role).toEqual(ENTITY_SCHEMAS.Role);
    });
  });

  // ── AuditEvent ──────────────────────────────────────────────────────────────

  describe("AuditEvent", () => {
    it("required includes id, organizationId, actorType, action, resourceType, resourceId, createdAt", () => {
      const req = ENTITY_SCHEMAS.AuditEvent.required!;
      expect(req).toContain("id");
      expect(req).toContain("organizationId");
      expect(req).toContain("actorType");
      expect(req).toContain("action");
      expect(req).toContain("resourceType");
      expect(req).toContain("resourceId");
      expect(req).toContain("createdAt");
    });

    it("actorType enum covers user, system, operator", () => {
      const prop = ENTITY_SCHEMAS.AuditEvent.properties!.actorType as {
        type: string;
        enum: string[];
      };
      expect(prop.enum).toEqual(["user", "system", "operator"]);
    });

    it("actorUserId, ipHash, userAgentHash are nullable", () => {
      const props = ENTITY_SCHEMAS.AuditEvent.properties!;
      for (const field of ["actorUserId", "ipHash", "userAgentHash"]) {
        const prop = props[field] as { type: unknown };
        const types = Array.isArray(prop.type) ? prop.type : [prop.type];
        expect(types, `${field} should be nullable`).toContain("null");
      }
    });

    it("beforeSummary and afterSummary use oneOf with null", () => {
      const bsProp = ENTITY_SCHEMAS.AuditEvent.properties!.beforeSummary as {
        oneOf: unknown[];
      };
      const asProp = ENTITY_SCHEMAS.AuditEvent.properties!.afterSummary as {
        oneOf: unknown[];
      };
      expect(bsProp.oneOf).toBeDefined();
      expect(bsProp.oneOf.length).toBe(2);
      expect(asProp.oneOf).toBeDefined();
      expect(asProp.oneOf.length).toBe(2);
    });

    it("has additionalProperties: false", () => {
      expect(ENTITY_SCHEMAS.AuditEvent.additionalProperties).toBe(false);
    });

    it("appears in components.schemas", () => {
      const doc = buildOpenApiDocument();
      expect(doc.components.schemas.AuditEvent).toEqual(ENTITY_SCHEMAS.AuditEvent);
    });
  });

  // ── ApprovalRequest ─────────────────────────────────────────────────────────

  describe("ApprovalRequest", () => {
    it("required includes id, organizationId, requesterUserIdentityId, subjectType, subjectId, reason, urgency, status, createdAt", () => {
      const req = ENTITY_SCHEMAS.ApprovalRequest.required!;
      expect(req).toContain("id");
      expect(req).toContain("organizationId");
      expect(req).toContain("requesterUserIdentityId");
      expect(req).toContain("subjectType");
      expect(req).toContain("subjectId");
      expect(req).toContain("reason");
      expect(req).toContain("urgency");
      expect(req).toContain("status");
      expect(req).toContain("createdAt");
    });

    it("urgency enum covers ApprovalUrgency values", () => {
      const prop = ENTITY_SCHEMAS.ApprovalRequest.properties!.urgency as {
        type: string;
        enum: string[];
      };
      expect(prop.enum).toEqual(["low", "normal", "high"]);
    });

    it("status enum covers ApprovalStatus values", () => {
      const prop = ENTITY_SCHEMAS.ApprovalRequest.properties!.status as {
        type: string;
        enum: string[];
      };
      expect(prop.enum).toEqual(["pending", "approved", "rejected", "escalated", "expired"]);
    });

    it("approverUserIdentityId, approverRoleId, decisionReason, decidedAt, expiresAt are nullable", () => {
      const props = ENTITY_SCHEMAS.ApprovalRequest.properties!;
      for (const field of [
        "approverUserIdentityId",
        "approverRoleId",
        "decisionReason",
        "decidedAt",
        "expiresAt"
      ]) {
        const prop = props[field] as { type: unknown };
        const types = Array.isArray(prop.type) ? prop.type : [prop.type];
        expect(types, `${field} should be nullable`).toContain("null");
      }
    });

    it("has additionalProperties: false", () => {
      expect(ENTITY_SCHEMAS.ApprovalRequest.additionalProperties).toBe(false);
    });

    it("appears in components.schemas", () => {
      const doc = buildOpenApiDocument();
      expect(doc.components.schemas.ApprovalRequest).toEqual(ENTITY_SCHEMAS.ApprovalRequest);
    });
  });

  // ── UserIdentity ─────────────────────────────────────────────────────────────

  describe("UserIdentity", () => {
    it("required includes id, email, displayName, preferredLocale, mfaState, status, actorType, createdAt, updatedAt", () => {
      const req = ENTITY_SCHEMAS.UserIdentity.required!;
      expect(req).toContain("id");
      expect(req).toContain("email");
      expect(req).toContain("displayName");
      expect(req).toContain("preferredLocale");
      expect(req).toContain("mfaState");
      expect(req).toContain("status");
      expect(req).toContain("actorType");
      expect(req).toContain("createdAt");
      expect(req).toContain("updatedAt");
    });

    it("mfaState enum covers MfaState values", () => {
      const prop = ENTITY_SCHEMAS.UserIdentity.properties!.mfaState as {
        type: string;
        enum: string[];
      };
      expect(prop.enum).toEqual(["not_configured", "passkey", "totp"]);
    });

    it("actorType enum covers ActorSource values", () => {
      const prop = ENTITY_SCHEMAS.UserIdentity.properties!.actorType as {
        type: string;
        enum: string[];
      };
      expect(prop.enum).toEqual(["human", "agent", "system"]);
    });

    it("lastLoginAt is nullable", () => {
      const prop = ENTITY_SCHEMAS.UserIdentity.properties!.lastLoginAt as { type: unknown };
      const types = Array.isArray(prop.type) ? prop.type : [prop.type];
      expect(types).toContain("null");
    });

    it("has additionalProperties: false", () => {
      expect(ENTITY_SCHEMAS.UserIdentity.additionalProperties).toBe(false);
    });
  });

  // ── Enum spot-checks ─────────────────────────────────────────────────────────

  describe("LocaleCode enum coverage", () => {
    it("Organization.defaultLocale enum matches LocaleCode", () => {
      const prop = ENTITY_SCHEMAS.Organization.properties!.defaultLocale as { enum: string[] };
      expect(prop.enum).toEqual(["en", "fr"]);
    });
    it("User.preferredLocale enum matches LocaleCode", () => {
      const prop = ENTITY_SCHEMAS.User.properties!.preferredLocale as { enum: string[] };
      expect(prop.enum).toEqual(["en", "fr"]);
    });
  });

  describe("OrganizationStatus enum coverage", () => {
    it("Organization.status enum matches OrganizationStatus", () => {
      const prop = ENTITY_SCHEMAS.Organization.properties!.status as { enum: string[] };
      expect(prop.enum).toEqual(["active", "suspended"]);
    });
  });

  describe("UserStatus enum coverage", () => {
    it("User.status enum matches UserStatus", () => {
      const prop = ENTITY_SCHEMAS.User.properties!.status as { enum: string[] };
      expect(prop.enum).toEqual(["invited", "active", "deactivated"]);
    });
  });

  describe("ApprovalStatus enum coverage", () => {
    it("ApprovalRequest.status enum matches ApprovalStatus", () => {
      const prop = ENTITY_SCHEMAS.ApprovalRequest.properties!.status as { enum: string[] };
      expect(prop.enum).toEqual(["pending", "approved", "rejected", "escalated", "expired"]);
    });
  });

  describe("ApprovalUrgency enum coverage", () => {
    it("ApprovalRequest.urgency enum matches ApprovalUrgency", () => {
      const prop = ENTITY_SCHEMAS.ApprovalRequest.properties!.urgency as { enum: string[] };
      expect(prop.enum).toEqual(["low", "normal", "high"]);
    });
  });

  describe("MfaState enum coverage", () => {
    it("UserIdentity.mfaState enum matches MfaState", () => {
      const prop = ENTITY_SCHEMAS.UserIdentity.properties!.mfaState as { enum: string[] };
      expect(prop.enum).toEqual(["not_configured", "passkey", "totp"]);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Project entity schemas
// ─────────────────────────────────────────────────────────────────────────────

describe("Project helper schemas (OA-5)", () => {
  describe("Schema presence", () => {
    it("ENTITY_SCHEMAS includes RateMoney and ProposalMoney", () => {
      expect(ENTITY_SCHEMAS).toHaveProperty("RateMoney");
      expect(ENTITY_SCHEMAS).toHaveProperty("ProposalMoney");
    });
  });

  describe("RateMoney", () => {
    it("required includes amountMinor, currency, scale", () => {
      const req = ENTITY_SCHEMAS.RateMoney.required!;
      expect(req).toContain("amountMinor");
      expect(req).toContain("currency");
      expect(req).toContain("scale");
    });
    it("has additionalProperties: false", () => {
      expect(ENTITY_SCHEMAS.RateMoney.additionalProperties).toBe(false);
    });
  });

  describe("ProposalMoney", () => {
    it("required includes amountMinor, currency, scale", () => {
      const req = ENTITY_SCHEMAS.ProposalMoney.required!;
      expect(req).toContain("amountMinor");
      expect(req).toContain("currency");
      expect(req).toContain("scale");
    });
    it("has additionalProperties: false", () => {
      expect(ENTITY_SCHEMAS.ProposalMoney.additionalProperties).toBe(false);
    });
  });
});

describe("Project entity schemas (OA-5)", () => {
  describe("Schema presence", () => {
    it("ENTITY_SCHEMAS includes all project entities + inputs + composite", () => {
      expect(ENTITY_SCHEMAS).toHaveProperty("Project");
      expect(ENTITY_SCHEMAS).toHaveProperty("CreateProjectInput");
      expect(ENTITY_SCHEMAS).toHaveProperty("UpdateProjectInput");
      expect(ENTITY_SCHEMAS).toHaveProperty("ProjectTask");
      expect(ENTITY_SCHEMAS).toHaveProperty("CreateProjectTaskInput");
      expect(ENTITY_SCHEMAS).toHaveProperty("UpdateProjectTaskInput");
      expect(ENTITY_SCHEMAS).toHaveProperty("TimeEntry");
      expect(ENTITY_SCHEMAS).toHaveProperty("CreateTimeEntryInput");
      expect(ENTITY_SCHEMAS).toHaveProperty("UpdateTimeEntryInput");
      expect(ENTITY_SCHEMAS).toHaveProperty("Rate");
      expect(ENTITY_SCHEMAS).toHaveProperty("CreateRateInput");
      expect(ENTITY_SCHEMAS).toHaveProperty("UpdateRateInput");
      expect(ENTITY_SCHEMAS).toHaveProperty("Assignment");
      expect(ENTITY_SCHEMAS).toHaveProperty("CreateAssignmentInput");
      expect(ENTITY_SCHEMAS).toHaveProperty("UpdateAssignmentInput");
      expect(ENTITY_SCHEMAS).toHaveProperty("InvoiceProposal");
      expect(ENTITY_SCHEMAS).toHaveProperty("InvoiceProposalLine");
      expect(ENTITY_SCHEMAS).toHaveProperty("InvoiceProposalWithLines");
      expect(ENTITY_SCHEMAS).toHaveProperty("CreateInvoiceProposalInput");
    });
  });

  // ── Project ──────────────────────────────────────────────────────────────────

  describe("Project", () => {
    it("required includes id, organizationId, name, status, createdAt, updatedAt", () => {
      const req = ENTITY_SCHEMAS.Project.required!;
      expect(req).toContain("id");
      expect(req).toContain("organizationId");
      expect(req).toContain("name");
      expect(req).toContain("status");
      expect(req).toContain("createdAt");
      expect(req).toContain("updatedAt");
    });

    it("status enum covers ProjectStatus values", () => {
      const prop = ENTITY_SCHEMAS.Project.properties!.status as { type: string; enum: string[] };
      expect(prop.enum).toEqual(["draft", "active", "on_hold", "completed", "cancelled"]);
    });

    it("description, code, companyId, ownerUserId, startDate, endDate are nullable", () => {
      const props = ENTITY_SCHEMAS.Project.properties!;
      for (const field of ["description", "code", "companyId", "ownerUserId", "startDate", "endDate"]) {
        const prop = props[field] as { type: unknown };
        const types = Array.isArray(prop.type) ? prop.type : [prop.type];
        expect(types, `${field} should be nullable`).toContain("null");
      }
    });

    it("createdAt and updatedAt have format date-time", () => {
      const ca = ENTITY_SCHEMAS.Project.properties!.createdAt as { format: string };
      const ua = ENTITY_SCHEMAS.Project.properties!.updatedAt as { format: string };
      expect(ca.format).toBe("date-time");
      expect(ua.format).toBe("date-time");
    });

    it("has additionalProperties: false", () => {
      expect(ENTITY_SCHEMAS.Project.additionalProperties).toBe(false);
    });

    it("appears in components.schemas", () => {
      const doc = buildOpenApiDocument();
      expect(doc.components.schemas.Project).toEqual(ENTITY_SCHEMAS.Project);
    });
  });

  describe("CreateProjectInput", () => {
    it("exists with required name", () => {
      const req = ENTITY_SCHEMAS.CreateProjectInput.required!;
      expect(req).toContain("name");
    });

    it("has additionalProperties: false", () => {
      expect(ENTITY_SCHEMAS.CreateProjectInput.additionalProperties).toBe(false);
    });
  });

  describe("UpdateProjectInput", () => {
    it("exists with no required fields", () => {
      expect(ENTITY_SCHEMAS.UpdateProjectInput.required).toHaveLength(0);
    });

    it("has additionalProperties: false", () => {
      expect(ENTITY_SCHEMAS.UpdateProjectInput.additionalProperties).toBe(false);
    });
  });

  // ── ProjectTask ──────────────────────────────────────────────────────────────

  describe("ProjectTask", () => {
    it("required includes id, organizationId, projectId, title, status, createdAt, updatedAt", () => {
      const req = ENTITY_SCHEMAS.ProjectTask.required!;
      expect(req).toContain("id");
      expect(req).toContain("organizationId");
      expect(req).toContain("projectId");
      expect(req).toContain("title");
      expect(req).toContain("status");
      expect(req).toContain("createdAt");
      expect(req).toContain("updatedAt");
    });

    it("status enum covers ProjectTaskStatus values", () => {
      const prop = ENTITY_SCHEMAS.ProjectTask.properties!.status as {
        type: string;
        enum: string[];
      };
      expect(prop.enum).toEqual(["todo", "in_progress", "blocked", "done", "cancelled"]);
    });

    it("description, assigneeUserId, dueDate, completedAt, parentTaskId are nullable", () => {
      const props = ENTITY_SCHEMAS.ProjectTask.properties!;
      for (const field of [
        "description",
        "assigneeUserId",
        "dueDate",
        "completedAt",
        "parentTaskId"
      ]) {
        const prop = props[field] as { type: unknown };
        const types = Array.isArray(prop.type) ? prop.type : [prop.type];
        expect(types, `${field} should be nullable`).toContain("null");
      }
    });

    it("has additionalProperties: false", () => {
      expect(ENTITY_SCHEMAS.ProjectTask.additionalProperties).toBe(false);
    });

    it("appears in components.schemas", () => {
      const doc = buildOpenApiDocument();
      expect(doc.components.schemas.ProjectTask).toEqual(ENTITY_SCHEMAS.ProjectTask);
    });
  });

  describe("CreateProjectTaskInput", () => {
    it("exists with required projectId and title", () => {
      const req = ENTITY_SCHEMAS.CreateProjectTaskInput.required!;
      expect(req).toContain("projectId");
      expect(req).toContain("title");
    });
  });

  describe("UpdateProjectTaskInput", () => {
    it("exists with no required fields", () => {
      expect(ENTITY_SCHEMAS.UpdateProjectTaskInput.required).toHaveLength(0);
    });
  });

  // ── TimeEntry ────────────────────────────────────────────────────────────────

  describe("TimeEntry", () => {
    it("required includes id, organizationId, projectId, userId, entryDate, minutes, billable, status, createdAt, updatedAt", () => {
      const req = ENTITY_SCHEMAS.TimeEntry.required!;
      expect(req).toContain("id");
      expect(req).toContain("organizationId");
      expect(req).toContain("projectId");
      expect(req).toContain("userId");
      expect(req).toContain("entryDate");
      expect(req).toContain("minutes");
      expect(req).toContain("billable");
      expect(req).toContain("status");
      expect(req).toContain("createdAt");
      expect(req).toContain("updatedAt");
    });

    it("status enum covers TimeEntryStatus values", () => {
      const prop = ENTITY_SCHEMAS.TimeEntry.properties!.status as {
        type: string;
        enum: string[];
      };
      expect(prop.enum).toEqual(["draft", "submitted", "approved", "rejected"]);
    });

    it("projectTaskId, description, approvalRequestId are nullable", () => {
      const props = ENTITY_SCHEMAS.TimeEntry.properties!;
      for (const field of ["projectTaskId", "description", "approvalRequestId"]) {
        const prop = props[field] as { type: unknown };
        const types = Array.isArray(prop.type) ? prop.type : [prop.type];
        expect(types, `${field} should be nullable`).toContain("null");
      }
    });

    it("has additionalProperties: false", () => {
      expect(ENTITY_SCHEMAS.TimeEntry.additionalProperties).toBe(false);
    });

    it("appears in components.schemas", () => {
      const doc = buildOpenApiDocument();
      expect(doc.components.schemas.TimeEntry).toEqual(ENTITY_SCHEMAS.TimeEntry);
    });
  });

  describe("CreateTimeEntryInput", () => {
    it("exists with required projectId, userId, entryDate, minutes", () => {
      const req = ENTITY_SCHEMAS.CreateTimeEntryInput.required!;
      expect(req).toContain("projectId");
      expect(req).toContain("userId");
      expect(req).toContain("entryDate");
      expect(req).toContain("minutes");
    });
  });

  describe("UpdateTimeEntryInput", () => {
    it("exists with no required fields", () => {
      expect(ENTITY_SCHEMAS.UpdateTimeEntryInput.required).toHaveLength(0);
    });
  });

  // ── Rate ─────────────────────────────────────────────────────────────────────

  describe("Rate", () => {
    it("required includes id, organizationId, name, amount, effectiveFrom, active, createdAt, updatedAt", () => {
      const req = ENTITY_SCHEMAS.Rate.required!;
      expect(req).toContain("id");
      expect(req).toContain("organizationId");
      expect(req).toContain("name");
      expect(req).toContain("amount");
      expect(req).toContain("effectiveFrom");
      expect(req).toContain("active");
      expect(req).toContain("createdAt");
      expect(req).toContain("updatedAt");
    });

    it("amount $ref points to RateMoney", () => {
      const prop = ENTITY_SCHEMAS.Rate.properties!.amount as { $ref: string };
      expect(prop.$ref).toBe("#/components/schemas/RateMoney");
    });

    it("effectiveTo is nullable", () => {
      const prop = ENTITY_SCHEMAS.Rate.properties!.effectiveTo as { type: unknown };
      const types = Array.isArray(prop.type) ? prop.type : [prop.type];
      expect(types).toContain("null");
    });

    it("has additionalProperties: false", () => {
      expect(ENTITY_SCHEMAS.Rate.additionalProperties).toBe(false);
    });

    it("appears in components.schemas", () => {
      const doc = buildOpenApiDocument();
      expect(doc.components.schemas.Rate).toEqual(ENTITY_SCHEMAS.Rate);
    });
  });

  describe("CreateRateInput", () => {
    it("exists with required name, amount, effectiveFrom", () => {
      const req = ENTITY_SCHEMAS.CreateRateInput.required!;
      expect(req).toContain("name");
      expect(req).toContain("amount");
      expect(req).toContain("effectiveFrom");
    });
  });

  describe("UpdateRateInput", () => {
    it("exists with no required fields", () => {
      expect(ENTITY_SCHEMAS.UpdateRateInput.required).toHaveLength(0);
    });
  });

  // ── Assignment ───────────────────────────────────────────────────────────────

  describe("Assignment", () => {
    it("required includes id, organizationId, projectId, userId, createdAt, updatedAt", () => {
      const req = ENTITY_SCHEMAS.Assignment.required!;
      expect(req).toContain("id");
      expect(req).toContain("organizationId");
      expect(req).toContain("projectId");
      expect(req).toContain("userId");
      expect(req).toContain("createdAt");
      expect(req).toContain("updatedAt");
    });

    it("roleLabel, allocationPercent, startDate, endDate, billableRateId are nullable", () => {
      const props = ENTITY_SCHEMAS.Assignment.properties!;
      for (const field of [
        "roleLabel",
        "allocationPercent",
        "startDate",
        "endDate",
        "billableRateId"
      ]) {
        const prop = props[field] as { type: unknown };
        const types = Array.isArray(prop.type) ? prop.type : [prop.type];
        expect(types, `${field} should be nullable`).toContain("null");
      }
    });

    it("has additionalProperties: false", () => {
      expect(ENTITY_SCHEMAS.Assignment.additionalProperties).toBe(false);
    });

    it("appears in components.schemas", () => {
      const doc = buildOpenApiDocument();
      expect(doc.components.schemas.Assignment).toEqual(ENTITY_SCHEMAS.Assignment);
    });
  });

  describe("CreateAssignmentInput", () => {
    it("exists with required projectId and userId", () => {
      const req = ENTITY_SCHEMAS.CreateAssignmentInput.required!;
      expect(req).toContain("projectId");
      expect(req).toContain("userId");
    });
  });

  describe("UpdateAssignmentInput", () => {
    it("exists with no required fields", () => {
      expect(ENTITY_SCHEMAS.UpdateAssignmentInput.required).toHaveLength(0);
    });
  });

  // ── InvoiceProposal ──────────────────────────────────────────────────────────

  describe("InvoiceProposal", () => {
    it("required includes id, organizationId, projectId, status, total, currency, createdAt, updatedAt", () => {
      const req = ENTITY_SCHEMAS.InvoiceProposal.required!;
      expect(req).toContain("id");
      expect(req).toContain("organizationId");
      expect(req).toContain("projectId");
      expect(req).toContain("status");
      expect(req).toContain("total");
      expect(req).toContain("currency");
      expect(req).toContain("createdAt");
      expect(req).toContain("updatedAt");
    });

    it("status enum covers InvoiceProposalStatus values", () => {
      const prop = ENTITY_SCHEMAS.InvoiceProposal.properties!.status as {
        type: string;
        enum: string[];
      };
      expect(prop.enum).toEqual(["draft", "submitted", "approved", "rejected"]);
    });

    it("companyId, periodStart, periodEnd, submittedAt are nullable", () => {
      const props = ENTITY_SCHEMAS.InvoiceProposal.properties!;
      for (const field of ["companyId", "periodStart", "periodEnd", "submittedAt"]) {
        const prop = props[field] as { type: unknown };
        const types = Array.isArray(prop.type) ? prop.type : [prop.type];
        expect(types, `${field} should be nullable`).toContain("null");
      }
    });

    it("total $ref points to ProposalMoney", () => {
      const prop = ENTITY_SCHEMAS.InvoiceProposal.properties!.total as { $ref: string };
      expect(prop.$ref).toBe("#/components/schemas/ProposalMoney");
    });

    it("has additionalProperties: false", () => {
      expect(ENTITY_SCHEMAS.InvoiceProposal.additionalProperties).toBe(false);
    });

    it("appears in components.schemas", () => {
      const doc = buildOpenApiDocument();
      expect(doc.components.schemas.InvoiceProposal).toEqual(ENTITY_SCHEMAS.InvoiceProposal);
    });
  });

  // ── InvoiceProposalWithLines (allOf composite) ───────────────────────────────

  describe("InvoiceProposalWithLines", () => {
    it("uses allOf of length 2", () => {
      const schema = ENTITY_SCHEMAS.InvoiceProposalWithLines as unknown as { allOf: unknown[] };
      expect(schema.allOf).toBeDefined();
      expect(schema.allOf.length).toBe(2);
    });

    it("first allOf entry is $ref to InvoiceProposal", () => {
      const schema = ENTITY_SCHEMAS.InvoiceProposalWithLines as unknown as {
        allOf: [{ $ref: string }, unknown];
      };
      expect(schema.allOf[0].$ref).toBe("#/components/schemas/InvoiceProposal");
    });

    it("second allOf entry has lines as required array of InvoiceProposalLine refs", () => {
      const schema = ENTITY_SCHEMAS.InvoiceProposalWithLines as unknown as {
        allOf: [
          unknown,
          {
            type: string;
            properties: { lines: { type: string; items: { $ref: string } } };
            required: string[];
          }
        ];
      };
      const ext = schema.allOf[1];
      expect(ext.properties.lines.type).toBe("array");
      expect(ext.properties.lines.items.$ref).toBe("#/components/schemas/InvoiceProposalLine");
      expect(ext.required).toContain("lines");
    });

    it("appears in components.schemas", () => {
      const doc = buildOpenApiDocument();
      expect(doc.components.schemas.InvoiceProposalWithLines).toEqual(
        ENTITY_SCHEMAS.InvoiceProposalWithLines
      );
    });
  });

  describe("CreateInvoiceProposalInput", () => {
    it("exists with required projectId", () => {
      const req = ENTITY_SCHEMAS.CreateInvoiceProposalInput.required!;
      expect(req).toContain("projectId");
    });

    it("has additionalProperties: false", () => {
      expect(ENTITY_SCHEMAS.CreateInvoiceProposalInput.additionalProperties).toBe(false);
    });
  });

  // ── Enum spot-checks ─────────────────────────────────────────────────────────

  describe("ProjectStatus enum coverage", () => {
    it("Project.status enum matches ProjectStatus", () => {
      const prop = ENTITY_SCHEMAS.Project.properties!.status as { enum: string[] };
      expect(prop.enum).toEqual(["draft", "active", "on_hold", "completed", "cancelled"]);
    });
  });

  describe("ProjectTaskStatus enum coverage", () => {
    it("ProjectTask.status enum matches ProjectTaskStatus", () => {
      const prop = ENTITY_SCHEMAS.ProjectTask.properties!.status as { enum: string[] };
      expect(prop.enum).toEqual(["todo", "in_progress", "blocked", "done", "cancelled"]);
    });
  });

  describe("TimeEntryStatus enum coverage", () => {
    it("TimeEntry.status enum matches TimeEntryStatus", () => {
      const prop = ENTITY_SCHEMAS.TimeEntry.properties!.status as { enum: string[] };
      expect(prop.enum).toEqual(["draft", "submitted", "approved", "rejected"]);
    });
  });

  describe("InvoiceProposalStatus enum coverage", () => {
    it("InvoiceProposal.status enum matches InvoiceProposalStatus", () => {
      const prop = ENTITY_SCHEMAS.InvoiceProposal.properties!.status as { enum: string[] };
      expect(prop.enum).toEqual(["draft", "submitted", "approved", "rejected"]);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Route contract $ref wiring — Foundation routes
// ─────────────────────────────────────────────────────────────────────────────

describe("Route contracts — $ref wiring for foundation routes (OA-5)", () => {
  it("GET /me 200 response schema is $ref to User", () => {
    const doc = buildOpenApiDocument();
    const schema =
      doc.paths["/me"]?.["get"]?.responses?.["200"]?.content?.["application/json"]?.schema;
    expect(schema).toEqual({ $ref: "#/components/schemas/User" });
  });

  it("GET /organizations/current 200 response schema is $ref to Organization", () => {
    const doc = buildOpenApiDocument();
    const schema =
      doc.paths["/organizations/current"]?.["get"]?.responses?.["200"]?.content?.[
        "application/json"
      ]?.schema;
    expect(schema).toEqual({ $ref: "#/components/schemas/Organization" });
  });

  it("GET /users 200 response schema is $ref to User", () => {
    const doc = buildOpenApiDocument();
    const schema =
      doc.paths["/users"]?.["get"]?.responses?.["200"]?.content?.["application/json"]?.schema;
    expect(schema).toEqual({ $ref: "#/components/schemas/User" });
  });

  it("PATCH /users/{id} 200 response schema is $ref to User", () => {
    const doc = buildOpenApiDocument();
    const schema =
      doc.paths["/users/{id}"]?.["patch"]?.responses?.["200"]?.content?.["application/json"]
        ?.schema;
    expect(schema).toEqual({ $ref: "#/components/schemas/User" });
  });

  it("GET /roles 200 response schema is $ref to Role", () => {
    const doc = buildOpenApiDocument();
    const schema =
      doc.paths["/roles"]?.["get"]?.responses?.["200"]?.content?.["application/json"]?.schema;
    expect(schema).toEqual({ $ref: "#/components/schemas/Role" });
  });

  it("POST /roles 201 response schema is $ref to Role", () => {
    const doc = buildOpenApiDocument();
    const schema =
      doc.paths["/roles"]?.["post"]?.responses?.["201"]?.content?.["application/json"]?.schema;
    expect(schema).toEqual({ $ref: "#/components/schemas/Role" });
  });

  it("GET /audit-events 200 response schema is $ref to AuditEvent", () => {
    const doc = buildOpenApiDocument();
    const schema =
      doc.paths["/audit-events"]?.["get"]?.responses?.["200"]?.content?.["application/json"]
        ?.schema;
    expect(schema).toEqual({ $ref: "#/components/schemas/AuditEvent" });
  });

  it("POST /files 201 response schema is $ref to FileObject", () => {
    const doc = buildOpenApiDocument();
    const schema =
      doc.paths["/files"]?.["post"]?.responses?.["201"]?.content?.["application/json"]?.schema;
    expect(schema).toEqual({ $ref: "#/components/schemas/FileObject" });
  });

  it("GET /files/{id} 200 response schema is $ref to FileObject", () => {
    const doc = buildOpenApiDocument();
    const schema =
      doc.paths["/files/{id}"]?.["get"]?.responses?.["200"]?.content?.["application/json"]?.schema;
    expect(schema).toEqual({ $ref: "#/components/schemas/FileObject" });
  });

  it("POST /comments 201 response schema is $ref to Comment", () => {
    const doc = buildOpenApiDocument();
    const schema =
      doc.paths["/comments"]?.["post"]?.responses?.["201"]?.content?.["application/json"]?.schema;
    expect(schema).toEqual({ $ref: "#/components/schemas/Comment" });
  });

  it("GET /notifications 200 response schema is $ref to Notification", () => {
    const doc = buildOpenApiDocument();
    const schema =
      doc.paths["/notifications"]?.["get"]?.responses?.["200"]?.content?.["application/json"]
        ?.schema;
    expect(schema).toEqual({ $ref: "#/components/schemas/Notification" });
  });

  it("PATCH /notifications/{id} 200 response schema is $ref to Notification", () => {
    const doc = buildOpenApiDocument();
    const schema =
      doc.paths["/notifications/{id}"]?.["patch"]?.responses?.["200"]?.content?.[
        "application/json"
      ]?.schema;
    expect(schema).toEqual({ $ref: "#/components/schemas/Notification" });
  });

  it("GET /permissions/effective 200 response schema is $ref to PermissionGrant", () => {
    const doc = buildOpenApiDocument();
    const schema =
      doc.paths["/permissions/effective"]?.["get"]?.responses?.["200"]?.content?.[
        "application/json"
      ]?.schema;
    expect(schema).toEqual({ $ref: "#/components/schemas/PermissionGrant" });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Route contract $ref wiring — Project routes
// ─────────────────────────────────────────────────────────────────────────────

describe("Route contracts — $ref wiring for project routes (OA-5)", () => {
  it("GET /project/projects 200 response schema is $ref to Project", () => {
    const doc = buildOpenApiDocument();
    const schema =
      doc.paths["/project/projects"]?.["get"]?.responses?.["200"]?.content?.["application/json"]
        ?.schema;
    expect(schema).toEqual({ $ref: "#/components/schemas/Project" });
  });

  it("POST /project/projects requestBody schema is $ref to CreateProjectInput", () => {
    const doc = buildOpenApiDocument();
    const schema =
      doc.paths["/project/projects"]?.["post"]?.requestBody?.content?.["application/json"]?.schema;
    expect(schema).toEqual({ $ref: "#/components/schemas/CreateProjectInput" });
  });

  it("POST /project/projects 201 response schema is $ref to Project", () => {
    const doc = buildOpenApiDocument();
    const schema =
      doc.paths["/project/projects"]?.["post"]?.responses?.["201"]?.content?.["application/json"]
        ?.schema;
    expect(schema).toEqual({ $ref: "#/components/schemas/Project" });
  });

  it("PATCH /project/projects/{id} requestBody schema is $ref to UpdateProjectInput", () => {
    const doc = buildOpenApiDocument();
    const schema =
      doc.paths["/project/projects/{id}"]?.["patch"]?.requestBody?.content?.["application/json"]
        ?.schema;
    expect(schema).toEqual({ $ref: "#/components/schemas/UpdateProjectInput" });
  });

  it("POST /project/tasks requestBody schema is $ref to CreateProjectTaskInput", () => {
    const doc = buildOpenApiDocument();
    const schema =
      doc.paths["/project/tasks"]?.["post"]?.requestBody?.content?.["application/json"]?.schema;
    expect(schema).toEqual({ $ref: "#/components/schemas/CreateProjectTaskInput" });
  });

  it("POST /project/tasks 201 response schema is $ref to ProjectTask", () => {
    const doc = buildOpenApiDocument();
    const schema =
      doc.paths["/project/tasks"]?.["post"]?.responses?.["201"]?.content?.["application/json"]
        ?.schema;
    expect(schema).toEqual({ $ref: "#/components/schemas/ProjectTask" });
  });

  it("GET /project/tasks/{id} 200 response schema is $ref to ProjectTask", () => {
    const doc = buildOpenApiDocument();
    const schema =
      doc.paths["/project/tasks/{id}"]?.["get"]?.responses?.["200"]?.content?.["application/json"]
        ?.schema;
    expect(schema).toEqual({ $ref: "#/components/schemas/ProjectTask" });
  });

  it("POST /project/time-entries requestBody schema is $ref to CreateTimeEntryInput", () => {
    const doc = buildOpenApiDocument();
    const schema =
      doc.paths["/project/time-entries"]?.["post"]?.requestBody?.content?.["application/json"]
        ?.schema;
    expect(schema).toEqual({ $ref: "#/components/schemas/CreateTimeEntryInput" });
  });

  it("POST /project/time-entries 201 response schema is $ref to TimeEntry", () => {
    const doc = buildOpenApiDocument();
    const schema =
      doc.paths["/project/time-entries"]?.["post"]?.responses?.["201"]?.content?.[
        "application/json"
      ]?.schema;
    expect(schema).toEqual({ $ref: "#/components/schemas/TimeEntry" });
  });

  it("POST /project/time-entries/{id}/submit 201 response schema is $ref to TimeEntry", () => {
    const doc = buildOpenApiDocument();
    const schema =
      doc.paths["/project/time-entries/{id}/submit"]?.["post"]?.responses?.["201"]?.content?.[
        "application/json"
      ]?.schema;
    expect(schema).toEqual({ $ref: "#/components/schemas/TimeEntry" });
  });

  it("POST /project/rates requestBody schema is $ref to CreateRateInput", () => {
    const doc = buildOpenApiDocument();
    const schema =
      doc.paths["/project/rates"]?.["post"]?.requestBody?.content?.["application/json"]?.schema;
    expect(schema).toEqual({ $ref: "#/components/schemas/CreateRateInput" });
  });

  it("POST /project/rates 201 response schema is $ref to Rate", () => {
    const doc = buildOpenApiDocument();
    const schema =
      doc.paths["/project/rates"]?.["post"]?.responses?.["201"]?.content?.["application/json"]
        ?.schema;
    expect(schema).toEqual({ $ref: "#/components/schemas/Rate" });
  });

  it("GET /project/rates/{id} 200 response schema is $ref to Rate", () => {
    const doc = buildOpenApiDocument();
    const schema =
      doc.paths["/project/rates/{id}"]?.["get"]?.responses?.["200"]?.content?.["application/json"]
        ?.schema;
    expect(schema).toEqual({ $ref: "#/components/schemas/Rate" });
  });

  it("POST /project/assignments requestBody schema is $ref to CreateAssignmentInput", () => {
    const doc = buildOpenApiDocument();
    const schema =
      doc.paths["/project/assignments"]?.["post"]?.requestBody?.content?.["application/json"]
        ?.schema;
    expect(schema).toEqual({ $ref: "#/components/schemas/CreateAssignmentInput" });
  });

  it("POST /project/assignments 201 response schema is $ref to Assignment", () => {
    const doc = buildOpenApiDocument();
    const schema =
      doc.paths["/project/assignments"]?.["post"]?.responses?.["201"]?.content?.[
        "application/json"
      ]?.schema;
    expect(schema).toEqual({ $ref: "#/components/schemas/Assignment" });
  });

  it("GET /project/invoice-proposals 200 response schema is $ref to InvoiceProposal", () => {
    const doc = buildOpenApiDocument();
    const schema =
      doc.paths["/project/invoice-proposals"]?.["get"]?.responses?.["200"]?.content?.[
        "application/json"
      ]?.schema;
    expect(schema).toEqual({ $ref: "#/components/schemas/InvoiceProposal" });
  });

  it("POST /project/invoice-proposals/generate requestBody schema is $ref to CreateInvoiceProposalInput", () => {
    const doc = buildOpenApiDocument();
    const schema =
      doc.paths["/project/invoice-proposals/generate"]?.["post"]?.requestBody?.content?.[
        "application/json"
      ]?.schema;
    expect(schema).toEqual({ $ref: "#/components/schemas/CreateInvoiceProposalInput" });
  });

  it("POST /project/invoice-proposals/generate 201 response schema is $ref to InvoiceProposalWithLines", () => {
    const doc = buildOpenApiDocument();
    const schema =
      doc.paths["/project/invoice-proposals/generate"]?.["post"]?.responses?.["201"]?.content?.[
        "application/json"
      ]?.schema;
    expect(schema).toEqual({ $ref: "#/components/schemas/InvoiceProposalWithLines" });
  });

  it("GET /project/invoice-proposals/{id} 200 response schema is $ref to InvoiceProposalWithLines", () => {
    const doc = buildOpenApiDocument();
    const schema =
      doc.paths["/project/invoice-proposals/{id}"]?.["get"]?.responses?.["200"]?.content?.[
        "application/json"
      ]?.schema;
    expect(schema).toEqual({ $ref: "#/components/schemas/InvoiceProposalWithLines" });
  });

  it("POST /project/invoice-proposals/{id}/submit 201 response schema is $ref to InvoiceProposal", () => {
    const doc = buildOpenApiDocument();
    const schema =
      doc.paths["/project/invoice-proposals/{id}/submit"]?.["post"]?.responses?.["201"]?.content?.[
        "application/json"
      ]?.schema;
    expect(schema).toEqual({ $ref: "#/components/schemas/InvoiceProposal" });
  });

  it("POST /project/invoice-proposals/{id}/approve 201 response schema is $ref to InvoiceProposal", () => {
    const doc = buildOpenApiDocument();
    const schema =
      doc.paths["/project/invoice-proposals/{id}/approve"]?.["post"]?.responses?.["201"]?.content?.[
        "application/json"
      ]?.schema;
    expect(schema).toEqual({ $ref: "#/components/schemas/InvoiceProposal" });
  });

  it("GET /project/timeline 200 response schema is $ref to TimelineEntry", () => {
    const doc = buildOpenApiDocument();
    const schema =
      doc.paths["/project/timeline"]?.["get"]?.responses?.["200"]?.content?.["application/json"]
        ?.schema;
    expect(schema).toEqual({ $ref: "#/components/schemas/TimelineEntry" });
  });

  // components.schemas equality spot-checks
  it("components.schemas.Project equals ENTITY_SCHEMAS.Project", () => {
    const doc = buildOpenApiDocument();
    expect(doc.components.schemas.Project).toEqual(ENTITY_SCHEMAS.Project);
  });

  it("components.schemas.InvoiceProposalWithLines equals ENTITY_SCHEMAS.InvoiceProposalWithLines", () => {
    const doc = buildOpenApiDocument();
    expect(doc.components.schemas.InvoiceProposalWithLines).toEqual(
      ENTITY_SCHEMAS.InvoiceProposalWithLines
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Route contract $ref wiring — Approval-requests routes
// ─────────────────────────────────────────────────────────────────────────────

describe("Route contracts — $ref wiring for approval-request routes (OA-5)", () => {
  it("POST /approval-requests 201 response schema is $ref to ApprovalRequest", () => {
    const doc = buildOpenApiDocument();
    const schema =
      doc.paths["/approval-requests"]?.["post"]?.responses?.["201"]?.content?.["application/json"]
        ?.schema;
    expect(schema).toEqual({ $ref: "#/components/schemas/ApprovalRequest" });
  });

  it("GET /approval-requests 200 response schema is $ref to ApprovalRequest", () => {
    const doc = buildOpenApiDocument();
    const schema =
      doc.paths["/approval-requests"]?.["get"]?.responses?.["200"]?.content?.["application/json"]
        ?.schema;
    expect(schema).toEqual({ $ref: "#/components/schemas/ApprovalRequest" });
  });

  it("GET /approval-requests/{id} 200 response schema is $ref to ApprovalRequest", () => {
    const doc = buildOpenApiDocument();
    const schema =
      doc.paths["/approval-requests/{id}"]?.["get"]?.responses?.["200"]?.content?.[
        "application/json"
      ]?.schema;
    expect(schema).toEqual({ $ref: "#/components/schemas/ApprovalRequest" });
  });

  it("PATCH /approval-requests/{id}/decide 200 response schema is $ref to ApprovalRequest", () => {
    const doc = buildOpenApiDocument();
    const schema =
      doc.paths["/approval-requests/{id}/decide"]?.["patch"]?.responses?.["200"]?.content?.[
        "application/json"
      ]?.schema;
    expect(schema).toEqual({ $ref: "#/components/schemas/ApprovalRequest" });
  });

  it("components.schemas.ApprovalRequest equals ENTITY_SCHEMAS.ApprovalRequest", () => {
    const doc = buildOpenApiDocument();
    expect(doc.components.schemas.ApprovalRequest).toEqual(ENTITY_SCHEMAS.ApprovalRequest);
  });
});
