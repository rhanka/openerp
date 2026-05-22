import { generateKeyPairSync } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyJournalChain } from "@sentropic/h2a";

import {
  readAuditSigningConfig,
  readAuditVerifyConfig,
  signJournalPayload,
  verifyJournalEntrySignatures
} from "../../src/foundation/audit-signing";
import { buildApprovalJournalEntry } from "../../src/foundation/h2a-bridge";
import type { Queryable, TenantContext } from "../../src/db/client";

const context: TenantContext = {
  organizationId: "00000000-0000-0000-0000-000000000010",
  actorUserId: "00000000-0000-0000-0000-0000000000bb"
};

function emptyDb(): Queryable {
  return { async query() { return { rows: [] as never }; } };
}

function generateEd25519Pems() {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  return {
    privateKeyPem: privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
    publicKeyPem: publicKey.export({ type: "spki", format: "pem" }).toString()
  };
}

describe("audit-signing config", () => {
  it("returns null when env vars are absent", () => {
    expect(readAuditSigningConfig({})).toBeNull();
    expect(readAuditVerifyConfig({})).toBeNull();
  });

  it("returns config when all env vars are set", () => {
    const { privateKeyPem, publicKeyPem } = generateEd25519Pems();
    const env = {
      OPENERP_AUDIT_SIGNING_PRIVATE_KEY_PEM: privateKeyPem,
      OPENERP_AUDIT_SIGNING_PUBLIC_KEY_PEM: publicKeyPem,
      OPENERP_AUDIT_SIGNING_BY: "openerp-foundation-test"
    };
    const signing = readAuditSigningConfig(env);
    expect(signing).not.toBeNull();
    expect(signing!.by).toBe("openerp-foundation-test");
    expect(signing!.privateKeyPem).toContain("BEGIN PRIVATE KEY");
    expect(signing!.publicKeyPem).toContain("BEGIN PUBLIC KEY");

    const verify = readAuditVerifyConfig(env);
    expect(verify).not.toBeNull();
    expect(verify!.publicKeyPem).toBe(signing!.publicKeyPem);
  });

  it("normalizes single-line PEM with escaped newlines", () => {
    const { privateKeyPem, publicKeyPem } = generateEd25519Pems();
    const env = {
      OPENERP_AUDIT_SIGNING_PRIVATE_KEY_PEM: privateKeyPem.replace(/\n/g, "\\n"),
      OPENERP_AUDIT_SIGNING_PUBLIC_KEY_PEM: publicKeyPem.replace(/\n/g, "\\n"),
      OPENERP_AUDIT_SIGNING_BY: "openerp-foundation"
    };
    const signing = readAuditSigningConfig(env);
    expect(signing!.privateKeyPem.includes("\n")).toBe(true);
    expect(signing!.privateKeyPem.includes("\\n")).toBe(false);
  });
});

describe("audit-signing — sign and verify journal payload", () => {
  it("signs the payload (without signatures field) and verifies through h2a", async () => {
    const keys = generateEd25519Pems();
    const signing = { ...keys, by: "openerp-foundation-test" };

    const entry = await buildApprovalJournalEntry(emptyDb(), context, {
      approvalRequestId: "20000000-0000-0000-0000-000000000001",
      actorInstance: context.actorUserId,
      action: "created",
      body: {
        approvalRequestId: "20000000-0000-0000-0000-000000000001",
        action: "created",
        status: "pending"
      },
      signing
    });

    expect(entry.signatures).toBeDefined();
    expect(entry.signatures).toHaveLength(1);
    expect(entry.signatures![0]!.alg).toBe("ed25519");
    expect(entry.signatures![0]!.by).toBe("openerp-foundation-test");

    expect(
      verifyJournalEntrySignatures(entry, { publicKeyPem: keys.publicKeyPem })
    ).toBe(true);

    // Tampering with the body should invalidate the signature.
    const tampered = { ...entry, body: { ...entry.body, status: "approved" } };
    expect(
      verifyJournalEntrySignatures(tampered, { publicKeyPem: keys.publicKeyPem })
    ).toBe(false);
  });

  it("contentHash covers the attached signature so chain integrity also detects tampering", async () => {
    const keys = generateEd25519Pems();
    const signing = { ...keys, by: "openerp-foundation-test" };

    const entry = await buildApprovalJournalEntry(emptyDb(), context, {
      approvalRequestId: "20000000-0000-0000-0000-000000000002",
      actorInstance: context.actorUserId,
      action: "created",
      body: {
        approvalRequestId: "20000000-0000-0000-0000-000000000002",
        action: "created",
        status: "pending"
      },
      signing
    });

    // Replacing the signature with a benign-looking but invalid one breaks the
    // contentHash because the signature is part of the canonicalized payload.
    const swapped = {
      ...entry,
      signatures: [{ ...entry.signatures![0]!, value: Buffer.from("tampered").toString("base64") }]
    };
    const verification = verifyJournalChain([swapped]);
    expect(verification.ok).toBe(false);
  });

  it("signJournalPayload strips any prior signatures from the canonicalized input", () => {
    const keys = generateEd25519Pems();
    const sig = signJournalPayload({
      payloadWithoutSignatures: {
        id: "x",
        type: "propose",
        body: { a: 1 },
        signatures: [{ by: "ghost", alg: "ed25519", value: "AAAA" }]
      },
      signing: { ...keys, by: "openerp-foundation-test" }
    });
    expect(sig.alg).toBe("ed25519");
    expect(sig.by).toBe("openerp-foundation-test");
  });
});
