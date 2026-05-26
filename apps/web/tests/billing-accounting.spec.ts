import { expect, test } from "@playwright/test";

test.describe("Billing: Accounting page (demo mode, DS 4.3)", () => {
  test("renders Chart of Accounts heading in EN", async ({ page, context, baseURL }) => {
    await context.clearCookies();
    await context.addCookies([{ name: "openerp_locale", value: "en", url: baseURL ?? "http://127.0.0.1:4173" }]);
    await page.goto("/admin/billing/accounting");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByRole("heading", { name: "Chart of Accounts", exact: true })).toBeVisible();
  });

  test("renders Chart of Accounts heading in FR", async ({ page, context, baseURL }) => {
    await context.clearCookies();
    await context.addCookies([{ name: "openerp_locale", value: "fr", url: baseURL ?? "http://127.0.0.1:4173" }]);
    await page.goto("/admin/billing/accounting");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByRole("heading", { name: "Plan comptable", exact: true })).toBeVisible();
  });

  test("shows demo data badge", async ({ page, context, baseURL }) => {
    await context.clearCookies();
    await context.addCookies([{ name: "openerp_locale", value: "en", url: baseURL ?? "http://127.0.0.1:4173" }]);
    await page.goto("/admin/billing/accounting");
    await page.waitForLoadState("domcontentloaded");
    const badge = page.getByTestId("data-source-badge");
    await expect(badge).toBeVisible();
    await expect(badge).toHaveAttribute("data-source", "demo");
  });

  test("shows accounts table with demo chart (6 accounts)", async ({ page, context, baseURL }) => {
    await context.clearCookies();
    await context.addCookies([{ name: "openerp_locale", value: "en", url: baseURL ?? "http://127.0.0.1:4173" }]);
    await page.goto("/admin/billing/accounting");
    await page.waitForLoadState("domcontentloaded");
    const table = page.getByTestId("accounts-table");
    await expect(table).toBeVisible();
    const rows = table.getByTestId("account-row");
    await expect(rows).toHaveCount(6);
  });

  test("shows account code 1100 (Accounts Receivable)", async ({ page, context, baseURL }) => {
    await context.clearCookies();
    await context.addCookies([{ name: "openerp_locale", value: "en", url: baseURL ?? "http://127.0.0.1:4173" }]);
    await page.goto("/admin/billing/accounting");
    await page.waitForLoadState("domcontentloaded");
    const arRow = page.getByTestId("accounts-table").getByTestId("account-row").filter({ hasText: "1100" });
    await expect(arRow).toBeVisible();
    await expect(arRow).toContainText("Accounts Receivable");
  });

  test("shows Journal Entries section with a demo entry", async ({ page, context, baseURL }) => {
    await context.clearCookies();
    await context.addCookies([{ name: "openerp_locale", value: "en", url: baseURL ?? "http://127.0.0.1:4173" }]);
    await page.goto("/admin/billing/accounting");
    await page.waitForLoadState("domcontentloaded");
    const table = page.getByTestId("journal-entries-table");
    await expect(table).toBeVisible();
    const rows = table.getByTestId("journal-entry-row");
    await expect(rows).toHaveCount(1);
  });

  test("journal entry row shows status Posted for demo entry", async ({ page, context, baseURL }) => {
    await context.clearCookies();
    await context.addCookies([{ name: "openerp_locale", value: "en", url: baseURL ?? "http://127.0.0.1:4173" }]);
    await page.goto("/admin/billing/accounting");
    await page.waitForLoadState("domcontentloaded");
    const row = page.getByTestId("journal-entry-row").first();
    await expect(row).toHaveAttribute("data-entry-status", "posted");
    await expect(row).toContainText("Posted");
  });

  test("clicking journal entry row reveals balanced lines", async ({ page, context, baseURL }) => {
    await context.clearCookies();
    await context.addCookies([{ name: "openerp_locale", value: "en", url: baseURL ?? "http://127.0.0.1:4173" }]);
    await page.goto("/admin/billing/accounting");
    await page.waitForLoadState("domcontentloaded");
    const row = page.getByTestId("journal-entry-row").first();
    await row.click();
    // lines sub-table should now be visible
    const linesTable = page.getByTestId(/^journal-lines-/);
    await expect(linesTable).toBeVisible();
    // 4 journal lines for the demo invoice entry
    await expect(linesTable.getByTestId("journal-line-row")).toHaveCount(4);
  });

  test("nav item Accounting is present in sidebar", async ({ page, context, baseURL }) => {
    await context.clearCookies();
    await context.addCookies([{ name: "openerp_locale", value: "en", url: baseURL ?? "http://127.0.0.1:4173" }]);
    await page.goto("/admin/billing/accounting");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByRole("link", { name: "Accounting", exact: true })).toBeVisible();
  });
});
