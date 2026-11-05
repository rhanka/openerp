import type { Company, CompanyStatus, CreateCompanyInput, UpdateCompanyInput, AddressPayload } from "@sentropic/openerp-domain/crm";

import type { Queryable, TenantContext } from "../db/client";
import { assertTenantContext } from "../db/client";

// Repository for the CRM Company entity. The service layer wraps this with
// audit emission and validation.

const COMPANY_RETURN_COLUMNS = `
  id,
  organization_id as "organizationId",
  display_name as "displayName",
  legal_name as "legalName",
  status,
  owner_user_id as "ownerUserId",
  team_id as "teamId",
  website,
  phone,
  email,
  language,
  tax_region as "taxRegion",
  billing_address as "billingAddress",
  shipping_address as "shippingAddress",
  to_char(created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "createdAt",
  to_char(updated_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "updatedAt"
`;

export async function insertCompany(
  db: Queryable,
  context: TenantContext,
  input: CreateCompanyInput
): Promise<Company> {
  assertTenantContext(context);
  const result = await db.query<Company>(
    `insert into companies (
       organization_id, display_name, legal_name, status, owner_user_id, team_id,
       website, phone, email, language, tax_region, billing_address, shipping_address
     ) values ($1, $2, $3, 'active', $4, $5, $6, $7, $8, $9, $10, $11, $12)
     returning ${COMPANY_RETURN_COLUMNS}`,
    [
      context.organizationId,
      input.displayName,
      input.legalName ?? null,
      input.ownerUserId ?? null,
      input.teamId ?? null,
      input.website ?? null,
      input.phone ?? null,
      input.email ?? null,
      input.language ?? null,
      input.taxRegion ?? null,
      input.billingAddress ?? null,
      input.shippingAddress ?? null
    ]
  );
  return result.rows[0]!;
}

export async function findCompanyById(
  db: Queryable,
  context: TenantContext,
  id: string
): Promise<Company | null> {
  assertTenantContext(context);
  const result = await db.query<Company>(
    `select ${COMPANY_RETURN_COLUMNS}
       from companies
      where id = $1 and organization_id = $2 and deleted_at is null`,
    [id, context.organizationId]
  );
  return result.rows[0] ?? null;
}

export async function listCompanies(
  db: Queryable,
  context: TenantContext,
  options: { limit?: number; offset?: number; status?: CompanyStatus } = {}
): Promise<Company[]> {
  assertTenantContext(context);
  const limit = Math.min(Math.max(options.limit ?? 50, 1), 200);
  const offset = Math.max(options.offset ?? 0, 0);
  const filterStatus = options.status ?? null;
  const result = await db.query<Company>(
    `select ${COMPANY_RETURN_COLUMNS}
       from companies
      where organization_id = $1
        and ($2::text is null or status = $2)
        and deleted_at is null
      order by display_name asc
      limit $3 offset $4`,
    [context.organizationId, filterStatus, limit, offset]
  );
  return result.rows;
}

export async function updateCompany(
  db: Queryable,
  context: TenantContext,
  id: string,
  patch: UpdateCompanyInput
): Promise<Company | null> {
  assertTenantContext(context);
  // Dynamic patch: only provided columns are touched. updated_at always bumps.
  const sets: string[] = ["updated_at = now()"];
  const values: unknown[] = [id, context.organizationId];
  let i = values.length;
  const setColumn = (column: string, value: unknown) => {
    i += 1;
    sets.push(`${column} = $${i}`);
    values.push(value);
  };
  if (patch.displayName !== undefined) setColumn("display_name", patch.displayName);
  if (patch.legalName !== undefined) setColumn("legal_name", patch.legalName);
  if (patch.status !== undefined) setColumn("status", patch.status);
  if (patch.ownerUserId !== undefined) setColumn("owner_user_id", patch.ownerUserId);
  if (patch.teamId !== undefined) setColumn("team_id", patch.teamId);
  if (patch.website !== undefined) setColumn("website", patch.website);
  if (patch.phone !== undefined) setColumn("phone", patch.phone);
  if (patch.email !== undefined) setColumn("email", patch.email);
  if (patch.language !== undefined) setColumn("language", patch.language);
  if (patch.taxRegion !== undefined) setColumn("tax_region", patch.taxRegion);
  if (patch.billingAddress !== undefined) setColumn("billing_address", patch.billingAddress as AddressPayload | null);
  if (patch.shippingAddress !== undefined) setColumn("shipping_address", patch.shippingAddress as AddressPayload | null);

  const result = await db.query<Company>(
    `update companies
        set ${sets.join(", ")}
      where id = $1 and organization_id = $2
      returning ${COMPANY_RETURN_COLUMNS}`,
    values
  );
  return result.rows[0] ?? null;
}

export async function softDeleteCompany(
  db: Queryable,
  context: TenantContext,
  id: string
): Promise<{ id: string } | null> {
  assertTenantContext(context);
  const result = await db.query<{ id: string }>(
    `update companies
        set deleted_at = now(), updated_at = now()
      where id = $1 and organization_id = $2 and deleted_at is null
      returning id`,
    [id, context.organizationId]
  );
  return result.rows[0] ?? null;
}
