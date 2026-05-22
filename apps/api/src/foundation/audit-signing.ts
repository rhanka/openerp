import { signCanonical, verifyCanonical, type H2AJournalEntry, type H2ASignature } from "@sentropic/h2a";

// Application-wide ed25519 signing config for audit journal entries. Tenant-
// scoped keys (per-organization keypairs in tenant_settings) are deferred until
// KMS / secret management is decided.

export interface AuditSigningConfig {
  privateKeyPem: string;
  publicKeyPem: string;
  by: string;
}

export interface AuditVerifyConfig {
  publicKeyPem: string;
}

export function readAuditSigningConfig(env: NodeJS.ProcessEnv = process.env): AuditSigningConfig | null {
  const privateKeyPem = normalizePem(env.OPENERP_AUDIT_SIGNING_PRIVATE_KEY_PEM);
  const publicKeyPem = normalizePem(env.OPENERP_AUDIT_SIGNING_PUBLIC_KEY_PEM);
  const by = env.OPENERP_AUDIT_SIGNING_BY;
  if (!privateKeyPem || !publicKeyPem || !by) return null;
  return { privateKeyPem, publicKeyPem, by };
}

export function readAuditVerifyConfig(env: NodeJS.ProcessEnv = process.env): AuditVerifyConfig | null {
  const publicKeyPem = normalizePem(env.OPENERP_AUDIT_SIGNING_PUBLIC_KEY_PEM);
  if (!publicKeyPem) return null;
  return { publicKeyPem };
}

export interface SignedJournalPayloadInput {
  // Accept any payload shape; we only canonicalize and sign whatever is passed,
  // minus any pre-existing `signatures` field to avoid recursion.
  payloadWithoutSignatures: Record<string, unknown>;
  signing: AuditSigningConfig;
}

export function signJournalPayload(input: SignedJournalPayloadInput): H2ASignature {
  const { signatures: _ignored, ...rest } = input.payloadWithoutSignatures as Record<string, unknown> & {
    signatures?: H2ASignature[];
  };
  void _ignored;
  return signCanonical(rest, {
    by: input.signing.by,
    privateKeyPem: input.signing.privateKeyPem
  });
}

export function verifyJournalEntrySignatures<TBody>(
  entry: H2AJournalEntry<TBody>,
  verify: AuditVerifyConfig
): boolean {
  const signatures = entry.signatures ?? [];
  if (signatures.length === 0) return true; // nothing to verify when signing is off
  const { protocol, version, sequence, prevHash, contentHash, signatures: _sigs, ...payloadCore } = entry;
  void protocol;
  void version;
  void sequence;
  void prevHash;
  void contentHash;
  void _sigs;
  return signatures.every((signature) =>
    verifyCanonical(payloadCore, signature, verify.publicKeyPem)
  );
}

function normalizePem(value: string | undefined): string | undefined {
  if (!value) return undefined;
  // Accept either a raw PEM with newlines or a single-line PEM where literal
  // \n have been escaped (common for shell env vars). Normalize to a real PEM.
  return value.includes("\\n") ? value.replace(/\\n/g, "\n") : value;
}
