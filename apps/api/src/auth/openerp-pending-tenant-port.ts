import type { Queryable } from "../db/client.js";

export interface OpenERPPendingTenantSelectionRecord {
  id: string;
  userIdentityId: string;
  ceremonyId: string;
  tokenHash: string;
  expiresAt: Date;
  consumedAt: Date | null;
  createdAt: Date;
}

export interface OpenERPPendingTenantSelectionPort {
  create(input: {
    userIdentityId: string;
    ceremonyId: string;
    tokenHash: string;
    expiresAt: Date;
    now: Date;
  }): Promise<OpenERPPendingTenantSelectionRecord>;
  findValid(tokenHash: string, now: Date): Promise<OpenERPPendingTenantSelectionRecord | null>;
  consume(input: {
    id: string;
    userIdentityId: string;
    ceremonyId: string;
    tokenHash: string;
    now: Date;
  }): Promise<boolean>;
}

interface PendingTenantSelectionRow {
  id: string;
  user_identity_id: string;
  ceremony_id: string;
  token_hash: string;
  expires_at: Date;
  consumed_at: Date | null;
  created_at: Date;
}

function toRecord(row: PendingTenantSelectionRow): OpenERPPendingTenantSelectionRecord {
  return {
    id: row.id,
    userIdentityId: row.user_identity_id,
    ceremonyId: row.ceremony_id,
    tokenHash: row.token_hash,
    expiresAt: new Date(row.expires_at),
    consumedAt: row.consumed_at ? new Date(row.consumed_at) : null,
    createdAt: new Date(row.created_at),
  };
}

/**
 * Pre-tenant state is only reachable through the SECURITY DEFINER functions
 * introduced in migration 0043. Raw pending tokens never reach persistence.
 */
export function createOpenERPPendingTenantSelectionPort(
  db: Queryable
): OpenERPPendingTenantSelectionPort {
  return {
    async create(input) {
      const result = await db.query<PendingTenantSelectionRow>(
        `select id, user_identity_id, ceremony_id, token_hash, expires_at, consumed_at, created_at
           from auth_pending_tenant_selection_create($1, $2, $3, $4, $5)`,
        [input.userIdentityId, input.ceremonyId, input.tokenHash, input.expiresAt, input.now]
      );
      const row = result.rows[0];
      if (!row) throw new Error("Could not persist pending tenant selection");
      return toRecord(row);
    },

    async findValid(tokenHash, now) {
      const result = await db.query<PendingTenantSelectionRow>(
        `select id, user_identity_id, ceremony_id, token_hash, expires_at, consumed_at, created_at
           from auth_pending_tenant_selection_find_valid($1, $2)`,
        [tokenHash, now]
      );
      return result.rows[0] ? toRecord(result.rows[0]) : null;
    },

    async consume(input) {
      const result = await db.query<{ consumed: boolean }>(
        `select auth_pending_tenant_selection_consume($1, $2, $3, $4, $5) as consumed`,
        [input.id, input.userIdentityId, input.ceremonyId, input.tokenHash, input.now]
      );
      return result.rows[0]?.consumed === true;
    },
  };
}
