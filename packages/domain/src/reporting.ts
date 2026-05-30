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
  "reporting.dashboard_widget.deleted"
] as const;

export type ReportingDomainEvent = (typeof REPORTING_DOMAIN_EVENTS)[number];
