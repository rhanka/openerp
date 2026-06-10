import type { OauthStateStorePort } from "@sentropic/auth-hono";

// STUB — OAuth state store is handled by OpenERP's own oidc_state table via
// A0-oidc-client, NOT through auth-hono's OauthStateStorePort.
// This stub satisfies the AuthHonoPorts interface contract.

class OpenERPOauthStateStubError extends Error {
  readonly name = "OpenERPOauthStateStubError";
  constructor() {
    super(
      "OpenERP credentials live at the Sentropic IdP (AUTH-39-A RP-only model). " +
        "Use the IdP for WebAuthn ceremonies."
    );
  }
}

export function createStubOauthStateStorePort(): OauthStateStorePort {
  const err = () => Promise.reject(new OpenERPOauthStateStubError());
  return {
    findClient: err,
    saveAuthCode: err,
    consumeAuthCode: err,
    saveTokenMeta: err,
    findTokenMeta: err,
    revokeToken: err,
    isTokenRevoked: err,
    recordDpopJti: err,
    purgeExpired: err,
  };
}
