import { Buffer } from "node:buffer";

import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse
} from "@simplewebauthn/server";
import type {
  AuthenticationResponseJSON,
  AuthenticatorTransportFuture,
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON
} from "@simplewebauthn/server";

import type { UserIdentity } from "@sentropic/openerp-domain";

import type { Queryable } from "../db/client";
import {
  consumePasskeyChallenge,
  findPasskeyCredentialById,
  insertPasskeyChallenge,
  insertPasskeyCredential,
  listPasskeyCredentialsForUser,
  recordPasskeyUsage,
  type PasskeyCredentialRow
} from "./passkey-credentials";

// Passkey / WebAuthn service (PG-02 Lot 2). Wraps @simplewebauthn/server with
// the persistence layer and a challenge cache so registration / authentication
// ceremonies survive the inevitable cross-pod hop between /begin and /finish.
//
// The service is intentionally identity-only: it returns the verified
// UserIdentity on success and lets the caller mint the session JWT via the
// existing IdentityProvider. That keeps the auth surface (passkey) decoupled
// from the session surface (RFC 8693 tokens).

export interface PasskeyServiceOptions {
  rpName: string;
  rpID: string;
  expectedOrigin: string | string[];
  challengeTtlSeconds?: number;
  requireUserVerification?: boolean;
  now?: () => Date;
}

export class PasskeyError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

export interface RegistrationBeginInput {
  identity: UserIdentity;
}

export interface RegistrationFinishInput {
  identity: UserIdentity;
  response: RegistrationResponseJSON;
  label?: string;
}

export interface AuthenticationBeginInput {
  // Optional: when provided, the resulting allowCredentials list is restricted
  // to that user's existing passkeys. Omit for usernameless (discoverable) flow.
  identity?: UserIdentity;
}

export interface AuthenticationFinishResult {
  userIdentityId: string;
  credentialId: string;
  newSignCount: number;
}

function bufferFromBase64Url(value: string): Uint8Array<ArrayBuffer> {
  const buf = Buffer.from(value, "base64url");
  const ab = new ArrayBuffer(buf.byteLength);
  const out = new Uint8Array(ab);
  out.set(buf);
  return out;
}

function bufferToBase64Url(value: Uint8Array | Buffer): string {
  return Buffer.from(value).toString("base64url");
}

function transportsAsRow(
  transports: AuthenticatorTransportFuture[] | undefined
): string[] {
  return (transports ?? []) as string[];
}

function rowTransportsAsLib(row: PasskeyCredentialRow): AuthenticatorTransportFuture[] {
  return row.transports as AuthenticatorTransportFuture[];
}

export interface PasskeyService {
  beginRegistration(
    db: Queryable,
    input: RegistrationBeginInput
  ): Promise<PublicKeyCredentialCreationOptionsJSON>;
  finishRegistration(
    db: Queryable,
    input: RegistrationFinishInput
  ): Promise<PasskeyCredentialRow>;
  beginAuthentication(
    db: Queryable,
    input: AuthenticationBeginInput
  ): Promise<PublicKeyCredentialRequestOptionsJSON>;
  finishAuthentication(
    db: Queryable,
    response: AuthenticationResponseJSON
  ): Promise<AuthenticationFinishResult>;
}

export function createPasskeyService(options: PasskeyServiceOptions): PasskeyService {
  const challengeTtlSeconds = options.challengeTtlSeconds ?? 300;
  const requireUserVerification = options.requireUserVerification ?? true;
  const now = options.now ?? (() => new Date());

  function expiresAtIso(): string {
    return new Date(now().getTime() + challengeTtlSeconds * 1000).toISOString();
  }

  return {
    async beginRegistration(db, { identity }) {
      const existing = await listPasskeyCredentialsForUser(db, identity.id);
      const opts = await generateRegistrationOptions({
        rpName: options.rpName,
        rpID: options.rpID,
        userName: identity.email,
        userDisplayName: identity.displayName,
        userID: new TextEncoder().encode(identity.id),
        attestationType: "none",
        excludeCredentials: existing.map((c) => ({
          id: c.credentialId,
          transports: rowTransportsAsLib(c)
        })),
        authenticatorSelection: {
          residentKey: "preferred",
          userVerification: requireUserVerification ? "required" : "preferred"
        }
      });
      await insertPasskeyChallenge(db, {
        userIdentityId: identity.id,
        challenge: opts.challenge,
        purpose: "registration",
        expiresAt: expiresAtIso()
      });
      return opts;
    },

    async finishRegistration(db, { identity, response, label }) {
      const challenge = response.response.clientDataJSON
        ? extractChallenge(response.response.clientDataJSON)
        : null;
      if (!challenge) {
        throw new PasskeyError("PASSKEY_CHALLENGE_MISSING", "Registration response is missing a challenge");
      }
      const consumed = await consumePasskeyChallenge(db, challenge, "registration", now().toISOString());
      if (!consumed || consumed.userIdentityId !== identity.id) {
        throw new PasskeyError(
          "PASSKEY_CHALLENGE_INVALID",
          "Registration challenge is unknown, expired, or does not match the user"
        );
      }
      const verification = await verifyRegistrationResponse({
        response,
        expectedChallenge: challenge,
        expectedOrigin: options.expectedOrigin,
        expectedRPID: options.rpID,
        requireUserVerification
      });
      if (!verification.verified || !verification.registrationInfo) {
        throw new PasskeyError("PASSKEY_REGISTRATION_REJECTED", "Authenticator response failed verification");
      }
      const { credential, credentialDeviceType, credentialBackedUp, aaguid } =
        verification.registrationInfo;
      const credentialIdBase64 = credential.id;
      const publicKeyBase64 = bufferToBase64Url(credential.publicKey);
      return insertPasskeyCredential(db, {
        userIdentityId: identity.id,
        credentialId: credentialIdBase64,
        publicKeyCose: publicKeyBase64,
        signCount: credential.counter,
        transports: transportsAsRow(response.response.transports as AuthenticatorTransportFuture[]),
        aaguid: aaguid && aaguid !== "00000000-0000-0000-0000-000000000000" ? aaguid : null,
        label: label ?? defaultLabel(now()),
        backedUp: credentialBackedUp,
        deviceType: credentialDeviceType
      });
    },

    async beginAuthentication(db, { identity }) {
      const allowCredentials = identity
        ? (await listPasskeyCredentialsForUser(db, identity.id)).map((c) => ({
            id: c.credentialId,
            transports: rowTransportsAsLib(c)
          }))
        : undefined;
      const opts = await generateAuthenticationOptions({
        rpID: options.rpID,
        ...(allowCredentials ? { allowCredentials } : {}),
        userVerification: requireUserVerification ? "required" : "preferred"
      });
      await insertPasskeyChallenge(db, {
        userIdentityId: identity?.id ?? null,
        challenge: opts.challenge,
        purpose: "authentication",
        expiresAt: expiresAtIso()
      });
      return opts;
    },

    async finishAuthentication(db, response) {
      const challenge = response.response.clientDataJSON
        ? extractChallenge(response.response.clientDataJSON)
        : null;
      if (!challenge) {
        throw new PasskeyError("PASSKEY_CHALLENGE_MISSING", "Authentication response is missing a challenge");
      }
      const consumed = await consumePasskeyChallenge(db, challenge, "authentication", now().toISOString());
      if (!consumed) {
        throw new PasskeyError(
          "PASSKEY_CHALLENGE_INVALID",
          "Authentication challenge is unknown or expired"
        );
      }
      const stored = await findPasskeyCredentialById(db, response.id);
      if (!stored) {
        throw new PasskeyError(
          "PASSKEY_CREDENTIAL_UNKNOWN",
          "No matching passkey credential for this authenticator"
        );
      }
      if (consumed.userIdentityId && consumed.userIdentityId !== stored.userIdentityId) {
        throw new PasskeyError(
          "PASSKEY_CREDENTIAL_USER_MISMATCH",
          "Credential is not owned by the user that started the ceremony"
        );
      }
      const verification = await verifyAuthenticationResponse({
        response,
        expectedChallenge: challenge,
        expectedOrigin: options.expectedOrigin,
        expectedRPID: options.rpID,
        credential: {
          id: stored.credentialId,
          publicKey: bufferFromBase64Url(stored.publicKeyCose),
          counter: stored.signCount,
          transports: rowTransportsAsLib(stored)
        },
        requireUserVerification
      });
      if (!verification.verified) {
        throw new PasskeyError("PASSKEY_AUTHENTICATION_REJECTED", "Authenticator response failed verification");
      }
      const { newCounter } = verification.authenticationInfo;
      // A non-zero sign_count that does NOT increase is a strong signal of a
      // cloned authenticator (WebAuthn §6.1.1 step 17). Reject and force a
      // re-enrollment of the credential. Counter==0 means the authenticator
      // does not implement counters, which is permitted.
      if (stored.signCount > 0 && newCounter !== 0 && newCounter <= stored.signCount) {
        throw new PasskeyError(
          "PASSKEY_COUNTER_REPLAY",
          "Authenticator sign-count did not advance, possible clone"
        );
      }
      await recordPasskeyUsage(db, stored.credentialId, newCounter, now().toISOString());
      return {
        userIdentityId: stored.userIdentityId,
        credentialId: stored.credentialId,
        newSignCount: newCounter
      };
    }
  };
}

function extractChallenge(clientDataJsonBase64Url: string): string | null {
  try {
    const json = Buffer.from(clientDataJsonBase64Url, "base64url").toString("utf8");
    const parsed = JSON.parse(json) as { challenge?: string };
    return parsed.challenge ?? null;
  } catch {
    return null;
  }
}

function defaultLabel(d: Date): string {
  return `Passkey created ${d.toISOString().slice(0, 10)}`;
}
