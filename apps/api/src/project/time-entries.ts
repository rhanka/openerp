import type {
  TimeEntry,
  TimeEntryStatus,
  CreateTimeEntryInput,
  UpdateTimeEntryInput
} from "@sentropic/openerp-domain/project";

import type { Queryable, TenantContext } from "../db/client";
import { assertTenantContext } from "../db/client";

// Repository for the TimeEntry entity. Soft-delete is applied via deleted_at.
// The service layer wraps this with audit emission and timeline entries.

const ENTRY_RETURN_COLUMNS = `
  id,
  organization_id as "organizationId",
  project_id as "projectId",
  project_task_id as "projectTaskId",
  user_id as "userId",
  to_char(entry_date, 'YYYY-MM-DD') as "entryDate",
  minutes,
  description,
  billable,
  status,
  approval_request_id as "approvalRequestId",
  to_char(created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "createdAt",
  to_char(updated_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "updatedAt"
`;

export async function insertTimeEntry(
  db: Queryable,
  context: TenantContext,
  input: CreateTimeEntryInput
): Promise<TimeEntry> {
  assertTenantContext(context);
  const result = await db.query<TimeEntry>(
    `insert into time_entries (
       organization_id, project_id, project_task_id, user_id,
       entry_date, minutes, description, billable, status
     ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     returning ${ENTRY_RETURN_COLUMNS}`,
    [
      context.organizationId,
      input.projectId,
      input.projectTaskId ?? null,
      input.userId,
      input.entryDate,
      input.minutes,
      input.description ?? null,
      input.billable ?? true,
      input.status ?? "draft"
    ]
  );
  return result.rows[0]!;
}

export async function findTimeEntryById(
  db: Queryable,
  context: TenantContext,
  id: string
): Promise<TimeEntry | null> {
  assertTenantContext(context);
  const result = await db.query<TimeEntry>(
    `select ${ENTRY_RETURN_COLUMNS}
       from time_entries
      where id = $1 and organization_id = $2 and deleted_at is null`,
    [id, context.organizationId]
  );
  return result.rows[0] ?? null;
}

export async function listTimeEntries(
  db: Queryable,
  context: TenantContext,
  options: {
    limit?: number;
    offset?: number;
    projectId?: string;
    projectTaskId?: string;
    userId?: string;
    status?: TimeEntryStatus;
    billable?: boolean;
  } = {}
): Promise<TimeEntry[]> {
  assertTenantContext(context);
  const limit = Math.min(Math.max(options.limit ?? 50, 1), 200);
  const offset = Math.max(options.offset ?? 0, 0);
  const filterProjectId = options.projectId ?? null;
  const filterProjectTaskId = options.projectTaskId ?? null;
  const filterUserId = options.userId ?? null;
  const filterStatus = options.status ?? null;
  const filterBillable = options.billable ?? null;
  const result = await db.query<TimeEntry>(
    `select ${ENTRY_RETURN_COLUMNS}
       from time_entries
      where organization_id = $1
        and ($2::uuid is null or project_id = $2)
        and ($3::uuid is null or project_task_id = $3)
        and ($4::uuid is null or user_id = $4)
        and ($5::text is null or status = $5)
        and ($6::boolean is null or billable = $6)
        and deleted_at is null
      order by entry_date desc, created_at desc
      limit $7 offset $8`,
    [
      context.organizationId,
      filterProjectId,
      filterProjectTaskId,
      filterUserId,
      filterStatus,
      filterBillable,
      limit,
      offset
    ]
  );
  return result.rows;
}

export async function updateTimeEntry(
  db: Queryable,
  context: TenantContext,
  id: string,
  patch: UpdateTimeEntryInput
): Promise<TimeEntry | null> {
  assertTenantContext(context);
  const sets: string[] = ["updated_at = now()"];
  const values: unknown[] = [id, context.organizationId];
  let i = values.length;
  const setColumn = (column: string, value: unknown) => {
    i += 1;
    sets.push(`${column} = $${i}`);
    values.push(value);
  };
  if (patch.projectTaskId !== undefined) setColumn("project_task_id", patch.projectTaskId);
  if (patch.entryDate !== undefined) setColumn("entry_date", patch.entryDate);
  if (patch.minutes !== undefined) setColumn("minutes", patch.minutes);
  if (patch.description !== undefined) setColumn("description", patch.description);
  if (patch.billable !== undefined) setColumn("billable", patch.billable);
  if (patch.status !== undefined) setColumn("status", patch.status);

  const result = await db.query<TimeEntry>(
    `update time_entries
        set ${sets.join(", ")}
      where id = $1 and organization_id = $2
      returning ${ENTRY_RETURN_COLUMNS}`,
    values
  );
  return result.rows[0] ?? null;
}

export async function linkApprovalRequestToTimeEntry(
  db: Queryable,
  context: TenantContext,
  id: string,
  approvalRequestId: string
): Promise<TimeEntry | null> {
  assertTenantContext(context);
  const result = await db.query<TimeEntry>(
    `update time_entries
        set approval_request_id = $3, updated_at = now()
      where id = $1 and organization_id = $2
      returning ${ENTRY_RETURN_COLUMNS}`,
    [id, context.organizationId, approvalRequestId]
  );
  return result.rows[0] ?? null;
}

export async function softDeleteTimeEntry(
  db: Queryable,
  context: TenantContext,
  id: string
): Promise<{ id: string } | null> {
  assertTenantContext(context);
  const result = await db.query<{ id: string }>(
    `update time_entries
        set deleted_at = now(), updated_at = now()
      where id = $1 and organization_id = $2 and deleted_at is null
      returning id`,
    [id, context.organizationId]
  );
  return result.rows[0] ?? null;
}
