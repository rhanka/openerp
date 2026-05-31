// Workflow entity — automation module (shared-entities-v1 Article 4.5).
// A WorkflowDefinition binds one curated trigger (an audit event) to one
// curated action (create_notification / create_project_task / create_project).
// WorkflowRuns are recorded per execution — synchronous, best-effort, idempotent.

export interface WorkflowDefinition {
  id: string;
  organizationId: string;
  ownerUserId: string | null;
  name: string;
  description: string | null;
  triggerType: string;
  triggerConfig: Record<string, unknown>;
  actionType: string;
  actionConfig: Record<string, unknown>;
  isActive: boolean;
  isShared: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWorkflowDefinitionInput {
  ownerUserId?: string | null;
  name: string;
  description?: string | null;
  triggerType: string;
  triggerConfig?: Record<string, unknown>;
  actionType: string;
  actionConfig: Record<string, unknown>;
  isActive?: boolean;
  isShared?: boolean;
}

export interface UpdateWorkflowDefinitionInput {
  name?: string;
  description?: string | null;
  triggerConfig?: Record<string, unknown>;
  actionConfig?: Record<string, unknown>;
  isActive?: boolean;
  isShared?: boolean;
}

export interface WorkflowRun {
  id: string;
  organizationId: string;
  workflowDefinitionId: string;
  triggerAuditEventId: string | null;
  triggerEventType: string;
  triggerResourceType: string | null;
  triggerResourceId: string | null;
  triggeredBy: "event" | "manual";
  status: "completed" | "failed" | "skipped";
  createdResourceType: string | null;
  createdResourceId: string | null;
  actionResult: Record<string, unknown>;
  errorDetail: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

export const WORKFLOW_DOMAIN_EVENTS = [
  "workflow.workflow_definition.created",
  "workflow.workflow_definition.updated",
  "workflow.workflow_definition.deleted",
  "workflow.workflow_run.completed",
  "workflow.workflow_run.failed"
] as const;

export type WorkflowDomainEvent = (typeof WORKFLOW_DOMAIN_EVENTS)[number];
