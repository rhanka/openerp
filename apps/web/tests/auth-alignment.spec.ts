import { createServer, type Server } from "node:http";

import { expect, test } from "@playwright/test";

const API_PORT = 4000;
const RAW_SESSION = "valid.platform.session.jwt";
const REFRESHED_SESSION = "refreshed.platform.session.jwt";
const SELECTED_SESSION = "selected.platform.session.jwt";
const LEGACY_SESSION = JSON.stringify({
  token: "legacy-session-token",
  userIdentityId: "legacy-user-id",
  organizationId: "legacy-organization-id",
});

interface ObservedRequest {
  cookie: string;
  locale: string;
  method: string;
  path: string;
}

let apiServer: Server;
let observedRequests: ObservedRequest[] = [];

test.beforeAll(async () => {
  apiServer = createServer((request, response) => {
    const path = new URL(request.url ?? "/", `http://127.0.0.1:${API_PORT}`).pathname;
    const localeHeader = request.headers["x-app-locale"];
    const observed = {
      cookie: request.headers.cookie ?? "",
      locale: Array.isArray(localeHeader) ? (localeHeader[0] ?? "") : (localeHeader ?? ""),
      method: request.method ?? "GET",
      path,
    };
    observedRequests.push(observed);

    if (path === "/api/v1/auth/session/refresh" && request.method === "POST") {
      response.setHeader("set-cookie", [
        `openerp_session=${REFRESHED_SESSION}; HttpOnly; SameSite=Lax; Path=/`,
        "openerp_refresh=refreshed-platform-refresh-token; HttpOnly; SameSite=Lax; Path=/",
      ]);
      response.setHeader("content-type", "application/json");
      response.end(JSON.stringify({ expiresAt: "2030-01-01T00:00:00.000Z" }));
      return;
    }

    if (path === "/api/v1/auth/tenant/select" && request.method === "GET") {
      response.setHeader("content-type", "application/json");
      response.end(JSON.stringify({
        memberships: [
          { organizationId: "Organization A", preferredLocale: "en" },
          { organizationId: "Organization B", preferredLocale: "fr" },
        ],
      }));
      return;
    }

    if (path === "/api/v1/auth/tenant/select" && request.method === "POST") {
      response.setHeader("set-cookie", [
        `openerp_session=${SELECTED_SESSION}; HttpOnly; SameSite=Lax; Path=/`,
        "openerp_refresh=selected-platform-refresh-token; HttpOnly; SameSite=Lax; Path=/",
      ]);
      response.setHeader("content-type", "application/json");
      response.end(JSON.stringify({ success: true }));
      return;
    }

    if (path === "/api/v1/auth/email/verify-request" && request.method === "POST") {
      response.statusCode = 400;
      response.setHeader("content-type", "application/json");
      response.end(JSON.stringify({ error: { code: "email_verification_invalid", message: "English server message" } }));
      return;
    }

    if (path !== "/api/v1/auth/session") {
      response.statusCode = 404;
      response.end();
      return;
    }

    if (request.method === "DELETE") {
      response.setHeader("set-cookie", [
        "openerp_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0",
        "openerp_refresh=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0",
      ]);
      response.setHeader("content-type", "application/json");
      response.end(JSON.stringify({ success: true }));
      return;
    }

    const validSession = [RAW_SESSION, REFRESHED_SESSION, SELECTED_SESSION]
      .some((session) => request.headers.cookie?.includes(`openerp_session=${session}`));
    if (validSession) {
      response.setHeader("content-type", "application/json");
      response.end(JSON.stringify({
        expiresAt: "2030-01-01T00:00:00.000Z",
        organizationId: "platform-organization-id",
        user: {
          displayName: "Platform user",
          email: "platform.user@example.test",
          id: "platform-user-id",
          role: "user",
        },
      }));
      return;
    }

    response.statusCode = 401;
    response.setHeader("content-type", "application/json");
    response.end(JSON.stringify({ error: { message: "SESSION_INVALID" } }));
  });
  await new Promise<void>((resolve, reject) => {
    apiServer.once("error", reject);
    apiServer.listen(API_PORT, "127.0.0.1", () => {
      apiServer.off("error", reject);
      resolve();
    });
  });
});

test.afterAll(async () => {
  await new Promise<void>((resolve, reject) => apiServer.close((error) => (error ? reject(error) : resolve())));
});

test.beforeEach(() => {
  observedRequests = [];
});

test("auth alignment accepts the legacy JSON session without a platform lookup", async ({ page, context, baseURL }) => {
  await context.clearCookies();
  await context.addCookies([{
    name: "openerp_session",
    value: LEGACY_SESSION,
    url: baseURL ?? "http://127.0.0.1:4173",
  }]);

  await page.goto("/admin/crm/leads");
  await page.waitForLoadState("domcontentloaded");

  await expect(page.getByRole("banner").locator(".st-identityMenu__trigger")).toBeVisible();
  expect(observedRequests.filter((request) => request.path === "/api/v1/auth/session")).toHaveLength(0);
});

test("auth alignment validates a raw platform JWT before populating the session", async ({ page, context, baseURL }) => {
  await context.clearCookies();
  await context.addCookies([
    { name: "openerp_locale", value: "en", url: baseURL ?? "http://127.0.0.1:4173" },
    { name: "openerp_session", value: RAW_SESSION, url: baseURL ?? "http://127.0.0.1:4173" },
  ]);

  await page.goto("/admin/crm/leads");
  await page.waitForLoadState("domcontentloaded");

  await expect(page.getByRole("banner").locator(".st-identityMenu__trigger")).toBeVisible();
  expect(observedRequests).toContainEqual(expect.objectContaining({
    cookie: `openerp_session=${RAW_SESSION}`,
    locale: "en",
    method: "GET",
    path: "/api/v1/auth/session",
  }));
});

test("auth alignment rejects an invalid raw platform JWT without breaking the route", async ({ page, context, baseURL }) => {
  await context.clearCookies();
  await context.addCookies([
    { name: "openerp_locale", value: "en", url: baseURL ?? "http://127.0.0.1:4173" },
    { name: "openerp_session", value: "invalid.platform.session.jwt", url: baseURL ?? "http://127.0.0.1:4173" },
  ]);

  await page.goto("/admin/crm/leads");
  await page.waitForLoadState("domcontentloaded");

  await expect(page.getByRole("banner").getByRole("button", { name: "Sign in" })).toBeVisible();
});

test("auth alignment pass-through forwards locale and all platform Set-Cookie headers", async ({ page, context, baseURL }) => {
  await context.clearCookies();
  await context.addCookies([
    { name: "openerp_locale", value: "fr", url: baseURL ?? "http://127.0.0.1:4173" },
    { name: "openerp_session", value: RAW_SESSION, url: baseURL ?? "http://127.0.0.1:4173" },
    { name: "openerp_refresh", value: "platform-refresh-token", url: baseURL ?? "http://127.0.0.1:4173" },
  ]);
  await page.goto("/");
  await page.waitForLoadState("domcontentloaded");

  const sessionResponse = await page.evaluate(async () => {
    const response = await fetch("/api/v1/auth/session", { credentials: "include" });
    return { body: await response.json(), status: response.status };
  });
  expect(sessionResponse.status).toBe(200);
  expect(sessionResponse.body).toMatchObject({ organizationId: "platform-organization-id" });
  expect(observedRequests).toContainEqual(expect.objectContaining({ locale: "fr", path: "/api/v1/auth/session" }));

  const refreshStatus = await page.evaluate(async () => {
    const response = await fetch("/api/v1/auth/session/refresh", { credentials: "include", method: "POST" });
    return response.status;
  });
  expect(refreshStatus).toBe(200);
  const refreshedCookies = await context.cookies();
  expect(refreshedCookies.find((cookie) => cookie.name === "openerp_session")?.value).toBe(REFRESHED_SESSION);
  expect(refreshedCookies.find((cookie) => cookie.name === "openerp_refresh")?.value)
    .toBe("refreshed-platform-refresh-token");

  const logoutStatus = await page.evaluate(async () => {
    const response = await fetch("/api/v1/auth/session", { credentials: "include", method: "DELETE" });
    return response.status;
  });
  expect(logoutStatus).toBe(200);
  const cookies = await context.cookies();
  expect(cookies.find((cookie) => cookie.name === "openerp_session")).toBeUndefined();
  expect(cookies.find((cookie) => cookie.name === "openerp_refresh")).toBeUndefined();

  const deniedStatus = await page.evaluate(async () => {
    const response = await fetch("/api/v1/auth/not-an-auth-route", { credentials: "include" });
    return response.status;
  });
  expect(deniedStatus).toBe(404);
  expect(observedRequests.some((request) => request.path === "/api/v1/auth/not-an-auth-route")).toBe(false);
});

test.describe("platform auth-ui pages", () => {
  test.skip(process.env.OPENERP_PLATFORM_AUTH_UI_ENABLED !== "1", "Requires OPENERP_PLATFORM_AUTH_UI_ENABLED=1.");

  test("renders the published login and registration components when the web flag is on", async ({
    page,
    context,
    baseURL,
  }, testInfo) => {
    await context.clearCookies();
    await context.addCookies([{
      name: "openerp_locale",
      value: "en",
      url: baseURL ?? "http://127.0.0.1:4173",
    }]);
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/login");
    await page.waitForLoadState("domcontentloaded");

    await expect(page.getByRole("heading", { level: 2, name: "Sign in" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign in with passkey" })).toBeVisible();
    await expect(page.getByLabel("Email address")).not.toBeAttached();
    await expect(page.getByRole("link", { name: "Create a passkey" })).toBeVisible();
    const loginScreenshot = testInfo.outputPath("platform-auth-ui-login-en.png");
    await page.locator("main").screenshot({ path: loginScreenshot });
    await testInfo.attach("platform auth-ui login EN", { path: loginScreenshot, contentType: "image/png" });

    await context.clearCookies();
    await context.addCookies([{
      name: "openerp_locale",
      value: "fr",
      url: baseURL ?? "http://127.0.0.1:4173",
    }]);
    await page.setViewportSize({ width: 320, height: 640 });
    await page.goto("/register-passkey");
    await page.waitForLoadState("domcontentloaded");

    await expect(page.getByRole("heading", { level: 2, name: "Créer un compte" })).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByRole("button", { name: "Obtenir un code" })).toBeVisible();
    await page.getByLabel("Email").fill("platform.user@example.test");
    const verificationResponse = page.waitForResponse((response) =>
      response.url().endsWith("/api/v1/auth/email/verify-request"),
    );
    await page.getByRole("button", { name: "Obtenir un code" }).click();
    expect((await verificationResponse).status()).toBe(400);
    await expect(page.getByText("Le code de vérification est invalide ou expiré.")).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    const registerScreenshot = testInfo.outputPath("platform-auth-ui-register-fr-320.png");
    await page.locator("main").screenshot({ path: registerScreenshot });
    await testInfo.attach("platform auth-ui register FR 320", { path: registerScreenshot, contentType: "image/png" });

    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/select-organization?returnUrl=/admin/crm/leads");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByRole("heading", { name: "Choisir une organisation" })).toBeVisible();
    const continueButton = page.getByRole("button", { name: "Continuer" });
    await expect(continueButton).toBeDisabled();
    await page.getByRole("radio", { name: "Organization A" }).check();
    await expect(continueButton).toBeEnabled();
    const tenantSelectionResponse = page.waitForResponse((response) =>
      response.url().endsWith("/api/v1/auth/tenant/select") && response.request().method() === "POST",
    );
    await continueButton.click();
    expect((await tenantSelectionResponse).status()).toBe(200);
    await page.waitForURL((url) => url.pathname === "/admin/crm/leads");
    expect(observedRequests).toContainEqual(expect.objectContaining({
      method: "POST",
      path: "/api/v1/auth/tenant/select",
    }));
  });

  test("falls back to the legacy logout bridge when a legacy session reaches the flag-on shell", async ({
    page,
    context,
    baseURL,
  }) => {
    await context.clearCookies();
    await page.setViewportSize({ width: 375, height: 812 });
    await context.addCookies([
      { name: "openerp_locale", value: "en", url: baseURL ?? "http://127.0.0.1:4173" },
      { name: "openerp_session", value: LEGACY_SESSION, url: baseURL ?? "http://127.0.0.1:4173" },
      { name: "openerp_refresh", value: "legacy-refresh-token", url: baseURL ?? "http://127.0.0.1:4173" },
    ]);
    await page.goto("/admin/crm/leads");
    await page.waitForLoadState("domcontentloaded");

    await page.getByRole("button", { name: /open.*navigation|ouvrir.*navigation/i }).click();
    const drawer = page.locator("#primary-nav");
    await expect(drawer).toBeVisible();
    await drawer.locator(".st-identityMenu__trigger").click();
    await expect(page.getByRole("menu")).toBeVisible();
    await page.getByRole("menuitem", { name: /sign out|déconnecter/i }).click();
    await page.waitForURL(/\/login$/);
    const cookies = await context.cookies();
    expect(cookies.find((cookie) => cookie.name === "openerp_session")).toBeUndefined();
    expect(cookies.find((cookie) => cookie.name === "openerp_refresh")).toBeUndefined();
  });
});
