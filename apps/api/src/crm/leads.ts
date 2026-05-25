import type {
  CreateLeadInput,
  Lead,
  LeadStatus,
  UpdateLeadInput
} from "@sentropic/openerp-domain/crm";

import type { Queryable, TenantContext } from "../db/client";
import { assertTenantContext } from "../db/client";

const LEAD_RETURN_COLUMNS = `
  id,
  organization_id as "organizationId",
  source,
  display_name as "displayName",
  company_name as "companyName",
  contact_name as "contactName",
  email,
  phone,
  description,
  status,
  owner_user_id as "ownerUserId",
  team_id as "teamId",
  converted_at as "convertedAt",
  converted_company_id as "convertedCompanyId",
  converted_contact_id as "convertedContactId",
  converted_opportunity_id as "convertedOpportunityId",
  created_at as "createdAt",
  updated_at as "updatedAt"
`;

export async function insertLead(
  db: Queryable,
  context: TenantContext,
  input: CreateLeadInput
): Promise<Lead> {
  assertTenantContext(context);
  const result = await db.query<Lead>(
    `insert into leads (
       organization_id, source, display_name, company_name, contact_name,
       email, phone, description, status, owner_user_id, team_id
     ) values ($1, $2, $3, $4, $5, $6, $7, $8, 'new', $9, $10)
     returning ${LEAD_RETURN_COLUMNS}`,
    [
      context.organizationId,
      input.source ?? null,
      input.displayName,
      input.companyName ?? null,
      input.contactName ?? null,
      input.email ?? null,
      input.phone ?? null,
      input.description ?? null,
      input.ownerUserId ?? null,
      input.teamId ?? null
    ]
  );
  return result.rows[0]!;
}

export async function findLeadById(
  db: Queryable,
  context: TenantContext,
  id: string
): Promise<Lead | null> {
  assertTenantContext(context);
  const result = await db.query<Lead>(
    `select ${LEAD_RETURN_COLUMNS}
       from leads
      where id = $1 and organization_id = $2 and deleted_at is null`,
    [id, context.organizationId]
  );
  return result.rows[0] ?? null;
}

export async function listLeads(
  db: Queryable,
  context: TenantContext,
  options: { limit?: number; offset?: number; status?: LeadStatus } = {}
): Promise<Lead[]> {
  assertTenantContext(context);
  const limit = Math.min(Math.max(options.limit ?? 50, 1), 200);
  const offset = Math.max(options.offset ?? 0, 0);
  const filterStatus = options.status ?? null;
  const result = await db.query<Lead>(
    `select ${LEAD_RETURN_COLUMNS}
       from leads
      where organization_id = $1
        and ($2::text is null or status = $2)
        and deleted_at is null
      order by created_at desc
      limit $3 offset $4`,
    [context.organizationId, filterStatus, limit, offset]
  );
  return result.rows;
}

export async function updateLead(
  db: Queryable,
  context: TenantContext,
  id: string,
  patch: UpdateLeadInput
): Promise<Lead | null> {
  assertTenantContext(context);
  const sets: string[] = ["updated_at = now()"];
  const values: unknown[] = [id, context.organizationId];
  let i = values.length;
  const setColumn = (column: string, value: unknown) => {
    i += 1;
    sets.push(`${column} = $${i}`);
    values.push(value);
  };
  if (patch.source !== undefined) setColumn("source", patch.source);
  if (patch.displayName !== undefined) setColumn("display_name", patch.displayName);
  if (patch.companyName !== undefined) setColumn("company_name", patch.companyName);
  if (patch.contactName !== undefined) setColumn("contact_name", patch.contactName);
  if (patch.email !== undefined) setColumn("email", patch.email);
  if (patch.phone !== undefined) setColumn("phone", patch.phone);
  if (patch.description !== undefined) setColumn("description", patch.description);
  if (patch.status !== undefined) setColumn("status", patch.status);
  if (patch.ownerUserId !== undefined) setColumn("owner_user_id", patch.ownerUserId);
  if (patch.teamId !== undefined) setColumn("team_id", patch.teamId);

  const result = await db.query<Lead>(
    `update leads
        set ${sets.join(", ")}
      where id = $1 and organization_id = $2
      returning ${LEAD_RETURN_COLUMNS}`,
    values
  );
  return result.rows[0] ?? null;
}

export async function softDeleteLead(
  db: Queryable,
  context: TenantContext,
  id: string
): Promise<{ id: string } | null> {
  assertTenantContext(context);
  const result = await db.query<{ id: string }>(
    `update leads
        set deleted_at = now(), updated_at = now()
      where id = $1 and organization_id = $2 and deleted_at is null
      returning id`,
    [id, context.organizationId]
  );
  return result.rows[0] ?? null;
}

export async function markLeadConverted(
  db: Queryable,
  context: TenantContext,
  id: string,
  refs: { companyId: string; contactId: string | null; opportunityId: string }
): Promise<Lead | null> {
  assertTenantContext(context);
  const result = await db.query<Lead>(
    `update leads
        set status = 'converted',
            converted_at = now(),
            converted_company_id = $3,
            converted_contact_id = $4,
            converted_opportunity_id = $5,
            updated_at = now()
      where id = $1 and organization_id = $2 and status in ('new', 'working')
      returning ${LEAD_RETURN_COLUMNS}`,
    [id, context.organizationId, refs.companyId, refs.contactId, refs.opportunityId]
  );
  return result.rows[0] ?? null;
}
