import type { AuthHonoEmailDeliveryPort } from "@sentropic/auth-hono";

// STUB — Email delivery lives at the Sentropic IdP (AUTH-39-A RP-only model).

class OpenERPEmailDeliveryStubError extends Error {
  readonly name = "OpenERPEmailDeliveryStubError";
  constructor() {
    super(
      "OpenERP credentials live at the Sentropic IdP (AUTH-39-A RP-only model). " +
        "Use the IdP for WebAuthn ceremonies."
    );
  }
}

export function createStubEmailDeliveryPort(): AuthHonoEmailDeliveryPort {
  const err = () => Promise.reject(new OpenERPEmailDeliveryStubError());
  return {
    sendVerificationCode: err,
    sendMagicLink: err,
  };
}
