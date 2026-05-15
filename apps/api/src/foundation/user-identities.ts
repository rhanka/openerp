import type { ActorSource, LocaleCode, MfaState, UserIdentity, UserStatus } from "@openerp/domain";
import type { Queryable } from "../db/client";

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
  last_login_at as "lastLoginAt",
  created_at as "createdAt",
  updated_at as "updatedAt"
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
  return result.rows[0];
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
