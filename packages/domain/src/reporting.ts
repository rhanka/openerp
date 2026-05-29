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

export const REPORTING_DOMAIN_EVENTS = [
  "reporting.saved_view.created",
  "reporting.saved_view.updated",
  "reporting.saved_view.deleted"
] as const;

export type ReportingDomainEvent = (typeof REPORTING_DOMAIN_EVENTS)[number];
