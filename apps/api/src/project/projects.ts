import type { Project, ProjectStatus, CreateProjectInput, UpdateProjectInput } from "@sentropic/openerp-domain/project";

import type { Queryable, TenantContext } from "../db/client";
import { assertTenantContext } from "../db/client";

// Repository for the Project entity. Soft-delete is applied via deleted_at.
// The service layer wraps this with audit emission and validation.

const PROJECT_RETURN_COLUMNS = `
  id,
  organization_id as "organizationId",
  name,
  description,
  status,
  code,
  company_id as "companyId",
  owner_user_id as "ownerUserId",
  to_char(start_date, 'YYYY-MM-DD') as "startDate",
  to_char(end_date, 'YYYY-MM-DD') as "endDate",
  to_char(created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "createdAt",
  to_char(updated_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "updatedAt"
`;

export async function insertProject(
  db: Queryable,
  context: TenantContext,
  input: CreateProjectInput
): Promise<Project> {
  assertTenantContext(context);
  const result = await db.query<Project>(
    `insert into projects (
       organization_id, name, description, status, code, company_id, owner_user_id,
       start_date, end_date
     ) values ($1, $2, $3, 'active', $4, $5, $6, $7, $8)
     returning ${PROJECT_RETURN_COLUMNS}`,
    [
      context.organizationId,
      input.name,
      input.description ?? null,
      input.code ?? null,
      input.companyId ?? null,
      input.ownerUserId ?? null,
      input.startDate ?? null,
      input.endDate ?? null
    ]
  );
  return result.rows[0]!;
}

export async function findProjectById(
  db: Queryable,
  context: TenantContext,
  id: string
): Promise<Project | null> {
  assertTenantContext(context);
  const result = await db.query<Project>(
    `select ${PROJECT_RETURN_COLUMNS}
       from projects
      where id = $1 and organization_id = $2 and deleted_at is null`,
    [id, context.organizationId]
  );
  return result.rows[0] ?? null;
}

export async function listProjects(
  db: Queryable,
  context: TenantContext,
  options: { limit?: number; offset?: number; status?: ProjectStatus } = {}
): Promise<Project[]> {
  assertTenantContext(context);
  const limit = Math.min(Math.max(options.limit ?? 50, 1), 200);
  const offset = Math.max(options.offset ?? 0, 0);
  const filterStatus = options.status ?? null;
  const result = await db.query<Project>(
    `select ${PROJECT_RETURN_COLUMNS}
       from projects
      where organization_id = $1
        and ($2::text is null or status = $2)
        and deleted_at is null
      order by created_at desc
      limit $3 offset $4`,
    [context.organizationId, filterStatus, limit, offset]
  );
  return result.rows;
}

export async function updateProject(
  db: Queryable,
  context: TenantContext,
  id: string,
  patch: UpdateProjectInput
): Promise<Project | null> {
  assertTenantContext(context);
  const sets: string[] = ["updated_at = now()"];
  const values: unknown[] = [id, context.organizationId];
  let i = values.length;
  const setColumn = (column: string, value: unknown) => {
    i += 1;
    sets.push(`${column} = $${i}`);
    values.push(value);
  };
  if (patch.name !== undefined) setColumn("name", patch.name);
  if (patch.description !== undefined) setColumn("description", patch.description);
  if (patch.status !== undefined) setColumn("status", patch.status);
  if (patch.code !== undefined) setColumn("code", patch.code);
  if (patch.companyId !== undefined) setColumn("company_id", patch.companyId);
  if (patch.ownerUserId !== undefined) setColumn("owner_user_id", patch.ownerUserId);
  if (patch.startDate !== undefined) setColumn("start_date", patch.startDate);
  if (patch.endDate !== undefined) setColumn("end_date", patch.endDate);

  const result = await db.query<Project>(
    `update projects
        set ${sets.join(", ")}
      where id = $1 and organization_id = $2
      returning ${PROJECT_RETURN_COLUMNS}`,
    values
  );
  return result.rows[0] ?? null;
}

export async function softDeleteProject(
  db: Queryable,
  context: TenantContext,
  id: string
): Promise<{ id: string } | null> {
  assertTenantContext(context);
  const result = await db.query<{ id: string }>(
    `update projects
        set deleted_at = now(), updated_at = now()
      where id = $1 and organization_id = $2 and deleted_at is null
      returning id`,
    [id, context.organizationId]
  );
  return result.rows[0] ?? null;
}
