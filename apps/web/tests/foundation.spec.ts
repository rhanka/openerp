import { expect, test } from "@playwright/test";

test("foundation shell exposes admin navigation without layout overlap", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "OpenERP" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Users" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Roles" })).toBeVisible();
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
