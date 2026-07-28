import type {
  AuthHonoEmailVerificationPort,
  AuthHonoEmailVerificationRecord,
} from "@sentropic/auth-hono";
import type { Queryable } from "../db/client.js";

interface EmailVerificationRow {
  id: string;
  email: string;
  code_hash: string;
  verification_token: string | null;
  expires_at: Date;
  used: boolean;
  created_at: Date;
}

export class OpenERPEmailVerificationAlreadyUsedError extends Error {
  readonly name = "OpenERPEmailVerificationAlreadyUsedError";

  constructor() {
    super("Email verification code was already used, expired, or missing.");
  }
}

function toRecord(row: EmailVerificationRow): AuthHonoEmailVerificationRecord {
  return {
    id: row.id,
    email: row.email,
    codeHash: row.code_hash,
    verificationToken: row.verification_token,
    expiresAt: new Date(row.expires_at),
    used: row.used,
    createdAt: new Date(row.created_at),
  };
}

export function createOpenERPEmailVerificationPort(
  db: Queryable
): AuthHonoEmailVerificationPort {
  return {
    async countRecent(email: string, since: Date): Promise<number> {
      const result = await db.query<{ n: string }>(
        `select auth_email_verification_count_recent($1, $2) as n`,
        [email, since]
      );
      return Number(result.rows[0]?.n ?? "0");
    },

    async createCode(input): Promise<AuthHonoEmailVerificationRecord> {
      const result = await db.query<EmailVerificationRow>(
        `select * from auth_email_verification_create($1, $2, $3, $4)`,
        [input.email, input.codeHash, input.expiresAt, input.now]
      );
      return toRecord(result.rows[0]!);
    },

    async findLatestValidCode(
      email: string,
      codeHash: string,
      now: Date
    ): Promise<AuthHonoEmailVerificationRecord | null> {
      const result = await db.query<EmailVerificationRow>(
        `select * from auth_email_verification_find_latest_valid($1, $2, $3)`,
        [email, codeHash, now]
      );
      return result.rows[0] ? toRecord(result.rows[0]) : null;
    },

    async markUsedWithVerificationToken(id: string, verificationToken: string): Promise<void> {
      const result = await db.query<{ consumed: boolean }>(
        `select auth_email_verification_consume($1, $2) as consumed`,
        [id, verificationToken]
      );
      if (!result.rows[0]?.consumed) {
        throw new OpenERPEmailVerificationAlreadyUsedError();
      }
    },

    async verifyToken(email: string, verificationToken: string, now: Date): Promise<boolean> {
      const result = await db.query<{ verified: boolean }>(
        `select auth_email_verification_verify_token($1, $2, $3) as verified`,
        [email, verificationToken, now]
      );
      return result.rows[0]?.verified ?? false;
    },
  };
}
