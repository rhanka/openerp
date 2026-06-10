import type { AuthHonoCredentialPort } from "@sentropic/auth-hono";

// STUB — WebAuthn credentials live at the Sentropic IdP, not at OpenERP.
// OpenERP is an OIDC RP in the AUTH-39-A model; it does not run WebAuthn ceremonies.
// These stubs satisfy the AuthHonoPorts interface contract.

class OpenERPCredentialStubError extends Error {
  readonly name = "OpenERPCredentialStubError";
  constructor() {
    super(
      "OpenERP credentials live at the Sentropic IdP (AUTH-39-A RP-only model). " +
        "Use the IdP for WebAuthn ceremonies."
    );
  }
}

export function createStubCredentialsPort(): AuthHonoCredentialPort {
  const err = () => Promise.reject(new OpenERPCredentialStubError());
  return {
    findById: err,
    findByCredentialId: err,
    listForUser: err,
    create: err,
    updateCounter: err,
    rename: err,
    revoke: err,
  };
}
