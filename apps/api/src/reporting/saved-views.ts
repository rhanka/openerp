import type { SavedView, CreateSavedViewInput, UpdateSavedViewInput } from "@sentropic/openerp-domain/reporting";

import type { Queryable, TenantContext } from "../db/client";
import { assertTenantContext } from "../db/client";

// Repository for the Reporting SavedView entity. The service layer wraps this
// with audit emission and validation.

const SAVED_VIEW_RETURN_COLUMNS = `
  id,
  organization_id as "organizationId",
  owner_user_id as "ownerUserId",
  resource_type as "resourceType",
  name,
  filters,
  columns,
  sort_by as "sortBy",
  is_shared as "isShared",
  created_at as "createdAt",
  updated_at as "updatedAt"
`;

export async function insertSavedView(
  db: Queryable,
  context: TenantContext,
  input: CreateSavedViewInput
): Promise<SavedView> {
  assertTenantContext(context);
  const result = await db.query<SavedView>(
    `insert into saved_views (
       organization_id, owner_user_id, resource_type, name, filters, columns, sort_by, is_shared
     ) values ($1, $2, $3, $4, $5, $6, $7, $8)
     returning ${SAVED_VIEW_RETURN_COLUMNS}`,
    [
      context.organizationId,
      input.ownerUserId ?? null,
      input.resourceType,
      input.name,
      JSON.stringify(input.filters ?? {}),
      JSON.stringify(input.columns ?? []),
      input.sortBy ?? null,
      input.isShared ?? false
    ]
  );
  return result.rows[0]!;
}

export async function findSavedViewById(
  db: Queryable,
  context: TenantContext,
  id: string
): Promise<SavedView | null> {
  assertTenantContext(context);
  const result = await db.query<SavedView>(
    `select ${SAVED_VIEW_RETURN_COLUMNS}
       from saved_views
      where id = $1 and organization_id = $2 and deleted_at is null`,
    [id, context.organizationId]
  );
  return result.rows[0] ?? null;
}

export async function listSavedViews(
  db: Queryable,
  context: TenantContext,
  options: {
    limit?: number;
    offset?: number;
    resourceType?: string;
    ownerUserId?: string | null;
    isShared?: boolean;
  } = {}
): Promise<SavedView[]> {
  assertTenantContext(context);
  const limit = Math.min(Math.max(options.limit ?? 50, 1), 200);
  const offset = Math.max(options.offset ?? 0, 0);
  const filterResourceType = options.resourceType ?? null;
  const filterOwnerUserId = "ownerUserId" in options ? options.ownerUserId ?? null : undefined;
  const filterShared = "isShared" in options ? options.isShared ?? null : null;

  const result = await db.query<SavedView>(
    `select ${SAVED_VIEW_RETURN_COLUMNS}
       from saved_views
      where organization_id = $1
        and ($2::text is null or resource_type = $2)
        and ($3::text is null or owner_user_id = $3::uuid)
        and ($4::boolean is null or is_shared = $4)
        and deleted_at is null
      order by name asc
      limit $5 offset $6`,
    [
      context.organizationId,
      filterResourceType,
      filterOwnerUserId ?? null,
      filterShared,
      limit,
      offset
    ]
  );
  return result.rows;
}

export async function updateSavedView(
  db: Queryable,
  context: TenantContext,
  id: string,
  patch: UpdateSavedViewInput
): Promise<SavedView | null> {
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
  if (patch.filters !== undefined) setColumn("filters", JSON.stringify(patch.filters));
  if (patch.columns !== undefined) setColumn("columns", JSON.stringify(patch.columns));
  if (patch.sortBy !== undefined) setColumn("sort_by", patch.sortBy);
  if (patch.isShared !== undefined) setColumn("is_shared", patch.isShared);

  const result = await db.query<SavedView>(
    `update saved_views
        set ${sets.join(", ")}
      where id = $1 and organization_id = $2 and deleted_at is null
      returning ${SAVED_VIEW_RETURN_COLUMNS}`,
    values
  );
  return result.rows[0] ?? null;
}

export async function softDeleteSavedView(
  db: Queryable,
  context: TenantContext,
  id: string
): Promise<{ id: string } | null> {
  assertTenantContext(context);
  const result = await db.query<{ id: string }>(
    `update saved_views
        set deleted_at = now(), updated_at = now()
      where id = $1 and organization_id = $2 and deleted_at is null
      returning id`,
    [id, context.organizationId]
  );
  return result.rows[0] ?? null;
}
