import { expect, test } from "@playwright/test";

test.describe("Billing: Taxes config page (demo mode)", () => {
  test("renders page title in EN", async ({ page, context, baseURL }) => {
    await context.clearCookies();
    await context.addCookies([{ name: "openerp_locale", value: "en", url: baseURL ?? "http://127.0.0.1:4173" }]);
    await page.goto("/admin/billing/taxes");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByRole("heading", { name: "Taxes", exact: true })).toBeVisible();
  });

  test("renders page title in FR", async ({ page, context, baseURL }) => {
    await context.clearCookies();
    await context.addCookies([{ name: "openerp_locale", value: "fr", url: baseURL ?? "http://127.0.0.1:4173" }]);
    await page.goto("/admin/billing/taxes");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByRole("heading", { name: "Taxes", exact: true })).toBeVisible();
  });

  test("shows demo data badge in EN", async ({ page, context, baseURL }) => {
    await context.clearCookies();
    await context.addCookies([{ name: "openerp_locale", value: "en", url: baseURL ?? "http://127.0.0.1:4173" }]);
    await page.goto("/admin/billing/taxes");
    await page.waitForLoadState("domcontentloaded");
    const badge = page.getByTestId("data-source-badge");
    await expect(badge).toBeVisible();
    await expect(badge).toHaveAttribute("data-source", "demo");
  });

  test("shows demo tax categories list", async ({ page, context, baseURL }) => {
    await context.clearCookies();
    await context.addCookies([{ name: "openerp_locale", value: "en", url: baseURL ?? "http://127.0.0.1:4173" }]);
    await page.goto("/admin/billing/taxes");
    await page.waitForLoadState("domcontentloaded");
    const list = page.getByTestId("tax-categories-list");
    await expect(list).toBeVisible();
    // Demo seed: "Standard" category
    await expect(page.getByTestId("tax-category-name-demo-cat-std")).toBeVisible();
  });

  test("shows GST and QST demo rates in the Standard category", async ({ page, context, baseURL }) => {
    await context.clearCookies();
    await context.addCookies([{ name: "openerp_locale", value: "en", url: baseURL ?? "http://127.0.0.1:4173" }]);
    await page.goto("/admin/billing/taxes");
    await page.waitForLoadState("domcontentloaded");
    const ratesTable = page.getByTestId("rates-table-demo-cat-std");
    await expect(ratesTable).toBeVisible();
    await expect(ratesTable).toContainText("GST");
    await expect(ratesTable).toContainText("QST");
    await expect(ratesTable).toContainText("5.000%");
    await expect(ratesTable).toContainText("9.975%");
  });

  test("new category form has required fields", async ({ page, context, baseURL }) => {
    await context.clearCookies();
    await context.addCookies([{ name: "openerp_locale", value: "en", url: baseURL ?? "http://127.0.0.1:4173" }]);
    await page.goto("/admin/billing/taxes");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByTestId("tax-category-name")).toBeVisible();
    await expect(page.getByTestId("tax-category-code")).toBeVisible();
    await expect(page.getByTestId("tax-category-submit")).toBeVisible();
  });

  test("nav item Taxes is active on this route", async ({ page, context, baseURL }) => {
    await context.clearCookies();
    await context.addCookies([{ name: "openerp_locale", value: "en", url: baseURL ?? "http://127.0.0.1:4173" }]);
    await page.goto("/admin/billing/taxes");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByRole("link", { name: "Taxes", exact: true })).toHaveAttribute("aria-current", "page");
  });
});
