import type {
  TaxCategory,
  CreateTaxCategoryInput,
  UpdateTaxCategoryInput
} from "@sentropic/openerp-domain/billing";

import type { Queryable, TenantContext } from "../db/client";
import { assertTenantContext } from "../db/client";

// Repository for TaxCategory. Soft-delete via deleted_at.

const CATEGORY_RETURN_COLUMNS = `
  id,
  organization_id as "organizationId",
  name,
  code,
  description,
  active,
  created_at as "createdAt",
  updated_at as "updatedAt"
`;

export async function insertTaxCategory(
  db: Queryable,
  context: TenantContext,
  input: CreateTaxCategoryInput
): Promise<TaxCategory> {
  assertTenantContext(context);
  const result = await db.query<TaxCategory>(
    `insert into tax_categories (
       organization_id, name, code, description, active
     ) values ($1, $2, $3, $4, $5)
     returning ${CATEGORY_RETURN_COLUMNS}`,
    [
      context.organizationId,
      input.name,
      input.code,
      input.description ?? null,
      input.active ?? true
    ]
  );
  return result.rows[0]!;
}

export async function findTaxCategoryById(
  db: Queryable,
  context: TenantContext,
  id: string
): Promise<TaxCategory | null> {
  assertTenantContext(context);
  const result = await db.query<TaxCategory>(
    `select ${CATEGORY_RETURN_COLUMNS}
       from tax_categories
      where id = $1 and organization_id = $2 and deleted_at is null`,
    [id, context.organizationId]
  );
  return result.rows[0] ?? null;
}

export async function listTaxCategories(
  db: Queryable,
  context: TenantContext,
  options: {
    limit?: number;
    offset?: number;
    activeOnly?: boolean;
  } = {}
): Promise<TaxCategory[]> {
  assertTenantContext(context);
  const limit = Math.min(Math.max(options.limit ?? 50, 1), 200);
  const offset = Math.max(options.offset ?? 0, 0);
  const activeFilter = options.activeOnly ?? false;
  const result = await db.query<TaxCategory>(
    `select ${CATEGORY_RETURN_COLUMNS}
       from tax_categories
      where organization_id = $1
        and ($2::boolean is false or active = true)
        and deleted_at is null
      order by name asc
      limit $3 offset $4`,
    [context.organizationId, activeFilter, limit, offset]
  );
  return result.rows;
}

export async function updateTaxCategory(
  db: Queryable,
  context: TenantContext,
  id: string,
  patch: UpdateTaxCategoryInput
): Promise<TaxCategory | null> {
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
  if (patch.code !== undefined) setColumn("code", patch.code);
  if (patch.description !== undefined) setColumn("description", patch.description);
  if (patch.active !== undefined) setColumn("active", patch.active);

  const result = await db.query<TaxCategory>(
    `update tax_categories
        set ${sets.join(", ")}
      where id = $1 and organization_id = $2 and deleted_at is null
      returning ${CATEGORY_RETURN_COLUMNS}`,
    values
  );
  return result.rows[0] ?? null;
}

export async function softDeleteTaxCategory(
  db: Queryable,
  context: TenantContext,
  id: string
): Promise<{ id: string } | null> {
  assertTenantContext(context);
  const result = await db.query<{ id: string }>(
    `update tax_categories
        set deleted_at = now(), updated_at = now()
      where id = $1 and organization_id = $2 and deleted_at is null
      returning id`,
    [id, context.organizationId]
  );
  return result.rows[0] ?? null;
}
