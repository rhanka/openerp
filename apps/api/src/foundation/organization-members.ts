import type { LocaleCode, OrganizationMember, UserStatus } from "@openerp/domain";
import type { Queryable, TenantContext } from "../db/client";
import { assertTenantContext } from "../db/client";

// Repository for OrganizationMember (PG-02). Tenant-scoped via organization_id.
// Cross-org lookup by user_identity_id is intentionally NOT tenant-scoped so a
// human can see every org they belong to.

const ORG_MEMBER_COLUMNS = `
  id,
  user_identity_id as "userIdentityId",
  organization_id as "organizationId",
  status,
  preferred_locale as "preferredLocale",
  joined_at as "joinedAt",
  updated_at as "updatedAt"
`;

export interface InsertOrganizationMemberInput {
  userIdentityId: string;
  status: UserStatus;
  preferredLocale: LocaleCode | null;
}

export async function insertOrganizationMember(
  db: Queryable,
  context: TenantContext,
  input: InsertOrganizationMemberInput
): Promise<OrganizationMember> {
  assertTenantContext(context);
  const result = await db.query<OrganizationMember>(
    `insert into organization_members (
       user_identity_id, organization_id, status, preferred_locale
     ) values ($1, $2, $3, $4)
     returning ${ORG_MEMBER_COLUMNS}`,
    [input.userIdentityId, context.organizationId, input.status, input.preferredLocale]
  );
  return result.rows[0];
}

export async function findOrganizationMember(
  db: Queryable,
  context: TenantContext,
  userIdentityId: string
): Promise<OrganizationMember | null> {
  assertTenantContext(context);
  const result = await db.query<OrganizationMember>(
    `select ${ORG_MEMBER_COLUMNS}
       from organization_members
      where organization_id = $1 and user_identity_id = $2`,
    [context.organizationId, userIdentityId]
  );
  return result.rows[0] ?? null;
}

export async function listOrganizationMembersByOrganization(
  db: Queryable,
  context: TenantContext
): Promise<OrganizationMember[]> {
  assertTenantContext(context);
  const result = await db.query<OrganizationMember>(
    `select ${ORG_MEMBER_COLUMNS}
       from organization_members
      where organization_id = $1
      order by joined_at desc`,
    [context.organizationId]
  );
  return result.rows;
}

/** Cross-org lookup: returns every org membership for a given UserIdentity.
 *  Intentionally NOT tenant-scoped — used by the org switcher UI. */
export async function listOrganizationMembersByUserIdentity(
  db: Queryable,
  userIdentityId: string
): Promise<OrganizationMember[]> {
  const result = await db.query<OrganizationMember>(
    `select ${ORG_MEMBER_COLUMNS}
       from organization_members
      where user_identity_id = $1
      order by joined_at desc`,
    [userIdentityId]
  );
  return result.rows;
}

export async function setOrganizationMemberStatus(
  db: Queryable,
  context: TenantContext,
  memberId: string,
  status: UserStatus
): Promise<OrganizationMember | null> {
  assertTenantContext(context);
  const result = await db.query<OrganizationMember>(
    `update organization_members
        set status = $3, updated_at = now()
      where id = $1 and organization_id = $2
      returning ${ORG_MEMBER_COLUMNS}`,
    [memberId, context.organizationId, status]
  );
  return result.rows[0] ?? null;
}
