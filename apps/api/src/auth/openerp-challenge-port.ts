import type {
  AuthHonoChallengePort,
  AuthHonoChallengeRecord,
  AuthHonoChallengeType,
  AuthHonoCreateChallengeInput,
} from "@sentropic/auth-hono";
import type { Queryable } from "../db/client.js";

interface ChallengeRow {
  id: string;
  challenge: string;
  user_identity_id: string | null;
  purpose: AuthHonoChallengeType;
  expires_at: Date;
  created_at: Date;
}

const CHALLENGE_COLUMNS = `
  id, challenge, user_identity_id, purpose, expires_at, created_at
`;

export class OpenERPChallengeAlreadyUsedError extends Error {
  readonly name = "OpenERPChallengeAlreadyUsedError";

  constructor() {
    super("Challenge was already used or no longer exists.");
  }
}

function toRecord(row: ChallengeRow): AuthHonoChallengeRecord {
  return {
    id: row.id,
    challenge: row.challenge,
    userId: row.user_identity_id,
    type: row.purpose,
    expiresAt: new Date(row.expires_at),
    // Legacy storage deletes a challenge once used. A fetched live row is
    // therefore always unused.
    used: false,
    createdAt: new Date(row.created_at),
  };
}

export function createOpenERPChallengePort(db: Queryable): AuthHonoChallengePort {
  return {
    async create(input: AuthHonoCreateChallengeInput): Promise<AuthHonoChallengeRecord> {
      const result = await db.query<ChallengeRow>(
        `insert into passkey_challenges (
           user_identity_id, challenge, purpose, expires_at
         ) values ($1, $2, $3, $4)
         returning ${CHALLENGE_COLUMNS}`,
        [input.userId ?? null, input.challenge, input.type, input.expiresAt]
      );
      return toRecord(result.rows[0]!);
    },

    async findValid(
      challenge: string,
      type: AuthHonoChallengeType
    ): Promise<AuthHonoChallengeRecord | null> {
      const result = await db.query<ChallengeRow>(
        `select ${CHALLENGE_COLUMNS}
           from passkey_challenges
          where challenge = $1
            and purpose = $2
            and expires_at > now()
          order by created_at desc
          limit 1`,
        [challenge, type]
      );
      return result.rows[0] ? toRecord(result.rows[0]) : null;
    },

    async markUsed(challenge: string): Promise<void> {
      // DELETE ... RETURNING is the single atomic consumption operation. The
      // second concurrent caller gets no row and cannot complete a ceremony.
      const result = await db.query<{ id: string }>(
        `delete from passkey_challenges
          where challenge = $1
          returning id`,
        [challenge]
      );
      if (result.rows.length === 0) {
        throw new OpenERPChallengeAlreadyUsedError();
      }
    },

    async purgeExpired(now: Date): Promise<number> {
      const result = await db.query<{ id: string }>(
        `delete from passkey_challenges
          where expires_at <= $1
          returning id`,
        [now]
      );
      return result.rows.length;
    },
  };
}
