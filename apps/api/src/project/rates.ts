import type { Rate, CreateRateInput, UpdateRateInput } from "@sentropic/openerp-domain/project";

import type { Queryable, TenantContext } from "../db/client";
import { assertTenantContext } from "../db/client";

// Repository for the Rate entity. Soft-delete via deleted_at.
// Money is stored as jsonb on the amount column.

const RATE_RETURN_COLUMNS = `
  id,
  organization_id as "organizationId",
  name,
  amount,
  effective_from as "effectiveFrom",
  effective_to as "effectiveTo",
  active,
  created_at as "createdAt",
  updated_at as "updatedAt"
`;

export async function insertRate(
  db: Queryable,
  context: TenantContext,
  input: CreateRateInput
): Promise<Rate> {
  assertTenantContext(context);
  const result = await db.query<Rate>(
    `insert into rates (
       organization_id, name, amount, effective_from, effective_to, active
     ) values ($1, $2, $3::jsonb, $4, $5, $6)
     returning ${RATE_RETURN_COLUMNS}`,
    [
      context.organizationId,
      input.name,
      JSON.stringify(input.amount),
      input.effectiveFrom,
      input.effectiveTo ?? null,
      input.active ?? true
    ]
  );
  return result.rows[0]!;
}

export async function findRateById(
  db: Queryable,
  context: TenantContext,
  id: string
): Promise<Rate | null> {
  assertTenantContext(context);
  const result = await db.query<Rate>(
    `select ${RATE_RETURN_COLUMNS}
       from rates
      where id = $1 and organization_id = $2 and deleted_at is null`,
    [id, context.organizationId]
  );
  return result.rows[0] ?? null;
}

export async function listRates(
  db: Queryable,
  context: TenantContext,
  options: {
    limit?: number;
    offset?: number;
    activeOnly?: boolean;
  } = {}
): Promise<Rate[]> {
  assertTenantContext(context);
  const limit = Math.min(Math.max(options.limit ?? 50, 1), 200);
  const offset = Math.max(options.offset ?? 0, 0);
  const activeFilter = options.activeOnly ?? false;
  const result = await db.query<Rate>(
    `select ${RATE_RETURN_COLUMNS}
       from rates
      where organization_id = $1
        and ($2::boolean is false or active = true)
        and deleted_at is null
      order by name asc
      limit $3 offset $4`,
    [context.organizationId, activeFilter, limit, offset]
  );
  return result.rows;
}

export async function updateRate(
  db: Queryable,
  context: TenantContext,
  id: string,
  patch: UpdateRateInput
): Promise<Rate | null> {
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
  if (patch.amount !== undefined) setColumn("amount", JSON.stringify(patch.amount));
  if (patch.effectiveFrom !== undefined) setColumn("effective_from", patch.effectiveFrom);
  if (patch.effectiveTo !== undefined) setColumn("effective_to", patch.effectiveTo);
  if (patch.active !== undefined) setColumn("active", patch.active);

  const result = await db.query<Rate>(
    `update rates
        set ${sets.join(", ")}
      where id = $1 and organization_id = $2 and deleted_at is null
      returning ${RATE_RETURN_COLUMNS}`,
    values
  );
  return result.rows[0] ?? null;
}

export async function softDeleteRate(
  db: Queryable,
  context: TenantContext,
  id: string
): Promise<{ id: string } | null> {
  assertTenantContext(context);
  const result = await db.query<{ id: string }>(
    `update rates
        set deleted_at = now(), updated_at = now()
      where id = $1 and organization_id = $2 and deleted_at is null
      returning id`,
    [id, context.organizationId]
  );
  return result.rows[0] ?? null;
}
