// Compile-only contract for the exact platform packages pinned in Lot 0.
// This module is deliberately not imported by application code: Lots 0–1 do
// not mount the router or replace a web screen.
import AuthLogin from "@sentropic/auth-ui/components/AuthLogin.svelte";
import AuthRegister from "@sentropic/auth-ui/components/AuthRegister.svelte";
import { createDefaultFetchTransport } from "@sentropic/auth-ui/transport-fetch";
import { createAuthCredentialRouteHandlers } from "@sentropic/auth-hono/credential-route-handlers";
import { createAuthEmailRouteHandlers } from "@sentropic/auth-hono/route-handlers";
import { createAuthRouter } from "@sentropic/auth-hono/router";
import { createAuthSessionRouteHandlers } from "@sentropic/auth-hono/session-route-handlers";
import { createAuthEmailVerificationService } from "@sentropic/auth-hono/email-verification";
import { createAuthWebAuthnAuthenticationRouteHandlers } from "@sentropic/auth-hono/webauthn-authentication-route-handlers";
import { createAuthWebAuthnAuthenticationService } from "@sentropic/auth-hono/webauthn-authentication";
import { createAuthWebAuthnRegistrationRouteHandlers } from "@sentropic/auth-hono/webauthn-registration-route-handlers";
import { createAuthWebAuthnRegistrationService } from "@sentropic/auth-hono/webauthn-registration";

void [
  AuthLogin,
  AuthRegister,
  createDefaultFetchTransport,
  createAuthRouter,
  createAuthWebAuthnRegistrationService,
  createAuthWebAuthnRegistrationRouteHandlers,
  createAuthWebAuthnAuthenticationService,
  createAuthWebAuthnAuthenticationRouteHandlers,
  createAuthEmailVerificationService,
  createAuthEmailRouteHandlers,
  createAuthSessionRouteHandlers,
  createAuthCredentialRouteHandlers,
];
