import assert from "node:assert/strict";

import { chromium } from "@playwright/test";

const webUrl = requiredUrl("OPENERP_AUTH_SMOKE_WEB_URL");
const apiUrl = requiredUrl("OPENERP_AUTH_SMOKE_API_URL");
const mailpitUrl = requiredUrl("OPENERP_AUTH_SMOKE_MAILPIT_URL");
const fixture = readFixture();

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ baseURL: webUrl.toString() });
await context.addCookies([{ name: "openerp_locale", value: "en", url: webUrl.toString() }]);
const page = await context.newPage();
const browserRequests = [];
page.on("request", (request) => browserRequests.push(request.url()));

try {
  await addVirtualAuthenticator(page);

  // 5.3(1–5): full single-membership enrollment → protected SSR → refresh →
  // UI logout/replay rejection → login again. Every browser request remains
  // on the first-party /api/v1/auth path; the four retained legacy proxy
  // endpoints are asserted unused rather than merely absent from source.
  await register(page, fixture.single.email);
  await page.waitForURL(/\/admin\/crm\/leads$/);
  await assertProtectedSsr(page);

  const registeredToken = await requireSessionToken(context);
  assertJwtClaims(registeredToken, fixture.single);
  assertCookieAttributes(await sessionCookie(context));
  await assertProtectedApi(registeredToken, 200);

  const initialCredential = await credentialFor(registeredToken);
  // The counter is whatever the authenticator reported while signing the
  // attestation, not necessarily zero: Chrome's virtual authenticator already
  // returns 1 there. Storing it verbatim is what WebAuthn asks for, and it is
  // the baseline the monotonicity check below compares against. What proves
  // registration is not an authentication use is lastUsedAt staying unset.
  assert.ok(
    Number.isInteger(initialCredential.counter) && initialCredential.counter >= 0,
    "registration must persist the authenticator's signature counter",
  );
  assert.equal(initialCredential.lastUsedAt, null, "registration must not look like an authentication use");

  await refreshSession(page);
  const refreshedToken = await requireSessionToken(context);
  assert.notEqual(refreshedToken, registeredToken, "refresh must rotate the raw session JWT");
  assertJwtClaims(refreshedToken, fixture.single);
  await assertProtectedApi(refreshedToken, 200);

  await logoutThroughScreen(page, context);
  await assertProtectedApi(refreshedToken, 401);
  await assertSessionEndpointRejected(refreshedToken);

  await login(page);
  await page.waitForURL(/\/admin\/crm\/leads$/);
  await assertProtectedSsr(page);
  const reloggedToken = await requireSessionToken(context);
  assertJwtClaims(reloggedToken, fixture.single);
  const authenticatedCredential = await credentialFor(reloggedToken);
  assert.ok(
    authenticatedCredential.counter > initialCredential.counter,
    "login must persist a monotonic WebAuthn credential counter",
  );
  assert.ok(authenticatedCredential.lastUsedAt, "login must persist credential lastUsedAt");
  await logoutThroughScreen(page, context);
  await assertProtectedApi(reloggedToken, 401);

  // 5.3(6): a second pre-provisioned user has two memberships. No application
  // cookie may exist until explicit choice; a UUID outside memberships is
  // rejected before the selected organization produces the expected JWT claim.
  await register(page, fixture.multi.email);
  await page.waitForURL(/\/select-organization/);
  await assertNoApplicationSession(context);
  await assertTenantRejected(page, fixture.multi.rejectedOrganizationId);
  await page.getByRole("radio", { name: fixture.multi.organizationId }).check();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.waitForURL(/\/admin\/crm\/leads$/);
  await assertProtectedSsr(page);
  const selectedToken = await requireSessionToken(context);
  assertJwtClaims(selectedToken, fixture.multi);
  await assertProtectedApi(selectedToken, 200);
  await logoutThroughScreen(page, context);
  await assertProtectedApi(selectedToken, 401);

  assertPlatformAuthServed(browserRequests);
  assertLegacyProxiesUnused(browserRequests);
  console.log(
    "auth cut-over screen smoke: registration, first-party JWT/SSR, refresh, logout replay, login counter, and explicit multi-org selection passed",
  );
} finally {
  await browser.close();
}

async function addVirtualAuthenticator(page) {
  const client = await page.context().newCDPSession(page);
  await client.send("WebAuthn.enable");
  await client.send("WebAuthn.addVirtualAuthenticator", {
    options: {
      automaticPresenceSimulation: true,
      hasResidentKey: true,
      hasUserVerification: true,
      isUserVerified: true,
      protocol: "ctap2",
      transport: "internal",
    },
  });
}

async function register(page, email) {
  await page.goto(`/register-passkey?returnUrl=${encodeURIComponent("/admin/crm/leads")}`);
  await page.waitForLoadState("domcontentloaded");
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Get verification code" }).click();
  await page.locator("#auth-ui-code-0").waitFor();

  const code = await waitForVerificationCode(email);
  for (const [index, digit] of [...code].entries()) {
    await page.locator(`#auth-ui-code-${index}`).fill(digit);
  }
  await page.getByRole("button", { name: "Register my WebAuthn device" }).waitFor();
  await page.getByRole("button", { name: "Register my WebAuthn device" }).click();
}

async function login(page) {
  await page.goto("/login?returnUrl=/admin/crm/leads");
  await page.waitForLoadState("domcontentloaded");
  await page.getByRole("button", { name: "Sign in with passkey" }).click();
}

async function refreshSession(page) {
  const status = await page.evaluate(async () => {
    const response = await fetch("/api/v1/auth/session/refresh", {
      credentials: "include",
      method: "POST",
    });
    return response.status;
  });
  assert.equal(status, 200, "refresh must be served by the platform host override");
}

async function logoutThroughScreen(page, context) {
  await page.locator(".st-identityMenu__trigger").click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await page.waitForURL(/\/login$/);
  await assertNoApplicationSession(context);
}

async function assertProtectedSsr(page) {
  await page.locator('[data-testid="data-source-badge"][data-source="api"]').waitFor();
}

async function assertProtectedApi(token, expectedStatus) {
  const response = await fetch(new URL("/crm/leads", apiUrl), {
    headers: { authorization: `Bearer ${token}` },
  });
  assert.equal(
    response.status,
    expectedStatus,
    `the real createJwtTenantResolver protected endpoint must return ${expectedStatus}`,
  );
}

async function assertSessionEndpointRejected(token) {
  const response = await fetch(new URL("/api/v1/auth/session", apiUrl), {
    headers: { cookie: `openerp_session=${token}` },
  });
  assert.equal(response.status, 401, "logout must revoke the persisted platform session");
}

async function credentialFor(token) {
  const response = await fetch(new URL("/api/v1/auth/credentials", apiUrl), {
    headers: { cookie: `openerp_session=${token}` },
  });
  assert.equal(response.status, 200, "credential state must remain readable through the platform route");
  const body = await response.json();
  assert.equal(body.credentials?.length, 1, "the smoke identity must own exactly one credential");
  return body.credentials[0];
}

async function assertTenantRejected(page, organizationId) {
  const status = await page.evaluate(async (id) => {
    const response = await fetch("/api/v1/auth/tenant/select", {
      body: JSON.stringify({ organizationId: id }),
      credentials: "include",
      headers: { "content-type": "application/json" },
      method: "POST",
    });
    return response.status;
  }, organizationId);
  assert.equal(status, 403, "a non-member organization must be rejected before token issuance");
}

async function requireSessionToken(context) {
  const cookie = await sessionCookie(context);
  assert.ok(cookie, "platform flow must set openerp_session");
  assert.ok(cookie.value.split(".").length === 3, "openerp_session must contain a raw JWT, not legacy JSON");
  assert.ok(!cookie.value.startsWith("%7B"), "openerp_session must never contain encoded legacy JSON");
  return cookie.value;
}

async function sessionCookie(context) {
  return (await context.cookies(webUrl.toString())).find((cookie) => cookie.name === "openerp_session");
}

async function assertNoApplicationSession(context) {
  const cookies = await context.cookies(webUrl.toString());
  assert.equal(cookies.some((cookie) => cookie.name === "openerp_session"), false, "session cookie must be cleared");
  assert.equal(cookies.some((cookie) => cookie.name === "openerp_refresh"), false, "refresh cookie must be cleared");
}

function assertCookieAttributes(cookie) {
  assert.equal(cookie.httpOnly, true, "openerp_session must remain HttpOnly");
  assert.equal(cookie.sameSite, "Lax", "openerp_session must remain SameSite=Lax");
  assert.equal(cookie.path, "/", "openerp_session must remain site-wide");
  assert.equal(cookie.secure, true, "DEV cut-over smoke is HTTPS and must use a Secure session cookie");
}

function assertJwtClaims(token, expected) {
  const [, payload] = token.split(".");
  const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  assert.equal(claims.sub, expected.userId, "session subject must be the invited identity");
  assert.equal(claims.org, expected.organizationId, "session tenant must be the selected active organization");
  assert.equal(claims.actor_type, "human", "session must be a human identity token");
  assert.deepEqual(claims.scopes, ["session"], "session must carry only the existing session scope");
}

function assertLegacyProxiesUnused(requests) {
  const legacyProxy = /\/(?:login|register-passkey)\/(?:begin|finish)(?:\?|$)/;
  const matched = requests.filter((url) => legacyProxy.test(new URL(url).pathname));
  assert.deepEqual(matched, [], "platform UI must make zero requests to retained legacy ceremony proxies");
}

function assertPlatformAuthServed(requests) {
  const paths = new Set(requests.map((url) => new URL(url).pathname));
  for (const path of [
    "/api/v1/auth/email/verify-request",
    "/api/v1/auth/email/verify-code",
    "/api/v1/auth/register/options",
    "/api/v1/auth/register/verify",
    "/api/v1/auth/login/options",
    "/api/v1/auth/login/verify",
    "/api/v1/auth/session/refresh",
    "/api/v1/auth/session",
    "/api/v1/auth/tenant/select",
  ]) {
    assert.ok(paths.has(path), `browser smoke must be served through platform auth path ${path}`);
  }
}

async function waitForVerificationCode(email) {
  const deadline = Date.now() + 45_000;
  while (Date.now() < deadline) {
    const response = await fetch(new URL("/api/v1/messages?limit=100", mailpitUrl));
    if (response.ok) {
      const payload = await response.json();
      const messages = payload.messages ?? payload.Messages ?? [];
      for (const message of messages) {
        const messageText = JSON.stringify(message).toLowerCase();
        if (!messageText.includes(email.toLowerCase())) continue;
        const detail = await fetch(new URL(`/api/v1/message/${message.ID ?? message.id}`, mailpitUrl));
        const body = detail.ok ? await detail.json() : message;
        const code = /\b(\d{6})\b/.exec(JSON.stringify(body))?.[1];
        if (code) return code;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }
  throw new Error(`Timed out waiting for a captured verification code for ${email}.`);
}

function readFixture() {
  const raw = process.env.OPENERP_AUTH_SMOKE_FIXTURE;
  if (!raw) throw new Error("OPENERP_AUTH_SMOKE_FIXTURE is required.");
  const parsed = JSON.parse(raw);
  for (const key of ["single", "multi"]) {
    assert.equal(typeof parsed[key]?.email, "string", `fixture.${key}.email is required`);
    assert.equal(typeof parsed[key]?.organizationId, "string", `fixture.${key}.organizationId is required`);
    assert.equal(typeof parsed[key]?.userId, "string", `fixture.${key}.userId is required`);
  }
  assert.equal(typeof parsed.multi.rejectedOrganizationId, "string", "fixture.multi.rejectedOrganizationId is required");
  return parsed;
}

function requiredUrl(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required.`);
  return new URL(value);
}
