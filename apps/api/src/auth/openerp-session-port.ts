import type {
  AuthHonoCreateSessionInput,
  AuthHonoSessionPort,
  AuthHonoSessionRecord,
} from "@sentropic/auth-hono";
import type { Queryable } from "../db/client.js";

// AuthHonoSessionPort adapter — raw pg queries against openerp_sessions.
// auth-hono's generic record deliberately has no tenant field, so OpenERP
// exposes an extended record for its host session flow. Tenantless human
// sessions are rejected before persistence and never returned from lookup.

interface SessionRow {
  id: string;
  user_identity_id: string;
  organization_id: string | null;
  session_token_hash: string;
  refresh_token_hash: string | null;
  device_name: string | null;
  ip_address: string | null;
  user_agent: string | null;
  mfa_verified: boolean;
  expires_at: Date;
  created_at: Date;
  last_activity_at: Date;
  revoked_at: Date | null;
}

export interface OpenERPSessionRecord extends AuthHonoSessionRecord {
  organizationId: string;
}

export interface OpenERPCreateSessionInput extends AuthHonoCreateSessionInput {
  organizationId: string;
}

export interface OpenERPSessionPort extends Omit<
  AuthHonoSessionPort,
  "create" | "findById" | "findByTokenHash" | "findByRefreshTokenHash" | "updateTokens" | "listForUser"
> {
  create(input: OpenERPCreateSessionInput): Promise<OpenERPSessionRecord>;
  findById(sessionId: string): Promise<OpenERPSessionRecord | null>;
  findByTokenHash(sessionTokenHash: string): Promise<OpenERPSessionRecord | null>;
  findByRefreshTokenHash(refreshTokenHash: string): Promise<OpenERPSessionRecord | null>;
  updateTokens(input: {
    expiresAt: Date;
    refreshTokenHash: string;
    sessionId: string;
    sessionTokenHash: string;
  }): Promise<OpenERPSessionRecord | null>;
  listForUser(userId: string): Promise<OpenERPSessionRecord[]>;
}

function toRecord(row: SessionRow): OpenERPSessionRecord | null {
  if (!row.organization_id) return null;
  return {
    id: row.id,
    userId: row.user_identity_id,
    organizationId: row.organization_id,
    sessionTokenHash: row.session_token_hash,
    refreshTokenHash: row.refresh_token_hash,
    deviceName: row.device_name,
    ipAddress: row.ip_address,
    userAgent: row.user_agent,
    mfaVerified: row.mfa_verified,
    expiresAt: new Date(row.expires_at),
    createdAt: new Date(row.created_at),
    lastActivityAt: new Date(row.last_activity_at),
    revokedAt: row.revoked_at ? new Date(row.revoked_at) : null,
  };
}

export function createOpenERPSessionPort(db: Queryable): OpenERPSessionPort {
  return {
    async create(input: OpenERPCreateSessionInput): Promise<OpenERPSessionRecord> {
      if (!input.organizationId) {
        throw new Error("OpenERP human sessions require an organizationId");
      }
      const result = await db.query<SessionRow>(
        `insert into openerp_sessions (
           id, user_identity_id, organization_id, session_token_hash, refresh_token_hash,
           device_name, ip_address, user_agent, mfa_verified, expires_at,
           created_at, last_activity_at
         ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $11)
         returning
           id, user_identity_id, organization_id, session_token_hash, refresh_token_hash,
           device_name, ip_address, user_agent, mfa_verified, expires_at,
           created_at, last_activity_at, revoked_at`,
        [
          input.id,
          input.userId,
          input.organizationId,
          input.sessionTokenHash,
          input.refreshTokenHash ?? null,
          input.deviceInfo?.name ?? null,
          input.deviceInfo?.ipAddress ?? null,
          input.deviceInfo?.userAgent ?? null,
          input.mfaVerified ?? false,
          input.expiresAt,
          input.now,
        ]
      );
      const record = result.rows[0] ? toRecord(result.rows[0]) : null;
      if (!record) throw new Error("OpenERP session persistence returned no organization");
      return record;
    },

    async findById(sessionId: string): Promise<OpenERPSessionRecord | null> {
      const result = await db.query<SessionRow>(
        `select id, user_identity_id, organization_id, session_token_hash, refresh_token_hash,
                device_name, ip_address, user_agent, mfa_verified, expires_at,
                created_at, last_activity_at, revoked_at
           from openerp_sessions
          where id = $1`,
        [sessionId]
      );
      return result.rows[0] ? toRecord(result.rows[0]) : null;
    },

    async findByTokenHash(sessionTokenHash: string): Promise<OpenERPSessionRecord | null> {
      const result = await db.query<SessionRow>(
        `select id, user_identity_id, organization_id, session_token_hash, refresh_token_hash,
                device_name, ip_address, user_agent, mfa_verified, expires_at,
                created_at, last_activity_at, revoked_at
           from openerp_sessions
          where session_token_hash = $1`,
        [sessionTokenHash]
      );
      return result.rows[0] ? toRecord(result.rows[0]) : null;
    },

    async findByRefreshTokenHash(refreshTokenHash: string): Promise<OpenERPSessionRecord | null> {
      const result = await db.query<SessionRow>(
        `select id, user_identity_id, organization_id, session_token_hash, refresh_token_hash,
                device_name, ip_address, user_agent, mfa_verified, expires_at,
                created_at, last_activity_at, revoked_at
           from openerp_sessions
          where refresh_token_hash = $1`,
        [refreshTokenHash]
      );
      return result.rows[0] ? toRecord(result.rows[0]) : null;
    },

    async touch(sessionId: string, now: Date): Promise<void> {
      await db.query(
        `update openerp_sessions
            set last_activity_at = $2
          where id = $1`,
        [sessionId, now]
      );
    },

    async updateTokens(input: {
      expiresAt: Date;
      refreshTokenHash: string;
      sessionId: string;
      sessionTokenHash: string;
    }): Promise<OpenERPSessionRecord | null> {
      const result = await db.query<SessionRow>(
        `update openerp_sessions
            set session_token_hash = $2,
                refresh_token_hash = $3,
                expires_at = $4
          where id = $1
          returning
            id, user_identity_id, organization_id, session_token_hash, refresh_token_hash,
            device_name, ip_address, user_agent, mfa_verified, expires_at,
            created_at, last_activity_at, revoked_at`,
        [input.sessionId, input.sessionTokenHash, input.refreshTokenHash, input.expiresAt]
      );
      return result.rows[0] ? toRecord(result.rows[0]) : null;
    },

    async revoke(sessionId: string): Promise<boolean> {
      const result = await db.query<{ id: string }>(
        `update openerp_sessions
            set revoked_at = now()
          where id = $1
            and revoked_at is null
          returning id`,
        [sessionId]
      );
      return (result.rows.length ?? 0) > 0;
    },

    async revokeAllForUser(userId: string): Promise<number> {
      const result = await db.query<{ id: string }>(
        `update openerp_sessions
            set revoked_at = now()
          where user_identity_id = $1
            and revoked_at is null
          returning id`,
        [userId]
      );
      return result.rows.length;
    },

    async listForUser(userId: string): Promise<OpenERPSessionRecord[]> {
      const result = await db.query<SessionRow>(
        `select id, user_identity_id, organization_id, session_token_hash, refresh_token_hash,
                device_name, ip_address, user_agent, mfa_verified, expires_at,
                created_at, last_activity_at, revoked_at
           from openerp_sessions
          where user_identity_id = $1
          order by created_at desc`,
        [userId]
      );
      return result.rows.flatMap((row) => {
        const record = toRecord(row);
        return record ? [record] : [];
      });
    },
  };
}
