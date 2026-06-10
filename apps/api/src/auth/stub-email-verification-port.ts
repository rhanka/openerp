import type { AuthHonoEmailVerificationPort } from "@sentropic/auth-hono";

// STUB — Email verification lives at the Sentropic IdP (AUTH-39-A RP-only model).

class OpenERPEmailVerificationStubError extends Error {
  readonly name = "OpenERPEmailVerificationStubError";
  constructor() {
    super(
      "OpenERP credentials live at the Sentropic IdP (AUTH-39-A RP-only model). " +
        "Use the IdP for WebAuthn ceremonies."
    );
  }
}

export function createStubEmailVerificationPort(): AuthHonoEmailVerificationPort {
  const err = () => Promise.reject(new OpenERPEmailVerificationStubError());
  return {
    countRecent: err,
    createCode: err,
    findLatestValidCode: err,
    markUsedWithVerificationToken: err,
    verifyToken: err,
  };
}
