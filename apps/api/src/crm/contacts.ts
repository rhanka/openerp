import type { Contact, ContactStatus, CreateContactInput, UpdateContactInput } from "@sentropic/openerp-domain/crm";

import type { Queryable, TenantContext } from "../db/client";
import { assertTenantContext } from "../db/client";

const CONTACT_RETURN_COLUMNS = `
  id,
  organization_id as "organizationId",
  company_id as "companyId",
  display_name as "displayName",
  first_name as "firstName",
  last_name as "lastName",
  title,
  email,
  phone,
  language,
  status,
  owner_user_id as "ownerUserId",
  created_at as "createdAt",
  updated_at as "updatedAt"
`;

export async function insertContact(
  db: Queryable,
  context: TenantContext,
  input: CreateContactInput
): Promise<Contact> {
  assertTenantContext(context);
  const result = await db.query<Contact>(
    `insert into contacts (
       organization_id, company_id, display_name, first_name, last_name, title,
       email, phone, language, status, owner_user_id
     ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'active', $10)
     returning ${CONTACT_RETURN_COLUMNS}`,
    [
      context.organizationId,
      input.companyId ?? null,
      input.displayName,
      input.firstName ?? null,
      input.lastName ?? null,
      input.title ?? null,
      input.email ?? null,
      input.phone ?? null,
      input.language ?? null,
      input.ownerUserId ?? null
    ]
  );
  return result.rows[0]!;
}

export async function findContactById(
  db: Queryable,
  context: TenantContext,
  id: string
): Promise<Contact | null> {
  assertTenantContext(context);
  const result = await db.query<Contact>(
    `select ${CONTACT_RETURN_COLUMNS}
       from contacts
      where id = $1 and organization_id = $2`,
    [id, context.organizationId]
  );
  return result.rows[0] ?? null;
}

export async function listContacts(
  db: Queryable,
  context: TenantContext,
  options: { limit?: number; offset?: number; status?: ContactStatus; companyId?: string | null } = {}
): Promise<Contact[]> {
  assertTenantContext(context);
  const limit = Math.min(Math.max(options.limit ?? 50, 1), 200);
  const offset = Math.max(options.offset ?? 0, 0);
  const filterStatus = options.status ?? null;
  const filterCompanyId = options.companyId ?? null;
  const result = await db.query<Contact>(
    `select ${CONTACT_RETURN_COLUMNS}
       from contacts
      where organization_id = $1
        and ($2::text is null or status = $2)
        and ($3::uuid is null or company_id = $3)
      order by display_name asc
      limit $4 offset $5`,
    [context.organizationId, filterStatus, filterCompanyId, limit, offset]
  );
  return result.rows;
}

export async function updateContact(
  db: Queryable,
  context: TenantContext,
  id: string,
  patch: UpdateContactInput
): Promise<Contact | null> {
  assertTenantContext(context);
  const sets: string[] = ["updated_at = now()"];
  const values: unknown[] = [id, context.organizationId];
  let i = values.length;
  const setColumn = (column: string, value: unknown) => {
    i += 1;
    sets.push(`${column} = $${i}`);
    values.push(value);
  };
  if (patch.companyId !== undefined) setColumn("company_id", patch.companyId);
  if (patch.displayName !== undefined) setColumn("display_name", patch.displayName);
  if (patch.firstName !== undefined) setColumn("first_name", patch.firstName);
  if (patch.lastName !== undefined) setColumn("last_name", patch.lastName);
  if (patch.title !== undefined) setColumn("title", patch.title);
  if (patch.email !== undefined) setColumn("email", patch.email);
  if (patch.phone !== undefined) setColumn("phone", patch.phone);
  if (patch.language !== undefined) setColumn("language", patch.language);
  if (patch.status !== undefined) setColumn("status", patch.status);
  if (patch.ownerUserId !== undefined) setColumn("owner_user_id", patch.ownerUserId);

  const result = await db.query<Contact>(
    `update contacts
        set ${sets.join(", ")}
      where id = $1 and organization_id = $2
      returning ${CONTACT_RETURN_COLUMNS}`,
    values
  );
  return result.rows[0] ?? null;
}
