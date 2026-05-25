// Project entity — delivery module (project-time-to-invoice.md Article 4.3).
// Status aligns with the canonical state machine from the spec.

export type ProjectStatus = "draft" | "active" | "on_hold" | "completed" | "cancelled";

export interface Project {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  code: string | null;
  companyId: string | null;
  ownerUserId: string | null;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectInput {
  name: string;
  description?: string | null;
  code?: string | null;
  companyId?: string | null;
  ownerUserId?: string | null;
  startDate?: string | null;
  endDate?: string | null;
}

export interface UpdateProjectInput {
  name?: string;
  description?: string | null;
  status?: ProjectStatus;
  code?: string | null;
  companyId?: string | null;
  ownerUserId?: string | null;
  startDate?: string | null;
  endDate?: string | null;
}

export const PROJECT_DOMAIN_EVENTS = [
  "project.project.created",
  "project.project.updated",
  "project.project.deleted"
] as const;

export type ProjectDomainEvent = (typeof PROJECT_DOMAIN_EVENTS)[number];
