import type { AuthHonoMagicLinkPort } from "@sentropic/auth-hono";

// STUB — Magic links live at the Sentropic IdP (AUTH-39-A RP-only model).

class OpenERPMagicLinkStubError extends Error {
  readonly name = "OpenERPMagicLinkStubError";
  constructor() {
    super(
      "OpenERP credentials live at the Sentropic IdP (AUTH-39-A RP-only model). " +
        "Use the IdP for WebAuthn ceremonies."
    );
  }
}

export function createStubMagicLinksPort(): AuthHonoMagicLinkPort {
  const err = () => Promise.reject(new OpenERPMagicLinkStubError());
  return {
    create: err,
    findValidByTokenHash: err,
    markUsed: err,
  };
}
