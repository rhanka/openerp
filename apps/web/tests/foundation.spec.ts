import { expect, test } from "@playwright/test";

const authScreenSelectors = {
  loginButton: /Se connecter avec WebAuthn|Sign in with passkey/i,
  registerAction: /Obtenir un code|Get verification code/i,
  registerHeading: /Créer un compte|Create an account/
};

test("foundation shell exposes admin navigation without layout overlap", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "OpenERP" })).toBeVisible();
  // UXDR-009: IA niveau 1 — les 5 modules sont des liens dans la nav du header ;
  // les sous-items (Users, Roles…) vivent dans le panneau gauche du module actif.
  await expect(page.getByRole("link", { name: "CRM" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Projects" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Billing" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Reporting" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Admin" })).toBeVisible();
});

test("admin module route exposes admin sub-navigation in the panel", async ({ page }) => {
  await page.goto("/admin/users");
  await expect(page.getByRole("link", { name: "Users" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Roles" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Approvals" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Audit" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Settings" })).toBeVisible();
});

test("settings page shows self-hosted update state", async ({ page }) => {
  await page.goto("/admin/settings");
  await expect(page.getByRole("heading", { name: "Settings", exact: true })).toBeVisible();
  await expect(page.getByText("Update support window")).toBeVisible();
  await expect(page.getByRole("cell", { name: "Supported", exact: true })).toBeVisible();
});

test("audit page renders the configured data source", async ({ page }) => {
  const expectedSource = liveApiConfig() ? "api" : "demo";
  await page.goto("/admin/audit");
  await expect(page.getByRole("heading", { name: "Audit", exact: true })).toBeVisible();
  await expect(page.getByTestId("data-source-badge")).toHaveAttribute("data-source", expectedSource);
});

test("approvals page renders the configured queue source", async ({ page }) => {
  const expectedSource = liveApiConfig() ? "api" : "demo";
  await page.goto("/admin/approvals");
  await expect(page.getByRole("heading", { name: /Approbations|Approvals/ })).toBeVisible();
  await expect(page.getByTestId("data-source-badge")).toHaveAttribute("data-source", expectedSource);
  if (expectedSource === "demo") {
    await expect(page.getByRole("button", { name: "Approve" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Reject" })).toBeVisible();
  }
});

test("approvals workflow labels follow the active locale", async ({ page, context, request, baseURL }) => {
  const live = liveApiConfig();
  let createdApprovalId: string | null = null;
  if (live) {
    const subjectId = `PW-L10N-${Date.now()}`;
    const create = await request.post(`${live.apiUrl}/approval-requests`, {
      headers: live.headers(`pw-l10n-create-${subjectId}`),
      data: {
        requesterUserIdentityId: live.userId,
        approverUserIdentityId: live.userId,
        approverRoleId: null,
        subjectType: "expense_report",
        subjectId,
        reason: "Playwright locale label regression",
        urgency: "normal"
      }
    });
    expect(create.status()).toBe(201);
    const created = await create.json() as { id: string };
    createdApprovalId = created.id;
  }

  await context.clearCookies();
  const url = new URL(baseURL ?? "http://127.0.0.1:4173");
  try {
    await context.addCookies([{
      name: "openerp_locale",
      value: "fr",
      url: url.toString()
    }]);
    await page.goto("/admin/approvals");
    await page.waitForLoadState("domcontentloaded");
    const frForm = page.locator("form.approvals-form").first();
    await expect(page.getByRole("heading", { name: "Approbations" })).toBeVisible();
    await expect(frForm.getByRole("textbox", { name: "Raison" })).toBeVisible();
    await expect(frForm.getByRole("button", { name: "Approuver" })).toBeVisible();
    await expect(frForm.getByRole("button", { name: "Rejeter" })).toBeVisible();

    await context.clearCookies();
    await context.addCookies([{
      name: "openerp_locale",
      value: "en",
      url: url.toString()
    }]);
    await page.goto("/admin/approvals");
    await page.waitForLoadState("domcontentloaded");
    const enForm = page.locator("form.approvals-form").first();
    await expect(page.getByRole("heading", { name: "Approvals" })).toBeVisible();
    await expect(enForm.getByRole("textbox", { name: "Reason" })).toBeVisible();
    await expect(enForm.getByRole("button", { name: "Approve" })).toBeVisible();
    await expect(enForm.getByRole("button", { name: "Reject" })).toBeVisible();
  } finally {
    if (live && createdApprovalId) {
      await request.patch(`${live.apiUrl}/approval-requests/${createdApprovalId}/decide`, {
        headers: live.headers(`pw-l10n-cleanup-${createdApprovalId}`),
        data: {
          decision: "approved",
          decisionReason: "Playwright locale cleanup",
          approverUserIdentityId: live.userId
        }
      });
    }
  }
});

test("live approvals can be decided from the UI", async ({ page, request }, testInfo) => {
  const live = liveApiConfig();
  if (!live) {
    test.skip(true, "Requires OPENERP_API_URL, OPENERP_DEV_ORG_ID, and OPENERP_DEV_USER_ID");
    return;
  }

  const subjectId = `PW-${Date.now()}`;
  const create = await request.post(`${live.apiUrl}/approval-requests`, {
    headers: live.headers(`pw-create-${subjectId}`),
    data: {
      requesterUserIdentityId: live.userId,
      approverUserIdentityId: live.userId,
      approverRoleId: null,
      subjectType: "expense_report",
      subjectId,
      reason: "Playwright live approval regression",
      urgency: "normal"
    }
  });
  expect(create.status()).toBe(201);
  const created = await create.json() as { id: string };

  await page.goto("/admin/approvals");
  await page.waitForLoadState("domcontentloaded");
  await expect(page.getByTestId("data-source-badge")).toHaveAttribute("data-source", "api");
  await expect(page.getByText(`expense_report:${subjectId}`)).toBeVisible();

  const form = page.locator("form.approvals-form", {
    has: page.locator(`input[name="id"][value="${created.id}"]`)
  });
  await form.getByLabel("Reason").fill("Approved by Playwright");
  await form.getByRole("button", { name: "Approve" }).click();
  await expect(page.getByRole("status")).toContainText("Decision recorded");
  const screenshotPath = testInfo.outputPath("approvals-after-decision.png");
  await page.screenshot({ path: screenshotPath, fullPage: true });
  await testInfo.attach("approvals-after-decision", {
    path: screenshotPath,
    contentType: "image/png"
  });

  const verify = await request.get(`${live.apiUrl}/approval-requests/${created.id}`, {
    headers: live.headers()
  });
  expect(verify.status()).toBe(200);
  const updated = await verify.json() as { status: string; decisionReason: string | null };
  expect(updated.status).toBe("approved");
  expect(updated.decisionReason).toBe("Approved by Playwright");
});

test("login page renders the passkey form", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { level: 1, name: /Connexion|Sign in/ })).toBeVisible();
  await expect(page.getByRole("button", { name: authScreenSelectors.loginButton })).toBeVisible();
});

test("register-passkey page renders the bootstrap form", async ({ page }) => {
  await page.goto("/register-passkey");
  await expect(page.getByRole("heading", { level: 1, name: authScreenSelectors.registerHeading })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Email" })).toBeVisible();
  await expect(page.getByRole("button", { name: authScreenSelectors.registerAction })).toBeVisible();
});

test("auth pages follow the active locale", async ({ page, context, baseURL }) => {
  await context.clearCookies();
  const url = new URL(baseURL ?? "http://127.0.0.1:4173");
  await context.addCookies([{
    name: "openerp_locale",
    value: "fr",
    url: url.toString()
  }]);
  await page.goto("/login");
  await page.waitForLoadState("domcontentloaded");
  await expect(page.getByRole("heading", { level: 1, name: "Connexion" })).toBeVisible();
  await expect(page.getByRole("button", {
    name: "Se connecter avec WebAuthn"
  })).toBeVisible();
  await page.goto("/register-passkey");
  await page.waitForLoadState("domcontentloaded");
  await expect(page.getByRole("heading", {
    level: 1,
    name: "Créer un compte"
  })).toBeVisible();
  await expect(page.getByRole("button", {
    name: "Obtenir un code"
  })).toBeVisible();

  await context.clearCookies();
  await context.addCookies([{
    name: "openerp_locale",
    value: "en",
    url: url.toString()
  }]);
  await page.goto("/login");
  await page.waitForLoadState("domcontentloaded");
  await expect(page.getByRole("heading", { level: 1, name: "Sign in" })).toBeVisible();
  await expect(page.getByRole("button", {
    name: "Sign in with passkey"
  })).toBeVisible();
  await expect(page.getByRole("link", { name: "Create a passkey" })).toBeVisible();
  await page.goto("/register-passkey");
  await page.waitForLoadState("domcontentloaded");
  await expect(page.getByRole("heading", {
    level: 1,
    name: "Create an account"
  })).toBeVisible();
  await expect(page.getByRole("button", {
    name: "Get verification code"
  })).toBeVisible();
});

test("locale switcher toggles nav labels between FR and EN", async ({ page, context, baseURL }) => {
  await context.clearCookies();
  const url = new URL(baseURL ?? "http://127.0.0.1:4173");
  await context.addCookies([{
    name: "openerp_locale",
    value: "fr",
    url: url.toString()
  }]);
  await page.goto("/");
  // Wait for Svelte hydration: the DS LanguageToggle change handler only exists
  // once the client bundle has mounted (the layout sets data-hydrated then).
  await page.waitForFunction(
    () => document.documentElement.getAttribute("data-hydrated") === "true",
    { timeout: 10_000 }
  );
  const switcher = page.locator("header button.st-appHeader__control[aria-haspopup='menu']");
  // UXDR-009: nav header niveau 1 — libellé de module sensible à la locale
  await expect(page.getByRole("link", { name: "Facturation" })).toBeVisible();
  // Pill canonique : libellé = locale active ; menu DS pour changer
  await expect(switcher).toBeVisible();
  await expect(switcher).toContainText("FR");

  await switcher.click();
  await Promise.all([
    page.waitForNavigation({ waitUntil: "load" }),
    page.getByRole("menuitem", { name: "English" }).click()
  ]);
  await page.waitForLoadState("networkidle");
  await expect(page.getByRole("link", { name: "Billing" })).toBeVisible({ timeout: 10_000 });
  await expect(switcher).toBeVisible();
  await expect(switcher).toContainText("EN");
});

function liveApiConfig(): {
  apiUrl: string;
  organizationId: string;
  userId: string;
  headers: (idempotencyKey?: string) => Record<string, string>;
} | null {
  const apiUrl = process.env.OPENERP_API_URL;
  const organizationId = process.env.OPENERP_DEV_ORG_ID;
  const userId = process.env.OPENERP_DEV_USER_ID;
  if (!apiUrl || !organizationId || !userId) return null;
  return {
    apiUrl,
    organizationId,
    userId,
    headers: (idempotencyKey?: string) => ({
      "content-type": "application/json",
      "x-organization-id": organizationId,
      "x-user-identity-id": userId,
      ...(idempotencyKey ? { "idempotency-key": idempotencyKey } : {})
    })
  };
}
