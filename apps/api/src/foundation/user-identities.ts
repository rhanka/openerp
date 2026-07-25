import type { ActorSource, LocaleCode, MfaState, UserIdentity, UserStatus } from "@sentropic/openerp-domain";
import type { Queryable, TenantContext } from "../db/client";
import { assertTenantContext } from "../db/client";

// Repository for UserIdentity (PG-02). UserIdentity is GLOBAL — not tenant-scoped.
// Tenant scoping happens via OrganizationMember (see organization-members.ts).

const USER_IDENTITY_COLUMNS = `
  id,
  email,
  display_name as "displayName",
  preferred_locale as "preferredLocale",
  mfa_state as "mfaState",
  status,
  actor_type as "actorType",
  to_char(last_login_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "lastLoginAt",
  to_char(created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "createdAt",
  to_char(updated_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "updatedAt"
`;

export interface InsertUserIdentityInput {
  email: string;
  displayName: string;
  preferredLocale: LocaleCode;
  mfaState: MfaState;
  status: UserStatus;
  actorType: ActorSource;
}

export async function insertUserIdentity(
  db: Queryable,
  input: InsertUserIdentityInput
): Promise<UserIdentity> {
  if (!input.email.includes("@")) {
    throw new Error("UserIdentity email must contain '@'");
  }
  const result = await db.query<UserIdentity>(
    `insert into user_identities (
       email, display_name, preferred_locale, mfa_state, status, actor_type
     ) values ($1, $2, $3, $4, $5, $6)
     returning ${USER_IDENTITY_COLUMNS}`,
    [
      input.email.toLowerCase(),
      input.displayName,
      input.preferredLocale,
      input.mfaState,
      input.status,
      input.actorType
    ]
  );
  return result.rows[0]!;
}

export async function findUserIdentityById(
  db: Queryable,
  id: string
): Promise<UserIdentity | null> {
  const result = await db.query<UserIdentity>(
    `select ${USER_IDENTITY_COLUMNS}
       from user_identities
      where id = $1`,
    [id]
  );
  return result.rows[0] ?? null;
}

export async function findUserIdentityByEmail(
  db: Queryable,
  email: string
): Promise<UserIdentity | null> {
  const result = await db.query<UserIdentity>(
    `select ${USER_IDENTITY_COLUMNS}
       from user_identities
      where lower(email) = lower($1)`,
    [email]
  );
  return result.rows[0] ?? null;
}

export async function setUserIdentityStatus(
  db: Queryable,
  id: string,
  status: UserStatus
): Promise<UserIdentity | null> {
  const result = await db.query<UserIdentity>(
    `update user_identities
        set status = $2, updated_at = now()
      where id = $1
      returning ${USER_IDENTITY_COLUMNS}`,
    [id, status]
  );
  return result.rows[0] ?? null;
}

export interface TenantUserSummary {
  id: string;
  email: string;
  displayName: string;
  status: UserStatus;
}

/** Lists active (non-deactivated) users for the current tenant (RLS-scoped via users table). */
export async function listUsers(
  db: Queryable,
  context: TenantContext,
  options: { limit?: number; offset?: number } = {}
): Promise<TenantUserSummary[]> {
  assertTenantContext(context);
  const limit = Math.min(Math.max(options.limit ?? 50, 1), 200);
  const offset = Math.max(options.offset ?? 0, 0);
  const result = await db.query<TenantUserSummary>(
    `select id,
            email,
            display_name as "displayName",
            status
       from users
      where organization_id = $1
        and status <> 'deactivated'
      order by display_name asc
      limit $2 offset $3`,
    [context.organizationId, limit, offset]
  );
  return result.rows;
}

export async function recordUserIdentityLogin(
  db: Queryable,
  id: string,
  at: string
): Promise<UserIdentity | null> {
  const result = await db.query<UserIdentity>(
    `update user_identities
        set last_login_at = $2, updated_at = now()
      where id = $1
      returning ${USER_IDENTITY_COLUMNS}`,
    [id, at]
  );
  return result.rows[0] ?? null;
}
