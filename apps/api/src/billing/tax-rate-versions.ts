import type {
  TaxRateVersion,
  CreateTaxRateVersionInput,
  UpdateTaxRateVersionInput
} from "@sentropic/openerp-domain/billing";

import type { Queryable, TenantContext } from "../db/client";
import { assertTenantContext } from "../db/client";

// Repository for TaxRateVersion. Soft-delete via deleted_at.
// Effective dating: [effective_from, effective_to) covers a given date.

const RATE_RETURN_COLUMNS = `
  id,
  organization_id as "organizationId",
  tax_category_id as "taxCategoryId",
  jurisdiction,
  label,
  rate_bps as "rateBps",
  compound,
  to_char(effective_from, 'YYYY-MM-DD') as "effectiveFrom",
  to_char(effective_to, 'YYYY-MM-DD') as "effectiveTo",
  active,
  to_char(created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "createdAt",
  to_char(updated_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "updatedAt"
`;

export async function insertTaxRateVersion(
  db: Queryable,
  context: TenantContext,
  input: CreateTaxRateVersionInput
): Promise<TaxRateVersion> {
  assertTenantContext(context);
  const result = await db.query<TaxRateVersion>(
    `insert into tax_rate_versions (
       organization_id, tax_category_id, jurisdiction, label,
       rate_bps, compound, effective_from, effective_to, active
     ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     returning ${RATE_RETURN_COLUMNS}`,
    [
      context.organizationId,
      input.taxCategoryId,
      input.jurisdiction,
      input.label,
      input.rateBps,
      input.compound ?? false,
      input.effectiveFrom,
      input.effectiveTo ?? null,
      input.active ?? true
    ]
  );
  return result.rows[0]!;
}

export async function findTaxRateVersionById(
  db: Queryable,
  context: TenantContext,
  id: string
): Promise<TaxRateVersion | null> {
  assertTenantContext(context);
  const result = await db.query<TaxRateVersion>(
    `select ${RATE_RETURN_COLUMNS}
       from tax_rate_versions
      where id = $1 and organization_id = $2 and deleted_at is null`,
    [id, context.organizationId]
  );
  return result.rows[0] ?? null;
}

export async function listTaxRateVersions(
  db: Queryable,
  context: TenantContext,
  options: {
    limit?: number;
    offset?: number;
    taxCategoryId?: string;
    activeOnly?: boolean;
    /** If provided, only returns versions whose [effective_from, effective_to] covers this date. */
    asOfDate?: string;
  } = {}
): Promise<TaxRateVersion[]> {
  assertTenantContext(context);
  const limit = Math.min(Math.max(options.limit ?? 100, 1), 500);
  const offset = Math.max(options.offset ?? 0, 0);
  const taxCategoryId = options.taxCategoryId ?? null;
  const activeFilter = options.activeOnly ?? false;
  const asOfDate = options.asOfDate ?? null;

  const result = await db.query<TaxRateVersion>(
    `select ${RATE_RETURN_COLUMNS}
       from tax_rate_versions
      where organization_id = $1
        and ($2::uuid is null or tax_category_id = $2)
        and ($3::boolean is false or active = true)
        and ($4::date is null or (effective_from <= $4 and (effective_to is null or effective_to >= $4)))
        and deleted_at is null
      order by effective_from asc
      limit $5 offset $6`,
    [context.organizationId, taxCategoryId, activeFilter, asOfDate, limit, offset]
  );
  return result.rows;
}

export async function updateTaxRateVersion(
  db: Queryable,
  context: TenantContext,
  id: string,
  patch: UpdateTaxRateVersionInput
): Promise<TaxRateVersion | null> {
  assertTenantContext(context);
  const sets: string[] = ["updated_at = now()"];
  const values: unknown[] = [id, context.organizationId];
  let i = values.length;
  const setColumn = (column: string, value: unknown) => {
    i += 1;
    sets.push(`${column} = $${i}`);
    values.push(value);
  };
  if (patch.jurisdiction !== undefined) setColumn("jurisdiction", patch.jurisdiction);
  if (patch.label !== undefined) setColumn("label", patch.label);
  if (patch.rateBps !== undefined) setColumn("rate_bps", patch.rateBps);
  if (patch.compound !== undefined) setColumn("compound", patch.compound);
  if (patch.effectiveFrom !== undefined) setColumn("effective_from", patch.effectiveFrom);
  if (patch.effectiveTo !== undefined) setColumn("effective_to", patch.effectiveTo);
  if (patch.active !== undefined) setColumn("active", patch.active);

  const result = await db.query<TaxRateVersion>(
    `update tax_rate_versions
        set ${sets.join(", ")}
      where id = $1 and organization_id = $2 and deleted_at is null
      returning ${RATE_RETURN_COLUMNS}`,
    values
  );
  return result.rows[0] ?? null;
}

export async function softDeleteTaxRateVersion(
  db: Queryable,
  context: TenantContext,
  id: string
): Promise<{ id: string } | null> {
  assertTenantContext(context);
  const result = await db.query<{ id: string }>(
    `update tax_rate_versions
        set deleted_at = now(), updated_at = now()
      where id = $1 and organization_id = $2 and deleted_at is null
      returning id`,
    [id, context.organizationId]
  );
  return result.rows[0] ?? null;
}
