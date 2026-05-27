import { expect, test } from "@playwright/test";

// Billing invoices list and detail pages — demo-mode (no API required).

test("billing invoices list renders in demo mode (en)", async ({ page, context, baseURL }) => {
  await context.clearCookies();
  await context.addCookies([
    { name: "openerp_locale", value: "en", url: baseURL ?? "http://127.0.0.1:4173" }
  ]);
  await page.goto("/admin/billing/invoices");
  await page.waitForLoadState("domcontentloaded");

  await expect(page.getByRole("heading", { name: "Invoices", exact: true })).toBeVisible();
  const list = page.getByTestId("billing-invoices-list");
  await expect(list).toBeVisible();
  const items = list.locator(":scope > li");
  await expect(items.first()).toHaveAttribute("data-status", "draft");
});

test("billing invoices list renders in demo mode (fr)", async ({ page, context, baseURL }) => {
  await context.clearCookies();
  await context.addCookies([
    { name: "openerp_locale", value: "fr", url: baseURL ?? "http://127.0.0.1:4173" }
  ]);
  await page.goto("/admin/billing/invoices");
  await page.waitForLoadState("domcontentloaded");

  await expect(page.getByRole("heading", { name: "Factures", exact: true })).toBeVisible();
  const list = page.getByTestId("billing-invoices-list");
  await expect(list).toBeVisible();
});

test("billing invoice detail renders lines in demo mode", async ({ page, context, baseURL }) => {
  await context.clearCookies();
  await context.addCookies([
    { name: "openerp_locale", value: "en", url: baseURL ?? "http://127.0.0.1:4173" }
  ]);
  await page.goto("/admin/billing/invoices/demo-inv-1");
  await page.waitForLoadState("domcontentloaded");

  await expect(page.getByRole("heading", { level: 1 })).toContainText("INV-000001");
  await expect(page.getByText("Line items", { exact: true })).toBeVisible();
  const linesTable = page.getByTestId("invoice-lines-table");
  await expect(linesTable).toBeVisible();
  const rows = linesTable.locator("tbody > tr");
  await expect(rows).toHaveCount(2);
});

test("billing invoices nav item is active when on invoices route", async ({ page, context, baseURL }) => {
  await context.clearCookies();
  await context.addCookies([
    { name: "openerp_locale", value: "en", url: baseURL ?? "http://127.0.0.1:4173" }
  ]);
  await page.goto("/admin/billing/invoices");
  await page.waitForLoadState("domcontentloaded");

  await expect(
    page.getByRole("link", { name: "Invoices", exact: true })
  ).toHaveAttribute("aria-current", "page");
});

test("billing invoice detail renders Payments section in demo mode (DS 4.1)", async ({ page, context, baseURL }) => {
  await context.clearCookies();
  await context.addCookies([
    { name: "openerp_locale", value: "en", url: baseURL ?? "http://127.0.0.1:4173" }
  ]);
  await page.goto("/admin/billing/invoices/demo-inv-1");
  await page.waitForLoadState("domcontentloaded");

  // Payments section heading is visible
  await expect(page.getByTestId("payments-section-title")).toBeVisible();

  // Demo payment row visible (payments table)
  const paymentsTable = page.getByTestId("payments-table");
  await expect(paymentsTable).toBeVisible();
  const paymentRows = paymentsTable.locator("tbody > tr");
  await expect(paymentRows).toHaveCount(1);

  // Balance due line visible
  await expect(page.getByTestId("balance-due")).toBeVisible();
});

test("billing invoice detail renders Payments section in French (DS 4.1)", async ({ page, context, baseURL }) => {
  await context.clearCookies();
  await context.addCookies([
    { name: "openerp_locale", value: "fr", url: baseURL ?? "http://127.0.0.1:4173" }
  ]);
  await page.goto("/admin/billing/invoices/demo-inv-1");
  await page.waitForLoadState("domcontentloaded");

  await expect(page.getByTestId("payments-section-title")).toContainText("Paiements");
});

test("from-proposal control is a select in demo mode (DS consolidation)", async ({ page, context, baseURL }) => {
  await context.clearCookies();
  await context.addCookies([
    { name: "openerp_locale", value: "en", url: baseURL ?? "http://127.0.0.1:4173" }
  ]);
  await page.goto("/admin/billing/invoices");
  await page.waitForLoadState("domcontentloaded");

  const proposalSelect = page.getByTestId("proposal-select");
  await expect(proposalSelect).toBeVisible();
  // In demo mode the select should have the demo approved proposal option
  const options = proposalSelect.locator("option");
  await expect(options).toHaveCount(2); // placeholder + 1 demo proposal
});
