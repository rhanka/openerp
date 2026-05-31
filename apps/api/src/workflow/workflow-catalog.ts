import type { Queryable, TenantContext } from "../db/client";
import { insertNotification } from "../foundation/notifications";
import { createProjectTask } from "../project/project-task-service";
import { createProject } from "../project/project-service";

// ---------------------------------------------------------------------------
// Workflow catalog — curated v1 trigger types and action types.
//
// TRIGGER_CATALOG: audit event types that can trigger a workflow.
// ACTION_CATALOG: actions a workflow can execute.
//
// Both catalogs are intentionally small and curated. Unknown types are rejected
// at workflow creation time with a 400 error.
// ---------------------------------------------------------------------------

export interface TriggerCatalogEntry {
  eventType: string;
  labelKey: string;
}

export const TRIGGER_CATALOG: TriggerCatalogEntry[] = [
  { eventType: "crm.opportunity.won", labelKey: "workflow.triggerType.crm_opportunity_won.label" },
  { eventType: "crm.lead.converted", labelKey: "workflow.triggerType.crm_lead_converted.label" },
  { eventType: "billing.invoice.issued", labelKey: "workflow.triggerType.billing_invoice_issued.label" },
  { eventType: "project.task.completed", labelKey: "workflow.triggerType.project_task_completed.label" }
];

export const TRIGGER_TYPE_SET = new Set(TRIGGER_CATALOG.map((t) => t.eventType));

// ---------------------------------------------------------------------------
// Action context — information about the triggering event passed to each action.
// ---------------------------------------------------------------------------

export interface WorkflowTriggerContext {
  eventType: string;
  resourceType: string | null;
  resourceId: string | null;
}

// ---------------------------------------------------------------------------
// Action execute return type
// ---------------------------------------------------------------------------

export interface ActionExecuteResult {
  createdResourceType: string | null;
  createdResourceId: string | null;
  result: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Action catalog entry
// ---------------------------------------------------------------------------

export interface ActionCatalogEntry {
  actionType: string;
  labelKey: string;
  /** Validates actionConfig and returns an error string if invalid, else null. */
  validateConfig(actionConfig: Record<string, unknown>): string | null;
  execute(
    db: Queryable,
    context: TenantContext,
    trigger: WorkflowTriggerContext,
    actionConfig: Record<string, unknown>
  ): Promise<ActionExecuteResult>;
}

export const ACTION_CATALOG: ActionCatalogEntry[] = [
  {
    actionType: "create_notification",
    labelKey: "workflow.actionType.create_notification.label",
    validateConfig(actionConfig) {
      if (typeof actionConfig.subjectKey !== "string" || !actionConfig.subjectKey.trim()) {
        return "create_notification: actionConfig.subjectKey is required (string)";
      }
      if (typeof actionConfig.bodyKey !== "string" || !actionConfig.bodyKey.trim()) {
        return "create_notification: actionConfig.bodyKey is required (string)";
      }
      return null;
    },
    async execute(db, context, trigger, actionConfig) {
      const recipientUserId =
        typeof actionConfig.recipientUserId === "string" && actionConfig.recipientUserId
          ? actionConfig.recipientUserId
          : context.actorUserId;
      const subjectKey = actionConfig.subjectKey as string;
      const bodyKey = actionConfig.bodyKey as string;
      const payload: Record<string, unknown> = {
        triggerEventType: trigger.eventType,
        triggerResourceType: trigger.resourceType,
        triggerResourceId: trigger.resourceId,
        ...(typeof actionConfig.extraPayload === "object" && actionConfig.extraPayload !== null
          ? (actionConfig.extraPayload as Record<string, unknown>)
          : {})
      };
      const notification = await insertNotification(db, context, {
        recipientUserId,
        channel: "in_app",
        subjectKey,
        bodyKey,
        payload
      });
      return {
        createdResourceType: "notification",
        createdResourceId: notification.id,
        result: { notificationId: notification.id, recipientUserId }
      };
    }
  },

  {
    actionType: "create_project_task",
    labelKey: "workflow.actionType.create_project_task.label",
    validateConfig(actionConfig) {
      if (typeof actionConfig.projectId !== "string" || !actionConfig.projectId.trim()) {
        return "create_project_task: actionConfig.projectId is required (string uuid)";
      }
      if (typeof actionConfig.titleTemplate !== "string" || !actionConfig.titleTemplate.trim()) {
        return "create_project_task: actionConfig.titleTemplate is required (string)";
      }
      return null;
    },
    async execute(db, context, trigger, actionConfig) {
      const projectId = actionConfig.projectId as string;
      const titleTemplate = actionConfig.titleTemplate as string;
      // Simple template substitution: replace {resourceId} with the trigger resource id
      const title = titleTemplate
        .replace("{resourceId}", trigger.resourceId ?? "")
        .replace("{eventType}", trigger.eventType);
      const task = await createProjectTask(db, context, {
        projectId,
        title
      });
      return {
        createdResourceType: "project_task",
        createdResourceId: task.id,
        result: { taskId: task.id, projectId, title }
      };
    }
  },

  {
    actionType: "create_project",
    labelKey: "workflow.actionType.create_project.label",
    validateConfig(actionConfig) {
      if (typeof actionConfig.nameTemplate !== "string" || !actionConfig.nameTemplate.trim()) {
        return "create_project: actionConfig.nameTemplate is required (string)";
      }
      return null;
    },
    async execute(db, context, trigger, actionConfig) {
      const nameTemplate = actionConfig.nameTemplate as string;
      const name = nameTemplate
        .replace("{resourceId}", trigger.resourceId ?? "")
        .replace("{eventType}", trigger.eventType);
      const companyId =
        typeof actionConfig.companyId === "string" && actionConfig.companyId
          ? actionConfig.companyId
          : null;
      const ownerUserId =
        typeof actionConfig.ownerUserId === "string" && actionConfig.ownerUserId
          ? actionConfig.ownerUserId
          : context.actorUserId;
      const project = await createProject(db, context, {
        name,
        companyId,
        ownerUserId
      });
      return {
        createdResourceType: "project",
        createdResourceId: project.id,
        result: { projectId: project.id, name }
      };
    }
  }
];

export const ACTION_TYPE_SET = new Set(ACTION_CATALOG.map((a) => a.actionType));

// ---------------------------------------------------------------------------
// Lookup helpers
// ---------------------------------------------------------------------------

export function getActionEntry(actionType: string): ActionCatalogEntry | undefined {
  return ACTION_CATALOG.find((a) => a.actionType === actionType);
}

export function getCatalogMetadata() {
  return {
    triggers: TRIGGER_CATALOG.map((t) => ({ eventType: t.eventType, labelKey: t.labelKey })),
    actions: ACTION_CATALOG.map((a) => ({ actionType: a.actionType, labelKey: a.labelKey }))
  };
}
