import { describe, expect, it } from "vitest";

import { buildOpenApiDocument } from "../../src/http/openapi";
import { ENTITY_SCHEMAS } from "../../src/http/openapi-entity-schemas";

// OA-4: Reporting + Workflow + Webhook entity JSON Schema assertions — verifies
// presence and shape of all schemas added to ENTITY_SCHEMAS and wired into
// the OpenAPI document.

describe("Reporting entity schemas (OA-4)", () => {
  // ── Schema presence ────────────────────────────────────────────────────────

  describe("Schema presence", () => {
    it("ENTITY_SCHEMAS includes all reporting entities", () => {
      expect(ENTITY_SCHEMAS).toHaveProperty("ReportColumn");
      expect(ENTITY_SCHEMAS).toHaveProperty("SavedView");
      expect(ENTITY_SCHEMAS).toHaveProperty("CreateSavedViewInput");
      expect(ENTITY_SCHEMAS).toHaveProperty("UpdateSavedViewInput");
      expect(ENTITY_SCHEMAS).toHaveProperty("ReportDefinition");
      expect(ENTITY_SCHEMAS).toHaveProperty("CreateReportDefinitionInput");
      expect(ENTITY_SCHEMAS).toHaveProperty("UpdateReportDefinitionInput");
      expect(ENTITY_SCHEMAS).toHaveProperty("ReportRun");
      expect(ENTITY_SCHEMAS).toHaveProperty("Dashboard");
      expect(ENTITY_SCHEMAS).toHaveProperty("CreateDashboardInput");
      expect(ENTITY_SCHEMAS).toHaveProperty("UpdateDashboardInput");
      expect(ENTITY_SCHEMAS).toHaveProperty("DashboardWidget");
      expect(ENTITY_SCHEMAS).toHaveProperty("CreateDashboardWidgetInput");
      expect(ENTITY_SCHEMAS).toHaveProperty("UpdateDashboardWidgetInput");
      expect(ENTITY_SCHEMAS).toHaveProperty("ScheduledDelivery");
      expect(ENTITY_SCHEMAS).toHaveProperty("CreateScheduledDeliveryInput");
      expect(ENTITY_SCHEMAS).toHaveProperty("UpdateScheduledDeliveryInput");
      expect(ENTITY_SCHEMAS).toHaveProperty("DeliveryRun");
    });

    it("ENTITY_SCHEMAS includes all workflow entities", () => {
      expect(ENTITY_SCHEMAS).toHaveProperty("WorkflowDefinition");
      expect(ENTITY_SCHEMAS).toHaveProperty("CreateWorkflowDefinitionInput");
      expect(ENTITY_SCHEMAS).toHaveProperty("UpdateWorkflowDefinitionInput");
      expect(ENTITY_SCHEMAS).toHaveProperty("WorkflowRun");
    });

    it("ENTITY_SCHEMAS includes all webhook entities + helper + composite", () => {
      expect(ENTITY_SCHEMAS).toHaveProperty("WebhookEventTypeEntry");
      expect(ENTITY_SCHEMAS).toHaveProperty("WebhookEndpoint");
      expect(ENTITY_SCHEMAS).toHaveProperty("CreateWebhookEndpointResult");
      expect(ENTITY_SCHEMAS).toHaveProperty("CreateWebhookEndpointInput");
      expect(ENTITY_SCHEMAS).toHaveProperty("UpdateWebhookEndpointInput");
      expect(ENTITY_SCHEMAS).toHaveProperty("WebhookDelivery");
    });
  });

  // ── ReportColumn ───────────────────────────────────────────────────────────

  describe("ReportColumn", () => {
    it("has required key, labelKey, dataType", () => {
      const req = ENTITY_SCHEMAS.ReportColumn.required!;
      expect(req).toContain("key");
      expect(req).toContain("labelKey");
      expect(req).toContain("dataType");
    });

    it("dataType enum covers all four data types", () => {
      const prop = ENTITY_SCHEMAS.ReportColumn.properties!.dataType as {
        type: string;
        enum: string[];
      };
      expect(prop.enum).toEqual(["string", "number", "money", "date"]);
    });

    it("has additionalProperties: false", () => {
      expect(ENTITY_SCHEMAS.ReportColumn.additionalProperties).toBe(false);
    });
  });

  // ── SavedView ──────────────────────────────────────────────────────────────

  describe("SavedView", () => {
    it("required includes id, organizationId, resourceType, name, filters, columns, isShared, createdAt, updatedAt", () => {
      const req = ENTITY_SCHEMAS.SavedView.required!;
      expect(req).toContain("id");
      expect(req).toContain("organizationId");
      expect(req).toContain("resourceType");
      expect(req).toContain("name");
      expect(req).toContain("filters");
      expect(req).toContain("columns");
      expect(req).toContain("isShared");
      expect(req).toContain("createdAt");
      expect(req).toContain("updatedAt");
    });

    it("ownerUserId and sortBy are nullable", () => {
      const ownerProp = ENTITY_SCHEMAS.SavedView.properties!.ownerUserId as { type: unknown };
      const sortProp = ENTITY_SCHEMAS.SavedView.properties!.sortBy as { type: unknown };
      const ownerTypes = Array.isArray(ownerProp.type) ? ownerProp.type : [ownerProp.type];
      const sortTypes = Array.isArray(sortProp.type) ? sortProp.type : [sortProp.type];
      expect(ownerTypes).toContain("null");
      expect(sortTypes).toContain("null");
    });

    it("createdAt and updatedAt have format date-time", () => {
      const ca = ENTITY_SCHEMAS.SavedView.properties!.createdAt as { format: string };
      const ua = ENTITY_SCHEMAS.SavedView.properties!.updatedAt as { format: string };
      expect(ca.format).toBe("date-time");
      expect(ua.format).toBe("date-time");
    });

    it("has additionalProperties: false", () => {
      expect(ENTITY_SCHEMAS.SavedView.additionalProperties).toBe(false);
    });

    it("appears in components.schemas", () => {
      const doc = buildOpenApiDocument();
      expect(doc.components.schemas.SavedView).toEqual(ENTITY_SCHEMAS.SavedView);
    });
  });

  describe("CreateSavedViewInput", () => {
    it("exists with required resourceType and name", () => {
      const req = ENTITY_SCHEMAS.CreateSavedViewInput.required!;
      expect(req).toContain("resourceType");
      expect(req).toContain("name");
    });
  });

  describe("UpdateSavedViewInput", () => {
    it("exists with no required fields", () => {
      expect(ENTITY_SCHEMAS.UpdateSavedViewInput.required).toHaveLength(0);
    });
  });

  // ── ReportDefinition ───────────────────────────────────────────────────────

  describe("ReportDefinition", () => {
    it("required includes id, organizationId, reportType, name, parameters, isShared, createdAt, updatedAt", () => {
      const req = ENTITY_SCHEMAS.ReportDefinition.required!;
      expect(req).toContain("id");
      expect(req).toContain("organizationId");
      expect(req).toContain("reportType");
      expect(req).toContain("name");
      expect(req).toContain("parameters");
      expect(req).toContain("isShared");
      expect(req).toContain("createdAt");
      expect(req).toContain("updatedAt");
    });

    it("ownerUserId is nullable", () => {
      const prop = ENTITY_SCHEMAS.ReportDefinition.properties!.ownerUserId as { type: unknown };
      const types = Array.isArray(prop.type) ? prop.type : [prop.type];
      expect(types).toContain("null");
    });

    it("has additionalProperties: false", () => {
      expect(ENTITY_SCHEMAS.ReportDefinition.additionalProperties).toBe(false);
    });

    it("appears in components.schemas", () => {
      const doc = buildOpenApiDocument();
      expect(doc.components.schemas.ReportDefinition).toEqual(ENTITY_SCHEMAS.ReportDefinition);
    });
  });

  describe("CreateReportDefinitionInput", () => {
    it("exists with required reportType and name", () => {
      const req = ENTITY_SCHEMAS.CreateReportDefinitionInput.required!;
      expect(req).toContain("reportType");
      expect(req).toContain("name");
    });
  });

  describe("UpdateReportDefinitionInput", () => {
    it("exists with no required fields", () => {
      expect(ENTITY_SCHEMAS.UpdateReportDefinitionInput.required).toHaveLength(0);
    });
  });

  // ── ReportRun ─────────────────────────────────────────────────────────────

  describe("ReportRun", () => {
    it("required includes id, organizationId, reportDefinitionId, status, parametersSnapshot, resultColumns, resultRows, rowCount, createdAt", () => {
      const req = ENTITY_SCHEMAS.ReportRun.required!;
      expect(req).toContain("id");
      expect(req).toContain("organizationId");
      expect(req).toContain("reportDefinitionId");
      expect(req).toContain("status");
      expect(req).toContain("parametersSnapshot");
      expect(req).toContain("resultColumns");
      expect(req).toContain("resultRows");
      expect(req).toContain("rowCount");
      expect(req).toContain("createdAt");
    });

    it("status enum covers completed and failed", () => {
      const prop = ENTITY_SCHEMAS.ReportRun.properties!.status as { enum: string[] };
      expect(prop.enum).toEqual(["completed", "failed"]);
    });

    it("resultColumns items $ref ReportColumn", () => {
      const prop = ENTITY_SCHEMAS.ReportRun.properties!.resultColumns as {
        type: string;
        items: { $ref: string };
      };
      expect(prop.items.$ref).toBe("#/components/schemas/ReportColumn");
    });

    it("errorDetail, startedAt, completedAt are nullable", () => {
      const errProp = ENTITY_SCHEMAS.ReportRun.properties!.errorDetail as { type: unknown };
      const startProp = ENTITY_SCHEMAS.ReportRun.properties!.startedAt as { type: unknown };
      const endProp = ENTITY_SCHEMAS.ReportRun.properties!.completedAt as { type: unknown };
      const errTypes = Array.isArray(errProp.type) ? errProp.type : [errProp.type];
      const startTypes = Array.isArray(startProp.type) ? startProp.type : [startProp.type];
      const endTypes = Array.isArray(endProp.type) ? endProp.type : [endProp.type];
      expect(errTypes).toContain("null");
      expect(startTypes).toContain("null");
      expect(endTypes).toContain("null");
    });

    it("has additionalProperties: false", () => {
      expect(ENTITY_SCHEMAS.ReportRun.additionalProperties).toBe(false);
    });
  });

  // ── Dashboard ─────────────────────────────────────────────────────────────

  describe("Dashboard", () => {
    it("required includes id, organizationId, name, isShared, createdAt, updatedAt", () => {
      const req = ENTITY_SCHEMAS.Dashboard.required!;
      expect(req).toContain("id");
      expect(req).toContain("organizationId");
      expect(req).toContain("name");
      expect(req).toContain("isShared");
      expect(req).toContain("createdAt");
      expect(req).toContain("updatedAt");
    });

    it("ownerUserId and description are nullable", () => {
      const ownerProp = ENTITY_SCHEMAS.Dashboard.properties!.ownerUserId as { type: unknown };
      const descProp = ENTITY_SCHEMAS.Dashboard.properties!.description as { type: unknown };
      const ownerTypes = Array.isArray(ownerProp.type) ? ownerProp.type : [ownerProp.type];
      const descTypes = Array.isArray(descProp.type) ? descProp.type : [descProp.type];
      expect(ownerTypes).toContain("null");
      expect(descTypes).toContain("null");
    });

    it("has additionalProperties: false", () => {
      expect(ENTITY_SCHEMAS.Dashboard.additionalProperties).toBe(false);
    });

    it("appears in components.schemas", () => {
      const doc = buildOpenApiDocument();
      expect(doc.components.schemas.Dashboard).toEqual(ENTITY_SCHEMAS.Dashboard);
    });
  });

  describe("DashboardWidget", () => {
    it("required includes id, organizationId, dashboardId, reportDefinitionId, position, createdAt, updatedAt", () => {
      const req = ENTITY_SCHEMAS.DashboardWidget.required!;
      expect(req).toContain("id");
      expect(req).toContain("organizationId");
      expect(req).toContain("dashboardId");
      expect(req).toContain("reportDefinitionId");
      expect(req).toContain("position");
      expect(req).toContain("createdAt");
      expect(req).toContain("updatedAt");
    });

    it("title is nullable", () => {
      const prop = ENTITY_SCHEMAS.DashboardWidget.properties!.title as { type: unknown };
      const types = Array.isArray(prop.type) ? prop.type : [prop.type];
      expect(types).toContain("null");
    });

    it("position is integer typed", () => {
      const prop = ENTITY_SCHEMAS.DashboardWidget.properties!.position as { type: string };
      expect(prop.type).toBe("integer");
    });

    it("has additionalProperties: false", () => {
      expect(ENTITY_SCHEMAS.DashboardWidget.additionalProperties).toBe(false);
    });
  });

  // ── ScheduledDelivery ─────────────────────────────────────────────────────

  describe("ScheduledDelivery", () => {
    it("required includes id, organizationId, name, targetType, targetId, cadence, timezone, nextRunAt, channel, recipientUserIds, isShared, active, createdAt, updatedAt", () => {
      const req = ENTITY_SCHEMAS.ScheduledDelivery.required!;
      expect(req).toContain("id");
      expect(req).toContain("organizationId");
      expect(req).toContain("name");
      expect(req).toContain("targetType");
      expect(req).toContain("targetId");
      expect(req).toContain("cadence");
      expect(req).toContain("timezone");
      expect(req).toContain("nextRunAt");
      expect(req).toContain("channel");
      expect(req).toContain("recipientUserIds");
      expect(req).toContain("isShared");
      expect(req).toContain("active");
      expect(req).toContain("createdAt");
      expect(req).toContain("updatedAt");
    });

    it("cadence enum covers ScheduledDeliveryCadence values", () => {
      const prop = ENTITY_SCHEMAS.ScheduledDelivery.properties!.cadence as {
        type: string;
        enum: string[];
      };
      expect(prop.enum).toEqual(["daily", "weekly", "monthly", "quarterly", "annual"]);
    });

    it("lastRunAt is nullable with date-time format", () => {
      const prop = ENTITY_SCHEMAS.ScheduledDelivery.properties!.lastRunAt as {
        type: unknown;
        format: string;
      };
      const types = Array.isArray(prop.type) ? prop.type : [prop.type];
      expect(types).toContain("null");
      expect(prop.format).toBe("date-time");
    });

    it("has additionalProperties: false", () => {
      expect(ENTITY_SCHEMAS.ScheduledDelivery.additionalProperties).toBe(false);
    });

    it("appears in components.schemas", () => {
      const doc = buildOpenApiDocument();
      expect(doc.components.schemas.ScheduledDelivery).toEqual(ENTITY_SCHEMAS.ScheduledDelivery);
    });
  });

  describe("CreateScheduledDeliveryInput", () => {
    it("exists with required name, targetType, targetId, cadence", () => {
      const req = ENTITY_SCHEMAS.CreateScheduledDeliveryInput.required!;
      expect(req).toContain("name");
      expect(req).toContain("targetType");
      expect(req).toContain("targetId");
      expect(req).toContain("cadence");
    });
  });

  describe("UpdateScheduledDeliveryInput", () => {
    it("exists with no required fields", () => {
      expect(ENTITY_SCHEMAS.UpdateScheduledDeliveryInput.required).toHaveLength(0);
    });
  });

  // ── DeliveryRun ───────────────────────────────────────────────────────────

  describe("DeliveryRun", () => {
    it("required includes id, organizationId, scheduledDeliveryId, triggeredBy, status, snapshotSummary, createdAt", () => {
      const req = ENTITY_SCHEMAS.DeliveryRun.required!;
      expect(req).toContain("id");
      expect(req).toContain("organizationId");
      expect(req).toContain("scheduledDeliveryId");
      expect(req).toContain("triggeredBy");
      expect(req).toContain("status");
      expect(req).toContain("snapshotSummary");
      expect(req).toContain("createdAt");
    });

    it("triggeredBy enum covers schedule and manual", () => {
      const prop = ENTITY_SCHEMAS.DeliveryRun.properties!.triggeredBy as { enum: string[] };
      expect(prop.enum).toEqual(["schedule", "manual"]);
    });

    it("status enum covers completed, failed, skipped", () => {
      const prop = ENTITY_SCHEMAS.DeliveryRun.properties!.status as { enum: string[] };
      expect(prop.enum).toEqual(["completed", "failed", "skipped"]);
    });

    it("reportRunId, errorDetail, startedAt, completedAt are nullable", () => {
      const rrProp = ENTITY_SCHEMAS.DeliveryRun.properties!.reportRunId as { type: unknown };
      const errProp = ENTITY_SCHEMAS.DeliveryRun.properties!.errorDetail as { type: unknown };
      const startProp = ENTITY_SCHEMAS.DeliveryRun.properties!.startedAt as { type: unknown };
      const endProp = ENTITY_SCHEMAS.DeliveryRun.properties!.completedAt as { type: unknown };
      const rrTypes = Array.isArray(rrProp.type) ? rrProp.type : [rrProp.type];
      const errTypes = Array.isArray(errProp.type) ? errProp.type : [errProp.type];
      const startTypes = Array.isArray(startProp.type) ? startProp.type : [startProp.type];
      const endTypes = Array.isArray(endProp.type) ? endProp.type : [endProp.type];
      expect(rrTypes).toContain("null");
      expect(errTypes).toContain("null");
      expect(startTypes).toContain("null");
      expect(endTypes).toContain("null");
    });

    it("has additionalProperties: false", () => {
      expect(ENTITY_SCHEMAS.DeliveryRun.additionalProperties).toBe(false);
    });
  });
});

describe("Workflow entity schemas (OA-4)", () => {
  // ── WorkflowDefinition ────────────────────────────────────────────────────

  describe("WorkflowDefinition", () => {
    it("required includes id, organizationId, name, triggerType, triggerConfig, actionType, actionConfig, isActive, isShared, createdAt, updatedAt", () => {
      const req = ENTITY_SCHEMAS.WorkflowDefinition.required!;
      expect(req).toContain("id");
      expect(req).toContain("organizationId");
      expect(req).toContain("name");
      expect(req).toContain("triggerType");
      expect(req).toContain("triggerConfig");
      expect(req).toContain("actionType");
      expect(req).toContain("actionConfig");
      expect(req).toContain("isActive");
      expect(req).toContain("isShared");
      expect(req).toContain("createdAt");
      expect(req).toContain("updatedAt");
    });

    it("ownerUserId and description are nullable", () => {
      const ownerProp = ENTITY_SCHEMAS.WorkflowDefinition.properties!.ownerUserId as {
        type: unknown;
      };
      const descProp = ENTITY_SCHEMAS.WorkflowDefinition.properties!.description as {
        type: unknown;
      };
      const ownerTypes = Array.isArray(ownerProp.type) ? ownerProp.type : [ownerProp.type];
      const descTypes = Array.isArray(descProp.type) ? descProp.type : [descProp.type];
      expect(ownerTypes).toContain("null");
      expect(descTypes).toContain("null");
    });

    it("has additionalProperties: false", () => {
      expect(ENTITY_SCHEMAS.WorkflowDefinition.additionalProperties).toBe(false);
    });

    it("appears in components.schemas", () => {
      const doc = buildOpenApiDocument();
      expect(doc.components.schemas.WorkflowDefinition).toEqual(
        ENTITY_SCHEMAS.WorkflowDefinition
      );
    });
  });

  describe("CreateWorkflowDefinitionInput", () => {
    it("exists with required name, triggerType, actionType, actionConfig", () => {
      const req = ENTITY_SCHEMAS.CreateWorkflowDefinitionInput.required!;
      expect(req).toContain("name");
      expect(req).toContain("triggerType");
      expect(req).toContain("actionType");
      expect(req).toContain("actionConfig");
    });
  });

  describe("UpdateWorkflowDefinitionInput", () => {
    it("exists with no required fields", () => {
      expect(ENTITY_SCHEMAS.UpdateWorkflowDefinitionInput.required).toHaveLength(0);
    });
  });

  // ── WorkflowRun ───────────────────────────────────────────────────────────

  describe("WorkflowRun", () => {
    it("required includes id, organizationId, workflowDefinitionId, triggerEventType, triggeredBy, status, actionResult, createdAt", () => {
      const req = ENTITY_SCHEMAS.WorkflowRun.required!;
      expect(req).toContain("id");
      expect(req).toContain("organizationId");
      expect(req).toContain("workflowDefinitionId");
      expect(req).toContain("triggerEventType");
      expect(req).toContain("triggeredBy");
      expect(req).toContain("status");
      expect(req).toContain("actionResult");
      expect(req).toContain("createdAt");
    });

    it("triggeredBy enum covers event and manual", () => {
      const prop = ENTITY_SCHEMAS.WorkflowRun.properties!.triggeredBy as { enum: string[] };
      expect(prop.enum).toEqual(["event", "manual"]);
    });

    it("status enum covers completed, failed, skipped", () => {
      const prop = ENTITY_SCHEMAS.WorkflowRun.properties!.status as { enum: string[] };
      expect(prop.enum).toEqual(["completed", "failed", "skipped"]);
    });

    it("triggerAuditEventId, triggerResourceType, triggerResourceId, createdResourceType, createdResourceId, errorDetail, startedAt, completedAt are nullable", () => {
      const props = ENTITY_SCHEMAS.WorkflowRun.properties!;
      const nullableFields = [
        "triggerAuditEventId",
        "triggerResourceType",
        "triggerResourceId",
        "createdResourceType",
        "createdResourceId",
        "errorDetail",
        "startedAt",
        "completedAt"
      ];
      for (const field of nullableFields) {
        const prop = props[field] as { type: unknown };
        const types = Array.isArray(prop.type) ? prop.type : [prop.type];
        expect(types, `${field} should be nullable`).toContain("null");
      }
    });

    it("has additionalProperties: false", () => {
      expect(ENTITY_SCHEMAS.WorkflowRun.additionalProperties).toBe(false);
    });

    it("appears in components.schemas", () => {
      const doc = buildOpenApiDocument();
      expect(doc.components.schemas.WorkflowRun).toEqual(ENTITY_SCHEMAS.WorkflowRun);
    });
  });
});

describe("Webhook entity schemas (OA-4)", () => {
  // ── WebhookEventTypeEntry ─────────────────────────────────────────────────

  describe("WebhookEventTypeEntry", () => {
    it("exists with required eventType and labelKey", () => {
      const req = ENTITY_SCHEMAS.WebhookEventTypeEntry.required!;
      expect(req).toContain("eventType");
      expect(req).toContain("labelKey");
    });

    it("has additionalProperties: false", () => {
      expect(ENTITY_SCHEMAS.WebhookEventTypeEntry.additionalProperties).toBe(false);
    });
  });

  // ── WebhookEndpoint ───────────────────────────────────────────────────────

  describe("WebhookEndpoint", () => {
    it("required includes id, organizationId, name, targetUrl, eventTypes, isActive, isShared, consecutiveFailures, createdAt, updatedAt", () => {
      const req = ENTITY_SCHEMAS.WebhookEndpoint.required!;
      expect(req).toContain("id");
      expect(req).toContain("organizationId");
      expect(req).toContain("name");
      expect(req).toContain("targetUrl");
      expect(req).toContain("eventTypes");
      expect(req).toContain("isActive");
      expect(req).toContain("isShared");
      expect(req).toContain("consecutiveFailures");
      expect(req).toContain("createdAt");
      expect(req).toContain("updatedAt");
    });

    it("ownerUserId and disabledAt are nullable", () => {
      const ownerProp = ENTITY_SCHEMAS.WebhookEndpoint.properties!.ownerUserId as {
        type: unknown;
      };
      const disabledProp = ENTITY_SCHEMAS.WebhookEndpoint.properties!.disabledAt as {
        type: unknown;
      };
      const ownerTypes = Array.isArray(ownerProp.type) ? ownerProp.type : [ownerProp.type];
      const disabledTypes = Array.isArray(disabledProp.type)
        ? disabledProp.type
        : [disabledProp.type];
      expect(ownerTypes).toContain("null");
      expect(disabledTypes).toContain("null");
    });

    it("consecutiveFailures is integer typed", () => {
      const prop = ENTITY_SCHEMAS.WebhookEndpoint.properties!.consecutiveFailures as {
        type: string;
      };
      expect(prop.type).toBe("integer");
    });

    it("has additionalProperties: false", () => {
      expect(ENTITY_SCHEMAS.WebhookEndpoint.additionalProperties).toBe(false);
    });

    it("appears in components.schemas", () => {
      const doc = buildOpenApiDocument();
      expect(doc.components.schemas.WebhookEndpoint).toEqual(ENTITY_SCHEMAS.WebhookEndpoint);
    });
  });

  // ── CreateWebhookEndpointResult (allOf composite) ─────────────────────────

  describe("CreateWebhookEndpointResult", () => {
    it("uses allOf of length 2", () => {
      const schema = ENTITY_SCHEMAS.CreateWebhookEndpointResult as { allOf: unknown[] };
      expect(schema.allOf).toBeDefined();
      expect(schema.allOf.length).toBe(2);
    });

    it("first allOf entry is $ref to WebhookEndpoint", () => {
      const schema = ENTITY_SCHEMAS.CreateWebhookEndpointResult as unknown as {
        allOf: [{ $ref: string }, unknown];
      };
      expect(schema.allOf[0].$ref).toBe("#/components/schemas/WebhookEndpoint");
    });

    it("second allOf entry has signingSecret as required string", () => {
      const schema = ENTITY_SCHEMAS.CreateWebhookEndpointResult as unknown as {
        allOf: [
          unknown,
          { type: string; properties: { signingSecret: { type: string } }; required: string[] }
        ];
      };
      const ext = schema.allOf[1];
      expect(ext.properties.signingSecret.type).toBe("string");
      expect(ext.required).toContain("signingSecret");
    });

    it("appears in components.schemas", () => {
      const doc = buildOpenApiDocument();
      expect(doc.components.schemas.CreateWebhookEndpointResult).toEqual(
        ENTITY_SCHEMAS.CreateWebhookEndpointResult
      );
    });
  });

  describe("CreateWebhookEndpointInput", () => {
    it("exists with required name, targetUrl, eventTypes", () => {
      const req = ENTITY_SCHEMAS.CreateWebhookEndpointInput.required!;
      expect(req).toContain("name");
      expect(req).toContain("targetUrl");
      expect(req).toContain("eventTypes");
    });
  });

  describe("UpdateWebhookEndpointInput", () => {
    it("exists with no required fields", () => {
      expect(ENTITY_SCHEMAS.UpdateWebhookEndpointInput.required).toHaveLength(0);
    });
  });

  // ── WebhookDelivery ───────────────────────────────────────────────────────

  describe("WebhookDelivery", () => {
    it("required includes id, organizationId, webhookEndpointId, eventType, payload, signature, status, attemptCount, signedAt, createdAt", () => {
      const req = ENTITY_SCHEMAS.WebhookDelivery.required!;
      expect(req).toContain("id");
      expect(req).toContain("organizationId");
      expect(req).toContain("webhookEndpointId");
      expect(req).toContain("eventType");
      expect(req).toContain("payload");
      expect(req).toContain("signature");
      expect(req).toContain("status");
      expect(req).toContain("attemptCount");
      expect(req).toContain("signedAt");
      expect(req).toContain("createdAt");
    });

    it("status enum covers WebhookDeliveryStatus values", () => {
      const prop = ENTITY_SCHEMAS.WebhookDelivery.properties!.status as {
        type: string;
        enum: string[];
      };
      expect(prop.enum).toEqual(["pending_egress", "succeeded", "failed"]);
    });

    it("triggerAuditEventId, httpStatus, nextRetryAt, errorDetail, deliveredAt are nullable", () => {
      const props = ENTITY_SCHEMAS.WebhookDelivery.properties!;
      const nullableFields = [
        "triggerAuditEventId",
        "nextRetryAt",
        "errorDetail",
        "deliveredAt"
      ];
      for (const field of nullableFields) {
        const prop = props[field] as { type: unknown };
        const types = Array.isArray(prop.type) ? prop.type : [prop.type];
        expect(types, `${field} should be nullable`).toContain("null");
      }
      // httpStatus is nullable integer
      const httpProp = props.httpStatus as { type: unknown };
      const httpTypes = Array.isArray(httpProp.type) ? httpProp.type : [httpProp.type];
      expect(httpTypes).toContain("null");
    });

    it("signedAt has format date-time", () => {
      const prop = ENTITY_SCHEMAS.WebhookDelivery.properties!.signedAt as { format: string };
      expect(prop.format).toBe("date-time");
    });

    it("has additionalProperties: false", () => {
      expect(ENTITY_SCHEMAS.WebhookDelivery.additionalProperties).toBe(false);
    });

    it("appears in components.schemas", () => {
      const doc = buildOpenApiDocument();
      expect(doc.components.schemas.WebhookDelivery).toEqual(ENTITY_SCHEMAS.WebhookDelivery);
    });
  });
});

// ── Route contract $ref wiring ────────────────────────────────────────────────

describe("Route contracts — $ref wiring in OpenAPI document (OA-4)", () => {
  // SavedViews
  it("GET /reporting/saved-views 200 response schema is $ref to SavedView", () => {
    const doc = buildOpenApiDocument();
    const schema =
      doc.paths["/reporting/saved-views"]?.["get"]?.responses?.["200"]?.content?.[
        "application/json"
      ]?.schema;
    expect(schema).toEqual({ $ref: "#/components/schemas/SavedView" });
  });

  it("POST /reporting/saved-views requestBody schema is $ref to CreateSavedViewInput", () => {
    const doc = buildOpenApiDocument();
    const schema =
      doc.paths["/reporting/saved-views"]?.["post"]?.requestBody?.content?.["application/json"]
        ?.schema;
    expect(schema).toEqual({ $ref: "#/components/schemas/CreateSavedViewInput" });
  });

  it("POST /reporting/saved-views 201 response schema is $ref to SavedView", () => {
    const doc = buildOpenApiDocument();
    const schema =
      doc.paths["/reporting/saved-views"]?.["post"]?.responses?.["201"]?.content?.[
        "application/json"
      ]?.schema;
    expect(schema).toEqual({ $ref: "#/components/schemas/SavedView" });
  });

  it("PATCH /reporting/saved-views/{id} requestBody schema is $ref to UpdateSavedViewInput", () => {
    const doc = buildOpenApiDocument();
    const schema =
      doc.paths["/reporting/saved-views/{id}"]?.["patch"]?.requestBody?.content?.[
        "application/json"
      ]?.schema;
    expect(schema).toEqual({ $ref: "#/components/schemas/UpdateSavedViewInput" });
  });

  // ReportDefinition
  it("POST /reporting/report-definitions requestBody schema is $ref to CreateReportDefinitionInput", () => {
    const doc = buildOpenApiDocument();
    const schema =
      doc.paths["/reporting/report-definitions"]?.["post"]?.requestBody?.content?.[
        "application/json"
      ]?.schema;
    expect(schema).toEqual({ $ref: "#/components/schemas/CreateReportDefinitionInput" });
  });

  it("POST /reporting/report-definitions 201 response schema is $ref to ReportDefinition", () => {
    const doc = buildOpenApiDocument();
    const schema =
      doc.paths["/reporting/report-definitions"]?.["post"]?.responses?.["201"]?.content?.[
        "application/json"
      ]?.schema;
    expect(schema).toEqual({ $ref: "#/components/schemas/ReportDefinition" });
  });

  it("GET /reporting/report-definitions/{id} 200 response schema is $ref to ReportDefinition", () => {
    const doc = buildOpenApiDocument();
    const schema =
      doc.paths["/reporting/report-definitions/{id}"]?.["get"]?.responses?.["200"]?.content?.[
        "application/json"
      ]?.schema;
    expect(schema).toEqual({ $ref: "#/components/schemas/ReportDefinition" });
  });

  it("POST /reporting/report-definitions/{id}/run 201 response schema is $ref to ReportRun", () => {
    const doc = buildOpenApiDocument();
    const schema =
      doc.paths["/reporting/report-definitions/{id}/run"]?.["post"]?.responses?.["201"]?.content?.[
        "application/json"
      ]?.schema;
    expect(schema).toEqual({ $ref: "#/components/schemas/ReportRun" });
  });

  // Dashboard
  it("POST /reporting/dashboards requestBody schema is $ref to CreateDashboardInput", () => {
    const doc = buildOpenApiDocument();
    const schema =
      doc.paths["/reporting/dashboards"]?.["post"]?.requestBody?.content?.["application/json"]
        ?.schema;
    expect(schema).toEqual({ $ref: "#/components/schemas/CreateDashboardInput" });
  });

  it("POST /reporting/dashboards 201 response schema is $ref to Dashboard", () => {
    const doc = buildOpenApiDocument();
    const schema =
      doc.paths["/reporting/dashboards"]?.["post"]?.responses?.["201"]?.content?.[
        "application/json"
      ]?.schema;
    expect(schema).toEqual({ $ref: "#/components/schemas/Dashboard" });
  });

  it("POST /reporting/dashboards/{id}/widgets 201 response schema is $ref to DashboardWidget", () => {
    const doc = buildOpenApiDocument();
    const schema =
      doc.paths["/reporting/dashboards/{id}/widgets"]?.["post"]?.responses?.["201"]?.content?.[
        "application/json"
      ]?.schema;
    expect(schema).toEqual({ $ref: "#/components/schemas/DashboardWidget" });
  });

  // ScheduledDelivery
  it("POST /reporting/scheduled-deliveries requestBody schema is $ref to CreateScheduledDeliveryInput", () => {
    const doc = buildOpenApiDocument();
    const schema =
      doc.paths["/reporting/scheduled-deliveries"]?.["post"]?.requestBody?.content?.[
        "application/json"
      ]?.schema;
    expect(schema).toEqual({ $ref: "#/components/schemas/CreateScheduledDeliveryInput" });
  });

  it("POST /reporting/scheduled-deliveries/{id}/run 201 response schema is $ref to DeliveryRun", () => {
    const doc = buildOpenApiDocument();
    const schema =
      doc.paths["/reporting/scheduled-deliveries/{id}/run"]?.["post"]?.responses?.["201"]
        ?.content?.["application/json"]?.schema;
    expect(schema).toEqual({ $ref: "#/components/schemas/DeliveryRun" });
  });

  it("GET /reporting/delivery-runs/{id} 200 response schema is $ref to DeliveryRun", () => {
    const doc = buildOpenApiDocument();
    const schema =
      doc.paths["/reporting/delivery-runs/{id}"]?.["get"]?.responses?.["200"]?.content?.[
        "application/json"
      ]?.schema;
    expect(schema).toEqual({ $ref: "#/components/schemas/DeliveryRun" });
  });

  // Workflow
  it("POST /workflows requestBody schema is $ref to CreateWorkflowDefinitionInput", () => {
    const doc = buildOpenApiDocument();
    const schema =
      doc.paths["/workflows"]?.["post"]?.requestBody?.content?.["application/json"]?.schema;
    expect(schema).toEqual({ $ref: "#/components/schemas/CreateWorkflowDefinitionInput" });
  });

  it("POST /workflows 201 response schema is $ref to WorkflowDefinition", () => {
    const doc = buildOpenApiDocument();
    const schema =
      doc.paths["/workflows"]?.["post"]?.responses?.["201"]?.content?.["application/json"]?.schema;
    expect(schema).toEqual({ $ref: "#/components/schemas/WorkflowDefinition" });
  });

  it("GET /workflows/{id} 200 response schema is $ref to WorkflowDefinition", () => {
    const doc = buildOpenApiDocument();
    const schema =
      doc.paths["/workflows/{id}"]?.["get"]?.responses?.["200"]?.content?.["application/json"]
        ?.schema;
    expect(schema).toEqual({ $ref: "#/components/schemas/WorkflowDefinition" });
  });

  it("POST /workflows/{id}/run 201 response schema is $ref to WorkflowRun", () => {
    const doc = buildOpenApiDocument();
    const schema =
      doc.paths["/workflows/{id}/run"]?.["post"]?.responses?.["201"]?.content?.["application/json"]
        ?.schema;
    expect(schema).toEqual({ $ref: "#/components/schemas/WorkflowRun" });
  });

  it("GET /workflows/{id}/runs 200 response schema is $ref to WorkflowRun", () => {
    const doc = buildOpenApiDocument();
    const schema =
      doc.paths["/workflows/{id}/runs"]?.["get"]?.responses?.["200"]?.content?.["application/json"]
        ?.schema;
    expect(schema).toEqual({ $ref: "#/components/schemas/WorkflowRun" });
  });

  // Webhook
  it("GET /webhook/event-types 200 response schema is $ref to WebhookEventTypeEntry", () => {
    const doc = buildOpenApiDocument();
    const schema =
      doc.paths["/webhook/event-types"]?.["get"]?.responses?.["200"]?.content?.[
        "application/json"
      ]?.schema;
    expect(schema).toEqual({ $ref: "#/components/schemas/WebhookEventTypeEntry" });
  });

  it("POST /webhook/endpoints requestBody schema is $ref to CreateWebhookEndpointInput", () => {
    const doc = buildOpenApiDocument();
    const schema =
      doc.paths["/webhook/endpoints"]?.["post"]?.requestBody?.content?.["application/json"]
        ?.schema;
    expect(schema).toEqual({ $ref: "#/components/schemas/CreateWebhookEndpointInput" });
  });

  it("POST /webhook/endpoints 201 response schema is $ref to CreateWebhookEndpointResult", () => {
    const doc = buildOpenApiDocument();
    const schema =
      doc.paths["/webhook/endpoints"]?.["post"]?.responses?.["201"]?.content?.["application/json"]
        ?.schema;
    expect(schema).toEqual({ $ref: "#/components/schemas/CreateWebhookEndpointResult" });
  });

  it("GET /webhook/endpoints/{id} 200 response schema is $ref to WebhookEndpoint", () => {
    const doc = buildOpenApiDocument();
    const schema =
      doc.paths["/webhook/endpoints/{id}"]?.["get"]?.responses?.["200"]?.content?.[
        "application/json"
      ]?.schema;
    expect(schema).toEqual({ $ref: "#/components/schemas/WebhookEndpoint" });
  });

  it("PATCH /webhook/endpoints/{id} requestBody schema is $ref to UpdateWebhookEndpointInput", () => {
    const doc = buildOpenApiDocument();
    const schema =
      doc.paths["/webhook/endpoints/{id}"]?.["patch"]?.requestBody?.content?.["application/json"]
        ?.schema;
    expect(schema).toEqual({ $ref: "#/components/schemas/UpdateWebhookEndpointInput" });
  });

  it("POST /webhook/endpoints/{id}/rotate-secret 201 response schema is $ref to CreateWebhookEndpointResult", () => {
    const doc = buildOpenApiDocument();
    const schema =
      doc.paths["/webhook/endpoints/{id}/rotate-secret"]?.["post"]?.responses?.["201"]?.content?.[
        "application/json"
      ]?.schema;
    expect(schema).toEqual({ $ref: "#/components/schemas/CreateWebhookEndpointResult" });
  });

  it("POST /webhook/endpoints/{id}/test 201 response schema is $ref to WebhookDelivery", () => {
    const doc = buildOpenApiDocument();
    const schema =
      doc.paths["/webhook/endpoints/{id}/test"]?.["post"]?.responses?.["201"]?.content?.[
        "application/json"
      ]?.schema;
    expect(schema).toEqual({ $ref: "#/components/schemas/WebhookDelivery" });
  });

  it("GET /webhook/endpoints/{id}/deliveries 200 response schema is $ref to WebhookDelivery", () => {
    const doc = buildOpenApiDocument();
    const schema =
      doc.paths["/webhook/endpoints/{id}/deliveries"]?.["get"]?.responses?.["200"]?.content?.[
        "application/json"
      ]?.schema;
    expect(schema).toEqual({ $ref: "#/components/schemas/WebhookDelivery" });
  });

  it("GET /webhook/deliveries/{id} 200 response schema is $ref to WebhookDelivery", () => {
    const doc = buildOpenApiDocument();
    const schema =
      doc.paths["/webhook/deliveries/{id}"]?.["get"]?.responses?.["200"]?.content?.[
        "application/json"
      ]?.schema;
    expect(schema).toEqual({ $ref: "#/components/schemas/WebhookDelivery" });
  });

  // components.schemas equality spot-checks
  it("components.schemas.WorkflowDefinition equals ENTITY_SCHEMAS.WorkflowDefinition", () => {
    const doc = buildOpenApiDocument();
    expect(doc.components.schemas.WorkflowDefinition).toEqual(ENTITY_SCHEMAS.WorkflowDefinition);
  });

  it("components.schemas.WebhookEndpoint equals ENTITY_SCHEMAS.WebhookEndpoint", () => {
    const doc = buildOpenApiDocument();
    expect(doc.components.schemas.WebhookEndpoint).toEqual(ENTITY_SCHEMAS.WebhookEndpoint);
  });

  it("components.schemas.WebhookDelivery equals ENTITY_SCHEMAS.WebhookDelivery", () => {
    const doc = buildOpenApiDocument();
    expect(doc.components.schemas.WebhookDelivery).toEqual(ENTITY_SCHEMAS.WebhookDelivery);
  });

  it("components.schemas.CreateWebhookEndpointResult equals ENTITY_SCHEMAS.CreateWebhookEndpointResult", () => {
    const doc = buildOpenApiDocument();
    expect(doc.components.schemas.CreateWebhookEndpointResult).toEqual(
      ENTITY_SCHEMAS.CreateWebhookEndpointResult
    );
  });
});
