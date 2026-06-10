import type { JwksPort } from "@sentropic/auth-hono";

// STUB — JWKS is handled by the Sentropic IdP. OpenERP verifies IdP tokens via
// jose.createRemoteJWKSet, not via auth-hono's JwksPort.
// This stub satisfies the AuthHonoPorts interface contract.

class OpenERPJwksStubError extends Error {
  readonly name = "OpenERPJwksStubError";
  constructor() {
    super(
      "OpenERP credentials live at the Sentropic IdP (AUTH-39-A RP-only model). " +
        "Use the IdP for WebAuthn ceremonies."
    );
  }
}

export function createStubJwksPort(): JwksPort {
  const err = () => Promise.reject(new OpenERPJwksStubError());
  return {
    getActiveKey: err,
    findKeyByKid: err,
    listPublicKeys: err,
  };
}
