import type { Queryable } from "../db/client";

// Repository for passkey_credentials and passkey_challenges. Credentials are
// owned by a UserIdentity (global, not tenant-scoped) — see migration 0006.

export interface PasskeyCredentialRow {
  id: string;
  userIdentityId: string;
  credentialId: string;
  publicKeyCose: string;
  signCount: number;
  transports: string[];
  aaguid: string | null;
  label: string;
  backedUp: boolean;
  deviceType: "singleDevice" | "multiDevice";
  createdAt: string;
  lastUsedAt: string | null;
}

const CREDENTIAL_COLUMNS = `
  id,
  user_identity_id as "userIdentityId",
  credential_id as "credentialId",
  public_key_cose as "publicKeyCose",
  sign_count as "signCount",
  transports,
  aaguid,
  label,
  backed_up as "backedUp",
  device_type as "deviceType",
  created_at as "createdAt",
  last_used_at as "lastUsedAt"
`;

export interface InsertPasskeyCredentialInput {
  userIdentityId: string;
  credentialId: string;
  publicKeyCose: string;
  signCount: number;
  transports: string[];
  aaguid: string | null;
  label: string;
  backedUp: boolean;
  deviceType: "singleDevice" | "multiDevice";
}

export async function insertPasskeyCredential(
  db: Queryable,
  input: InsertPasskeyCredentialInput
): Promise<PasskeyCredentialRow> {
  const result = await db.query<PasskeyCredentialRow>(
    `insert into passkey_credentials (
       user_identity_id, credential_id, public_key_cose, sign_count,
       transports, aaguid, label, backed_up, device_type
     ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     returning ${CREDENTIAL_COLUMNS}`,
    [
      input.userIdentityId,
      input.credentialId,
      input.publicKeyCose,
      input.signCount,
      input.transports,
      input.aaguid,
      input.label,
      input.backedUp,
      input.deviceType
    ]
  );
  return result.rows[0]!;
}

export async function findPasskeyCredentialById(
  db: Queryable,
  credentialId: string
): Promise<PasskeyCredentialRow | null> {
  const result = await db.query<PasskeyCredentialRow>(
    `select ${CREDENTIAL_COLUMNS}
       from passkey_credentials
      where credential_id = $1`,
    [credentialId]
  );
  return result.rows[0] ?? null;
}

export async function listPasskeyCredentialsForUser(
  db: Queryable,
  userIdentityId: string
): Promise<PasskeyCredentialRow[]> {
  const result = await db.query<PasskeyCredentialRow>(
    `select ${CREDENTIAL_COLUMNS}
       from passkey_credentials
      where user_identity_id = $1
      order by created_at asc`,
    [userIdentityId]
  );
  return result.rows;
}

export async function recordPasskeyUsage(
  db: Queryable,
  credentialId: string,
  newSignCount: number,
  at: string
): Promise<void> {
  await db.query(
    `update passkey_credentials
        set sign_count = $2, last_used_at = $3
      where credential_id = $1`,
    [credentialId, newSignCount, at]
  );
}

export async function deletePasskeyCredential(
  db: Queryable,
  credentialId: string,
  userIdentityId: string
): Promise<boolean> {
  const result = await db.query<{ id: string }>(
    `delete from passkey_credentials
      where credential_id = $1 and user_identity_id = $2
      returning id`,
    [credentialId, userIdentityId]
  );
  return result.rows.length > 0;
}

// --- challenges ---

export interface PasskeyChallengeRow {
  id: string;
  userIdentityId: string | null;
  challenge: string;
  purpose: "registration" | "authentication";
  createdAt: string;
  expiresAt: string;
}

const CHALLENGE_COLUMNS = `
  id,
  user_identity_id as "userIdentityId",
  challenge,
  purpose,
  created_at as "createdAt",
  expires_at as "expiresAt"
`;

export async function insertPasskeyChallenge(
  db: Queryable,
  input: {
    userIdentityId: string | null;
    challenge: string;
    purpose: "registration" | "authentication";
    expiresAt: string;
  }
): Promise<PasskeyChallengeRow> {
  const result = await db.query<PasskeyChallengeRow>(
    `insert into passkey_challenges (user_identity_id, challenge, purpose, expires_at)
     values ($1, $2, $3, $4)
     returning ${CHALLENGE_COLUMNS}`,
    [input.userIdentityId, input.challenge, input.purpose, input.expiresAt]
  );
  return result.rows[0]!;
}

export async function consumePasskeyChallenge(
  db: Queryable,
  challenge: string,
  purpose: "registration" | "authentication",
  asOf: string
): Promise<PasskeyChallengeRow | null> {
  // Delete-returning: the challenge is single-use and we must not allow replay.
  const result = await db.query<PasskeyChallengeRow>(
    `delete from passkey_challenges
       where challenge = $1 and purpose = $2 and expires_at > $3
     returning ${CHALLENGE_COLUMNS}`,
    [challenge, purpose, asOf]
  );
  return result.rows[0] ?? null;
}

export async function purgeExpiredPasskeyChallenges(
  db: Queryable,
  asOf: string
): Promise<number> {
  const result = await db.query<{ id: string }>(
    `delete from passkey_challenges where expires_at <= $1 returning id`,
    [asOf]
  );
  return result.rows.length;
}
