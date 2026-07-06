import { expect, test } from "@playwright/test";

// Demo Slice 5.1 — Reporting ReportDefinitions Playwright spec.
// Validates the admin page in demo mode (no live API).

test.describe("Reporting report-definitions (DS 5.1 demo mode)", () => {
  test("list renders the demo report definition", async ({ page, context, baseURL }) => {
    await context.clearCookies();
    await context.addCookies([{
      name: "openerp_locale",
      value: "en",
      url: baseURL ?? "http://127.0.0.1:4173"
    }]);

    await page.goto("/admin/reporting/report-definitions");
    await page.waitForLoadState("domcontentloaded");

    await expect(page.getByRole("heading", { name: "Reports", exact: true })).toBeVisible();

    // The demo fallback list renders at least one item
    const list = page.getByTestId("reporting-report-definitions-list");
    await expect(list).toBeVisible();
    await expect(list.locator("li")).toHaveCount(1);

    // The demo item name is visible
    await expect(page.getByText("Pipeline funnel (demo)")).toBeVisible();
  });

  test("list renders correctly in FR locale", async ({ page, context, baseURL }) => {
    await context.clearCookies();
    await context.addCookies([{
      name: "openerp_locale",
      value: "fr",
      url: baseURL ?? "http://127.0.0.1:4173"
    }]);

    await page.goto("/admin/reporting/report-definitions");
    await page.waitForLoadState("domcontentloaded");

    await expect(page.getByRole("heading", { name: "Rapports personnalisés", exact: true })).toBeVisible();
  });

  test("create form is present with name, reportType select, and isShared fields", async ({ page, context, baseURL }) => {
    await context.clearCookies();
    await context.addCookies([{
      name: "openerp_locale",
      value: "en",
      url: baseURL ?? "http://127.0.0.1:4173"
    }]);

    await page.goto("/admin/reporting/report-definitions");
    await page.waitForLoadState("domcontentloaded");

    // The create form fieldset should be present
    await expect(page.getByRole("group", { name: "New report definition" })).toBeVisible();

    // Name input
    const nameInput = page.getByLabel("Name");
    await expect(nameInput).toBeVisible();

    // Report type select
    const rtSelect = page.locator("select[name='reportType']");
    await expect(rtSelect).toBeVisible();

    // isShared checkbox
    const sharedCheckbox = page.locator("input[name='isShared']");
    await expect(sharedCheckbox).toBeVisible();

    // Submit button
    await expect(page.getByRole("button", { name: "Create" })).toBeVisible();
  });

  test("sidebar shows Reporting section with both Saved views and Reports links", async ({ page, context, baseURL }) => {
    await context.clearCookies();
    await context.addCookies([{
      name: "openerp_locale",
      value: "en",
      url: baseURL ?? "http://127.0.0.1:4173"
    }]);

    await page.goto("/admin/reporting/report-definitions");
    await page.waitForLoadState("domcontentloaded");

    await expect(
      page.locator(".st-navSection__label", { hasText: "Reporting" })
    ).toBeVisible();

    // Both nav items in the Reporting section are present
    await expect(page.getByRole("link", { name: "Saved views", exact: true })).toBeVisible();
    const reportsLink = page.getByRole("link", { name: "Reports", exact: true });
    await expect(reportsLink).toBeVisible();
    await expect(reportsLink).toHaveAttribute("aria-current", "page");
  });

  test("demo run results table is rendered with columns and rows", async ({ page, context, baseURL }) => {
    await context.clearCookies();
    await context.addCookies([{
      name: "openerp_locale",
      value: "en",
      url: baseURL ?? "http://127.0.0.1:4173"
    }]);

    await page.goto("/admin/reporting/report-definitions");
    await page.waitForLoadState("domcontentloaded");

    // The demo latestRun is rendered as a results table
    const resultsTable = page.getByTestId("report-results-table");
    await expect(resultsTable).toBeVisible();

    // Headers present
    await expect(resultsTable.getByRole("columnheader", { name: "Stage" })).toBeVisible();
    await expect(resultsTable.getByRole("columnheader", { name: "Open opportunities" })).toBeVisible();
  });
});
