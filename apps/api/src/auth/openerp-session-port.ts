import type {
  AuthHonoCreateSessionInput,
  AuthHonoSessionPort,
  AuthHonoSessionRecord,
} from "@sentropic/auth-hono";
import type { Queryable } from "../db/client.js";

// AuthHonoSessionPort adapter — raw pg queries against openerp_sessions.
//
// NOTE: auth-hono's SessionRecord does NOT carry organization_id; that column
// lives in the DB row but is ignored here. OpenERP derives org context from its
// own session/JWT layer elsewhere (AUTH-39-A RP model).

interface SessionRow {
  id: string;
  user_identity_id: string;
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

function toRecord(row: SessionRow): AuthHonoSessionRecord {
  return {
    id: row.id,
    userId: row.user_identity_id,
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

export function createOpenERPSessionPort(db: Queryable): AuthHonoSessionPort {
  return {
    async create(input: AuthHonoCreateSessionInput): Promise<AuthHonoSessionRecord> {
      const result = await db.query<SessionRow>(
        `insert into openerp_sessions (
           id, user_identity_id, session_token_hash, refresh_token_hash,
           device_name, ip_address, user_agent, mfa_verified, expires_at,
           created_at, last_activity_at
         ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10)
         returning
           id, user_identity_id, session_token_hash, refresh_token_hash,
           device_name, ip_address, user_agent, mfa_verified, expires_at,
           created_at, last_activity_at, revoked_at`,
        [
          input.id,
          input.userId,
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
      return toRecord(result.rows[0]!);
    },

    async findById(sessionId: string): Promise<AuthHonoSessionRecord | null> {
      const result = await db.query<SessionRow>(
        `select id, user_identity_id, session_token_hash, refresh_token_hash,
                device_name, ip_address, user_agent, mfa_verified, expires_at,
                created_at, last_activity_at, revoked_at
           from openerp_sessions
          where id = $1`,
        [sessionId]
      );
      return result.rows[0] ? toRecord(result.rows[0]) : null;
    },

    async findByTokenHash(sessionTokenHash: string): Promise<AuthHonoSessionRecord | null> {
      const result = await db.query<SessionRow>(
        `select id, user_identity_id, session_token_hash, refresh_token_hash,
                device_name, ip_address, user_agent, mfa_verified, expires_at,
                created_at, last_activity_at, revoked_at
           from openerp_sessions
          where session_token_hash = $1`,
        [sessionTokenHash]
      );
      return result.rows[0] ? toRecord(result.rows[0]) : null;
    },

    async findByRefreshTokenHash(refreshTokenHash: string): Promise<AuthHonoSessionRecord | null> {
      const result = await db.query<SessionRow>(
        `select id, user_identity_id, session_token_hash, refresh_token_hash,
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
    }): Promise<AuthHonoSessionRecord | null> {
      const result = await db.query<SessionRow>(
        `update openerp_sessions
            set session_token_hash = $2,
                refresh_token_hash = $3,
                expires_at = $4
          where id = $1
          returning
            id, user_identity_id, session_token_hash, refresh_token_hash,
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

    async listForUser(userId: string): Promise<AuthHonoSessionRecord[]> {
      const result = await db.query<SessionRow>(
        `select id, user_identity_id, session_token_hash, refresh_token_hash,
                device_name, ip_address, user_agent, mfa_verified, expires_at,
                created_at, last_activity_at, revoked_at
           from openerp_sessions
          where user_identity_id = $1
          order by created_at desc`,
        [userId]
      );
      return result.rows.map(toRecord);
    },
  };
}
