import type {
  ProjectTask,
  ProjectTaskStatus,
  CreateProjectTaskInput,
  UpdateProjectTaskInput
} from "@sentropic/openerp-domain/project";

import type { Queryable, TenantContext } from "../db/client";
import { assertTenantContext } from "../db/client";

// Repository for the ProjectTask entity. Soft-delete is applied via deleted_at.
// The service layer wraps this with audit emission and timeline entries.

const TASK_RETURN_COLUMNS = `
  id,
  organization_id as "organizationId",
  project_id as "projectId",
  title,
  description,
  status,
  assignee_user_id as "assigneeUserId",
  due_date as "dueDate",
  completed_at as "completedAt",
  parent_task_id as "parentTaskId",
  created_at as "createdAt",
  updated_at as "updatedAt"
`;

export async function insertProjectTask(
  db: Queryable,
  context: TenantContext,
  input: CreateProjectTaskInput
): Promise<ProjectTask> {
  assertTenantContext(context);
  const result = await db.query<ProjectTask>(
    `insert into project_tasks (
       organization_id, project_id, title, description, status,
       assignee_user_id, due_date, parent_task_id
     ) values ($1, $2, $3, $4, $5, $6, $7, $8)
     returning ${TASK_RETURN_COLUMNS}`,
    [
      context.organizationId,
      input.projectId,
      input.title,
      input.description ?? null,
      input.status ?? "todo",
      input.assigneeUserId ?? null,
      input.dueDate ?? null,
      input.parentTaskId ?? null
    ]
  );
  return result.rows[0]!;
}

export async function findProjectTaskById(
  db: Queryable,
  context: TenantContext,
  id: string
): Promise<ProjectTask | null> {
  assertTenantContext(context);
  const result = await db.query<ProjectTask>(
    `select ${TASK_RETURN_COLUMNS}
       from project_tasks
      where id = $1 and organization_id = $2 and deleted_at is null`,
    [id, context.organizationId]
  );
  return result.rows[0] ?? null;
}

export async function listProjectTasks(
  db: Queryable,
  context: TenantContext,
  options: {
    limit?: number;
    offset?: number;
    projectId?: string;
    status?: ProjectTaskStatus;
  } = {}
): Promise<ProjectTask[]> {
  assertTenantContext(context);
  const limit = Math.min(Math.max(options.limit ?? 50, 1), 200);
  const offset = Math.max(options.offset ?? 0, 0);
  const filterStatus = options.status ?? null;
  const filterProjectId = options.projectId ?? null;
  const result = await db.query<ProjectTask>(
    `select ${TASK_RETURN_COLUMNS}
       from project_tasks
      where organization_id = $1
        and ($2::uuid is null or project_id = $2)
        and ($3::text is null or status = $3)
        and deleted_at is null
      order by created_at desc
      limit $4 offset $5`,
    [context.organizationId, filterProjectId, filterStatus, limit, offset]
  );
  return result.rows;
}

export async function updateProjectTask(
  db: Queryable,
  context: TenantContext,
  id: string,
  patch: UpdateProjectTaskInput & { _autoStampCompleted?: boolean }
): Promise<ProjectTask | null> {
  assertTenantContext(context);
  const sets: string[] = ["updated_at = now()"];
  const values: unknown[] = [id, context.organizationId];
  let i = values.length;
  const setColumn = (column: string, value: unknown) => {
    i += 1;
    sets.push(`${column} = $${i}`);
    values.push(value);
  };
  if (patch.title !== undefined) setColumn("title", patch.title);
  if (patch.description !== undefined) setColumn("description", patch.description);
  if (patch.status !== undefined) setColumn("status", patch.status);
  if (patch.assigneeUserId !== undefined) setColumn("assignee_user_id", patch.assigneeUserId);
  if (patch.dueDate !== undefined) setColumn("due_date", patch.dueDate);
  if (patch.parentTaskId !== undefined) setColumn("parent_task_id", patch.parentTaskId);
  // Auto-stamp completed_at when transitioning to done and not explicitly provided
  if (patch.completedAt !== undefined) {
    setColumn("completed_at", patch.completedAt);
  } else if (patch._autoStampCompleted) {
    setColumn("completed_at", new Date().toISOString());
  }

  const result = await db.query<ProjectTask>(
    `update project_tasks
        set ${sets.join(", ")}
      where id = $1 and organization_id = $2
      returning ${TASK_RETURN_COLUMNS}`,
    values
  );
  return result.rows[0] ?? null;
}

export async function softDeleteProjectTask(
  db: Queryable,
  context: TenantContext,
  id: string
): Promise<{ id: string } | null> {
  assertTenantContext(context);
  const result = await db.query<{ id: string }>(
    `update project_tasks
        set deleted_at = now(), updated_at = now()
      where id = $1 and organization_id = $2 and deleted_at is null
      returning id`,
    [id, context.organizationId]
  );
  return result.rows[0] ?? null;
}
