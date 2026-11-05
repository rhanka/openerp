import type {
  Assignment,
  CreateAssignmentInput,
  UpdateAssignmentInput
} from "@sentropic/openerp-domain/project";

import type { Queryable, TenantContext } from "../db/client";
import { assertTenantContext } from "../db/client";

// Repository for the Assignment entity. Soft-delete via deleted_at.

const ASSIGNMENT_RETURN_COLUMNS = `
  id,
  organization_id as "organizationId",
  project_id as "projectId",
  user_id as "userId",
  role_label as "roleLabel",
  allocation_percent as "allocationPercent",
  to_char(start_date, 'YYYY-MM-DD') as "startDate",
  to_char(end_date, 'YYYY-MM-DD') as "endDate",
  billable_rate_id as "billableRateId",
  to_char(created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "createdAt",
  to_char(updated_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "updatedAt"
`;

export async function insertAssignment(
  db: Queryable,
  context: TenantContext,
  input: CreateAssignmentInput
): Promise<Assignment> {
  assertTenantContext(context);
  const result = await db.query<Assignment>(
    `insert into assignments (
       organization_id, project_id, user_id, role_label,
       allocation_percent, start_date, end_date, billable_rate_id
     ) values ($1, $2, $3, $4, $5, $6, $7, $8)
     returning ${ASSIGNMENT_RETURN_COLUMNS}`,
    [
      context.organizationId,
      input.projectId,
      input.userId,
      input.roleLabel ?? null,
      input.allocationPercent ?? null,
      input.startDate ?? null,
      input.endDate ?? null,
      input.billableRateId ?? null
    ]
  );
  return result.rows[0]!;
}

export async function findAssignmentById(
  db: Queryable,
  context: TenantContext,
  id: string
): Promise<Assignment | null> {
  assertTenantContext(context);
  const result = await db.query<Assignment>(
    `select ${ASSIGNMENT_RETURN_COLUMNS}
       from assignments
      where id = $1 and organization_id = $2 and deleted_at is null`,
    [id, context.organizationId]
  );
  return result.rows[0] ?? null;
}

export async function listAssignments(
  db: Queryable,
  context: TenantContext,
  options: {
    limit?: number;
    offset?: number;
    projectId?: string;
    userId?: string;
  } = {}
): Promise<Assignment[]> {
  assertTenantContext(context);
  const limit = Math.min(Math.max(options.limit ?? 50, 1), 200);
  const offset = Math.max(options.offset ?? 0, 0);
  const filterProjectId = options.projectId ?? null;
  const filterUserId = options.userId ?? null;
  const result = await db.query<Assignment>(
    `select ${ASSIGNMENT_RETURN_COLUMNS}
       from assignments
      where organization_id = $1
        and ($2::uuid is null or project_id = $2)
        and ($3::uuid is null or user_id = $3)
        and deleted_at is null
      order by created_at desc
      limit $4 offset $5`,
    [context.organizationId, filterProjectId, filterUserId, limit, offset]
  );
  return result.rows;
}

export async function updateAssignment(
  db: Queryable,
  context: TenantContext,
  id: string,
  patch: UpdateAssignmentInput
): Promise<Assignment | null> {
  assertTenantContext(context);
  const sets: string[] = ["updated_at = now()"];
  const values: unknown[] = [id, context.organizationId];
  let i = values.length;
  const setColumn = (column: string, value: unknown) => {
    i += 1;
    sets.push(`${column} = $${i}`);
    values.push(value);
  };
  if (patch.roleLabel !== undefined) setColumn("role_label", patch.roleLabel);
  if (patch.allocationPercent !== undefined) setColumn("allocation_percent", patch.allocationPercent);
  if (patch.startDate !== undefined) setColumn("start_date", patch.startDate);
  if (patch.endDate !== undefined) setColumn("end_date", patch.endDate);
  if (patch.billableRateId !== undefined) setColumn("billable_rate_id", patch.billableRateId);

  const result = await db.query<Assignment>(
    `update assignments
        set ${sets.join(", ")}
      where id = $1 and organization_id = $2 and deleted_at is null
      returning ${ASSIGNMENT_RETURN_COLUMNS}`,
    values
  );
  return result.rows[0] ?? null;
}

export async function softDeleteAssignment(
  db: Queryable,
  context: TenantContext,
  id: string
): Promise<{ id: string } | null> {
  assertTenantContext(context);
  const result = await db.query<{ id: string }>(
    `update assignments
        set deleted_at = now(), updated_at = now()
      where id = $1 and organization_id = $2 and deleted_at is null
      returning id`,
    [id, context.organizationId]
  );
  return result.rows[0] ?? null;
}
