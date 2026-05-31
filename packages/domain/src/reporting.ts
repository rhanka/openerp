// Reporting entity — SavedView (shared-entities-v1 Article 4.5).
// A SavedView persists a per-resource filter/column/sort set, owner-scoped or org-shared.

export interface SavedView {
  id: string;
  organizationId: string;
  ownerUserId: string | null;
  resourceType: string;
  name: string;
  filters: Record<string, unknown>;
  columns: string[];
  sortBy: string | null;
  isShared: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSavedViewInput {
  ownerUserId?: string | null;
  resourceType: string;
  name: string;
  filters?: Record<string, unknown>;
  columns?: string[];
  sortBy?: string | null;
  isShared?: boolean;
}

export interface UpdateSavedViewInput {
  name?: string;
  filters?: Record<string, unknown>;
  columns?: string[];
  sortBy?: string | null;
  isShared?: boolean;
}

// ---------------------------------------------------------------------------
// ReportDefinition + ReportRun (DS 5.1 — Archetype A curated catalog).
// ---------------------------------------------------------------------------

export interface ReportColumn {
  key: string;
  labelKey: string;
  dataType: "string" | "number" | "money" | "date";
}

export interface ReportDefinition {
  id: string;
  organizationId: string;
  ownerUserId: string | null;
  reportType: string;
  name: string;
  parameters: Record<string, unknown>;
  isShared: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateReportDefinitionInput {
  ownerUserId?: string | null;
  reportType: string;
  name: string;
  parameters?: Record<string, unknown>;
  isShared?: boolean;
}

export interface UpdateReportDefinitionInput {
  name?: string;
  parameters?: Record<string, unknown>;
  isShared?: boolean;
}

export interface ReportRun {
  id: string;
  organizationId: string;
  reportDefinitionId: string;
  triggeredByUserId: string | null;
  status: "completed" | "failed";
  parametersSnapshot: Record<string, unknown>;
  resultColumns: ReportColumn[];
  resultRows: Record<string, unknown>[];
  rowCount: number;
  errorDetail: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Dashboard + DashboardWidget (DS 5.2 — Article 4.5).
// A Dashboard composes ReportDefinitions as ordered widgets. Rendering
// executes each widget's report live (transient, non-persisted).
// ---------------------------------------------------------------------------

export interface Dashboard {
  id: string;
  organizationId: string;
  ownerUserId: string | null;
  name: string;
  description: string | null;
  isShared: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDashboardInput {
  ownerUserId?: string | null;
  name: string;
  description?: string | null;
  isShared?: boolean;
}

export interface UpdateDashboardInput {
  name?: string;
  description?: string | null;
  isShared?: boolean;
}

export interface DashboardWidget {
  id: string;
  organizationId: string;
  dashboardId: string;
  reportDefinitionId: string;
  title: string | null;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDashboardWidgetInput {
  reportDefinitionId: string;
  title?: string | null;
  position?: number;
}

export interface UpdateDashboardWidgetInput {
  title?: string | null;
  position?: number;
}

// ---------------------------------------------------------------------------
// ScheduledDelivery + DeliveryRun (DS 5.3 — Article 4.5).
// A ScheduledDelivery targets a ReportDefinition on a cadence; firing
// executes the report once and persists a frozen ReportRun snapshot plus an
// audited DeliveryRun (in-app channel; recipients recorded).
// ---------------------------------------------------------------------------

export type ScheduledDeliveryCadence = "daily" | "weekly" | "monthly" | "quarterly" | "annual";

export interface ScheduledDelivery {
  id: string;
  organizationId: string;
  ownerUserId: string | null;
  name: string;
  targetType: "report_definition";
  targetId: string;
  cadence: ScheduledDeliveryCadence;
  timezone: string;
  nextRunAt: string;
  lastRunAt: string | null;
  channel: "in_app";
  recipientUserIds: string[];
  isShared: boolean;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateScheduledDeliveryInput {
  ownerUserId?: string | null;
  name: string;
  targetType: "report_definition";
  targetId: string;
  cadence: ScheduledDeliveryCadence;
  timezone?: string;
  recipientUserIds?: string[];
  isShared?: boolean;
  active?: boolean;
}

export interface UpdateScheduledDeliveryInput {
  name?: string;
  cadence?: ScheduledDeliveryCadence;
  timezone?: string;
  recipientUserIds?: string[];
  isShared?: boolean;
  active?: boolean;
  nextRunAt?: string;
}

export interface DeliveryRun {
  id: string;
  organizationId: string;
  scheduledDeliveryId: string;
  reportRunId: string | null;
  triggeredBy: "schedule" | "manual";
  status: "completed" | "failed" | "skipped";
  errorDetail: string | null;
  snapshotSummary: Record<string, unknown>;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

export const REPORTING_DOMAIN_EVENTS = [
  "reporting.saved_view.created",
  "reporting.saved_view.updated",
  "reporting.saved_view.deleted",
  "reporting.report_definition.created",
  "reporting.report_definition.updated",
  "reporting.report_definition.deleted",
  "reporting.report_run.completed",
  "reporting.report_run.failed",
  "reporting.dashboard.created",
  "reporting.dashboard.updated",
  "reporting.dashboard.deleted",
  "reporting.dashboard_widget.created",
  "reporting.dashboard_widget.updated",
  "reporting.dashboard_widget.deleted",
  "reporting.scheduled_delivery.created",
  "reporting.scheduled_delivery.updated",
  "reporting.scheduled_delivery.deleted",
  "reporting.delivery_run.completed",
  "reporting.delivery_run.failed"
] as const;

export type ReportingDomainEvent = (typeof REPORTING_DOMAIN_EVENTS)[number];
