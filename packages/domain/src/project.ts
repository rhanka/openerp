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
  "project.project.deleted",
  "project.task.created",
  "project.task.updated",
  "project.task.completed",
  "project.task.deleted",
  "project.time_entry.created",
  "project.time_entry.updated",
  "project.time_entry.submitted",
  "project.time_entry.approved",
  "project.time_entry.deleted"
] as const;

export type ProjectDomainEvent = (typeof PROJECT_DOMAIN_EVENTS)[number];

// ---------------------------------------------------------------------------
// ProjectTask — DS 3.1
// ---------------------------------------------------------------------------

export type ProjectTaskStatus = "todo" | "in_progress" | "blocked" | "done" | "cancelled";

export interface ProjectTask {
  id: string;
  organizationId: string;
  projectId: string;
  title: string;
  description: string | null;
  status: ProjectTaskStatus;
  assigneeUserId: string | null;
  dueDate: string | null;
  completedAt: string | null;
  parentTaskId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectTaskInput {
  projectId: string;
  title: string;
  description?: string | null;
  status?: ProjectTaskStatus;
  assigneeUserId?: string | null;
  dueDate?: string | null;
  parentTaskId?: string | null;
}

export interface UpdateProjectTaskInput {
  title?: string;
  description?: string | null;
  status?: ProjectTaskStatus;
  assigneeUserId?: string | null;
  dueDate?: string | null;
  completedAt?: string | null;
  parentTaskId?: string | null;
}

// ---------------------------------------------------------------------------
// TimeEntry — DS 3.2
// ---------------------------------------------------------------------------

export type TimeEntryStatus = "draft" | "submitted" | "approved" | "rejected";

export interface TimeEntry {
  id: string;
  organizationId: string;
  projectId: string;
  projectTaskId: string | null;
  userId: string;
  entryDate: string;
  minutes: number;
  description: string | null;
  billable: boolean;
  status: TimeEntryStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTimeEntryInput {
  projectId: string;
  userId: string;
  entryDate: string;
  minutes: number;
  projectTaskId?: string | null;
  description?: string | null;
  billable?: boolean;
  status?: TimeEntryStatus;
}

export interface UpdateTimeEntryInput {
  projectTaskId?: string | null;
  entryDate?: string;
  minutes?: number;
  description?: string | null;
  billable?: boolean;
  status?: TimeEntryStatus;
}
