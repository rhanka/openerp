import { Buffer } from "node:buffer";

import type {
  AuthHonoCreateCredentialInput,
  AuthHonoCredentialPort,
  AuthHonoCredentialRecord,
} from "@sentropic/auth-hono";
import type { Queryable } from "../db/client.js";

interface CredentialRow {
  id: string;
  user_identity_id: string;
  credential_id: string;
  public_key_cose: string;
  sign_count: number | string;
  transports: string[] | null;
  label: string;
  backed_up: boolean;
  device_type: string;
  created_at: Date;
  last_used_at: Date | null;
}

const CREDENTIAL_COLUMNS = `
  id, user_identity_id, credential_id, public_key_cose, sign_count,
  transports, label, backed_up, device_type, created_at, last_used_at
`;

function toRecord(row: CredentialRow): AuthHonoCredentialRecord {
  return {
    id: row.id,
    userId: row.user_identity_id,
    credentialId: row.credential_id,
    publicKey: decodeBase64Url(row.public_key_cose),
    counter: Number(row.sign_count),
    transports: row.transports,
    name: row.label,
    deviceType: row.device_type,
    backedUp: row.backed_up,
    lastUsedAt: row.last_used_at ? new Date(row.last_used_at) : null,
    createdAt: new Date(row.created_at),
    // Credential revocation is an ownership-checked hard delete in OpenERP.
    revokedAt: null,
  };
}

function decodeBase64Url(value: string): Uint8Array {
  const decoded = Buffer.from(value, "base64url");
  return new Uint8Array(decoded);
}

function encodePublicKey(value: AuthHonoCreateCredentialInput["publicKey"]): string {
  if (value instanceof Uint8Array) {
    return Buffer.from(value).toString("base64url");
  }
  if (value instanceof ArrayBuffer) {
    return Buffer.from(new Uint8Array(value)).toString("base64url");
  }
  // The platform type permits serialized keys. Treat a string as base64url so
  // the stored form remains the documented COSE binary representation.
  return Buffer.from(value, "base64url").toString("base64url");
}

export function createOpenERPCredentialPort(db: Queryable): AuthHonoCredentialPort {
  return {
    async findById(credentialRecordId: string): Promise<AuthHonoCredentialRecord | null> {
      const result = await db.query<CredentialRow>(
        `select ${CREDENTIAL_COLUMNS}
           from passkey_credentials
          where id = $1`,
        [credentialRecordId]
      );
      return result.rows[0] ? toRecord(result.rows[0]) : null;
    },

    async findByCredentialId(credentialId: string): Promise<AuthHonoCredentialRecord | null> {
      const result = await db.query<CredentialRow>(
        `select ${CREDENTIAL_COLUMNS}
           from passkey_credentials
          where credential_id = $1`,
        [credentialId]
      );
      return result.rows[0] ? toRecord(result.rows[0]) : null;
    },

    async listForUser(userId: string): Promise<AuthHonoCredentialRecord[]> {
      const result = await db.query<CredentialRow>(
        `select ${CREDENTIAL_COLUMNS}
           from passkey_credentials
          where user_identity_id = $1
          order by created_at asc`,
        [userId]
      );
      return result.rows.map(toRecord);
    },

    async create(input: AuthHonoCreateCredentialInput): Promise<AuthHonoCredentialRecord> {
      const result = await db.query<CredentialRow>(
        `insert into passkey_credentials (
           user_identity_id, credential_id, public_key_cose, sign_count,
           transports, label, backed_up, device_type
         ) values ($1, $2, $3, $4, $5, $6, $7, $8)
         returning ${CREDENTIAL_COLUMNS}`,
        [
          input.userId,
          input.credentialId,
          encodePublicKey(input.publicKey),
          input.counter,
          input.transports ?? [],
          input.name ?? "Unknown Device",
          input.backedUp ?? false,
          input.deviceType ?? "singleDevice",
        ]
      );
      return toRecord(result.rows[0]!);
    },

    async updateCounter(credentialId: string, counter: number, lastUsedAt?: Date): Promise<void> {
      await db.query(
        `update passkey_credentials
            set sign_count = greatest(sign_count, $2),
                last_used_at = case
                  when $3::timestamptz is null then last_used_at
                  when last_used_at is null or $3::timestamptz > last_used_at then $3::timestamptz
                  else last_used_at
                end
          where credential_id = $1`,
        [credentialId, counter, lastUsedAt ?? null]
      );
    },

    async rename(
      credentialRecordId: string,
      userId: string,
      name: string
    ): Promise<AuthHonoCredentialRecord | null> {
      const result = await db.query<CredentialRow>(
        `update passkey_credentials
            set label = $3
          where id = $1 and user_identity_id = $2
          returning ${CREDENTIAL_COLUMNS}`,
        [credentialRecordId, userId, name]
      );
      return result.rows[0] ? toRecord(result.rows[0]) : null;
    },

    async revoke(credentialRecordId: string, userId: string): Promise<boolean> {
      const result = await db.query<{ id: string }>(
        `delete from passkey_credentials
          where id = $1 and user_identity_id = $2
          returning id`,
        [credentialRecordId, userId]
      );
      return result.rows.length > 0;
    },
  };
}
