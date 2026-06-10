import type { AuthHonoChallengePort } from "@sentropic/auth-hono";

// STUB — WebAuthn challenges live at the Sentropic IdP (AUTH-39-A RP-only model).

class OpenERPChallengeStubError extends Error {
  readonly name = "OpenERPChallengeStubError";
  constructor() {
    super(
      "OpenERP credentials live at the Sentropic IdP (AUTH-39-A RP-only model). " +
        "Use the IdP for WebAuthn ceremonies."
    );
  }
}

export function createStubChallengesPort(): AuthHonoChallengePort {
  const err = () => Promise.reject(new OpenERPChallengeStubError());
  return {
    create: err,
    findValid: err,
    markUsed: err,
    purgeExpired: err,
  };
}
