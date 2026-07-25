import type { Account, AccountType } from "@sentropic/openerp-domain/billing";

import type { Queryable, TenantContext } from "../db/client";
import { assertTenantContext } from "../db/client";

// Repository for Account entities (chart of accounts).
// Accounts support soft-delete via deleted_at.

const ACCOUNT_RETURN_COLUMNS = `
  id,
  organization_id as "organizationId",
  code,
  name,
  type,
  active,
  to_char(created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "createdAt",
  to_char(updated_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "updatedAt"
`;

export async function insertAccount(
  db: Queryable,
  context: TenantContext,
  input: {
    code: string;
    name: string;
    type: AccountType;
    active?: boolean;
  }
): Promise<Account> {
  assertTenantContext(context);
  const result = await db.query<Account>(
    `insert into accounts (organization_id, code, name, type, active)
     values ($1, $2, $3, $4, $5)
     returning ${ACCOUNT_RETURN_COLUMNS}`,
    [
      context.organizationId,
      input.code,
      input.name,
      input.type,
      input.active ?? true
    ]
  );
  return result.rows[0]!;
}

export async function findAccountById(
  db: Queryable,
  context: TenantContext,
  id: string
): Promise<Account | null> {
  assertTenantContext(context);
  const result = await db.query<Account>(
    `select ${ACCOUNT_RETURN_COLUMNS}
       from accounts
      where id = $1 and organization_id = $2 and deleted_at is null`,
    [id, context.organizationId]
  );
  return result.rows[0] ?? null;
}

export async function findAccountByCode(
  db: Queryable,
  context: TenantContext,
  code: string
): Promise<Account | null> {
  assertTenantContext(context);
  const result = await db.query<Account>(
    `select ${ACCOUNT_RETURN_COLUMNS}
       from accounts
      where code = $1 and organization_id = $2 and deleted_at is null`,
    [code, context.organizationId]
  );
  return result.rows[0] ?? null;
}

export async function listAccounts(
  db: Queryable,
  context: TenantContext,
  options: { type?: AccountType; active?: boolean; limit?: number; offset?: number } = {}
): Promise<Account[]> {
  assertTenantContext(context);
  const limit = Math.min(Math.max(options.limit ?? 200, 1), 500);
  const offset = Math.max(options.offset ?? 0, 0);
  const filterType = options.type ?? null;
  const filterActive = options.active ?? null;
  const result = await db.query<Account>(
    `select ${ACCOUNT_RETURN_COLUMNS}
       from accounts
      where organization_id = $1
        and ($2::text is null or type = $2)
        and ($3::boolean is null or active = $3)
        and deleted_at is null
      order by code asc
      limit $4 offset $5`,
    [context.organizationId, filterType, filterActive, limit, offset]
  );
  return result.rows;
}

export async function updateAccount(
  db: Queryable,
  context: TenantContext,
  id: string,
  input: { name?: string; type?: AccountType; active?: boolean }
): Promise<Account | null> {
  assertTenantContext(context);
  const sets: string[] = ["updated_at = now()"];
  const values: unknown[] = [id, context.organizationId];
  if (input.name !== undefined) {
    sets.push(`name = $${values.length + 1}`);
    values.push(input.name);
  }
  if (input.type !== undefined) {
    sets.push(`type = $${values.length + 1}`);
    values.push(input.type);
  }
  if (input.active !== undefined) {
    sets.push(`active = $${values.length + 1}`);
    values.push(input.active);
  }
  const result = await db.query<Account>(
    `update accounts
        set ${sets.join(", ")}
      where id = $1 and organization_id = $2 and deleted_at is null
      returning ${ACCOUNT_RETURN_COLUMNS}`,
    values
  );
  return result.rows[0] ?? null;
}

export async function softDeleteAccount(
  db: Queryable,
  context: TenantContext,
  id: string
): Promise<{ id: string } | null> {
  assertTenantContext(context);
  const result = await db.query<{ id: string }>(
    `update accounts
        set deleted_at = now(), updated_at = now()
      where id = $1 and organization_id = $2 and deleted_at is null
      returning id`,
    [id, context.organizationId]
  );
  return result.rows[0] ?? null;
}
