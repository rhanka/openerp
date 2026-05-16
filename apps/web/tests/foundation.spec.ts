import { expect, test } from "@playwright/test";

test("foundation shell exposes admin navigation without layout overlap", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "OpenERP" })).toBeVisible();
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

test("audit page falls back to demo data when OPENERP_DEV_* env is unset", async ({ page }) => {
  await page.goto("/admin/audit");
  await expect(page.getByRole("heading", { name: "Audit", exact: true })).toBeVisible();
  await expect(page.locator(".status[data-source='demo']")).toContainText("Demo data");
});

test("approvals page renders the pending queue with a decide form", async ({ page }) => {
  await page.goto("/admin/approvals");
  await expect(page.getByRole("heading", { name: "Approbations" })).toBeVisible();
  await expect(page.locator(".status[data-source='demo']")).toContainText("Demo data");
  await expect(page.getByRole("button", { name: "Approve" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Reject" })).toBeVisible();
});

test("login page renders the passkey form", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Connexion" })).toBeVisible();
  await expect(page.getByPlaceholder("alice@northwind.local")).toBeVisible();
  await expect(page.getByRole("button", { name: /Se connecter avec une passkey/i })).toBeVisible();
});

test("register-passkey page renders the bootstrap form", async ({ page }) => {
  await page.goto("/register-passkey");
  await expect(page.getByRole("heading", { name: "Créer une passkey" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Enregistrer la passkey/i })).toBeVisible();
});

test("locale switcher toggles nav labels between FR and EN", async ({ page, context, baseURL }) => {
  await context.clearCookies();
  // Force FR via cookie so the initial state is deterministic regardless of
  // the Chromium default Accept-Language.
  const url = new URL(baseURL ?? "http://127.0.0.1:4173");
  await context.addCookies([{
    name: "openerp_locale",
    value: "fr",
    url: url.toString()
  }]);
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Utilisateurs" })).toBeVisible();
  await expect(page.locator(".locale-button[data-active='true']")).toHaveText("FR");

  // Switch to EN.
  await page.locator(".locale-button", { hasText: "EN" }).click();
  await expect(page.getByRole("link", { name: "Users" })).toBeVisible();
  await expect(page.locator(".locale-button[data-active='true']")).toHaveText("EN");
});
