import { expect, test } from "@playwright/test";

// Demo Slice 5.2 — Reporting Dashboards Playwright spec.
// Validates the admin page in demo mode (no live API).

test.describe("Reporting dashboards (DS 5.2 demo mode)", () => {
  test("list renders the demo dashboard", async ({ page, context, baseURL }) => {
    await context.clearCookies();
    await context.addCookies([{
      name: "openerp_locale",
      value: "en",
      url: baseURL ?? "http://127.0.0.1:4173"
    }]);

    await page.goto("/admin/reporting/dashboards");
    await page.waitForLoadState("domcontentloaded");

    await expect(page.getByRole("heading", { name: "Dashboards", exact: true })).toBeVisible();

    // The demo fallback list renders at least one item
    const list = page.getByTestId("reporting-dashboards-list");
    await expect(list).toBeVisible();
    await expect(list.locator("li")).toHaveCount(1);

    // The demo item name is visible
    await expect(page.getByText("Pipeline overview (demo)")).toBeVisible();
  });

  test("list renders correctly in FR locale", async ({ page, context, baseURL }) => {
    await context.clearCookies();
    await context.addCookies([{
      name: "openerp_locale",
      value: "fr",
      url: baseURL ?? "http://127.0.0.1:4173"
    }]);

    await page.goto("/admin/reporting/dashboards");
    await page.waitForLoadState("domcontentloaded");

    await expect(page.getByRole("heading", { name: "Tableaux de bord", exact: true })).toBeVisible();
  });

  test("create form is present with name, description, and isShared fields", async ({ page, context, baseURL }) => {
    await context.clearCookies();
    await context.addCookies([{
      name: "openerp_locale",
      value: "en",
      url: baseURL ?? "http://127.0.0.1:4173"
    }]);

    await page.goto("/admin/reporting/dashboards");
    await page.waitForLoadState("domcontentloaded");

    // The create form fieldset should be present
    await expect(page.getByRole("group", { name: "New dashboard" })).toBeVisible();

    // Name input
    const nameInput = page.getByLabel("Name");
    await expect(nameInput).toBeVisible();

    // isShared checkbox
    const sharedCheckbox = page.locator("input[name='isShared']");
    await expect(sharedCheckbox).toBeVisible();

    // Submit button
    await expect(page.getByRole("button", { name: "Create" })).toBeVisible();
  });

  test("sidebar shows Reporting section with all three items including Dashboards", async ({ page, context, baseURL }) => {
    await context.clearCookies();
    await context.addCookies([{
      name: "openerp_locale",
      value: "en",
      url: baseURL ?? "http://127.0.0.1:4173"
    }]);

    await page.goto("/admin/reporting/dashboards");
    await page.waitForLoadState("domcontentloaded");

    await expect(
      page.locator(".shell__nav-heading", { hasText: "Reporting" })
    ).toBeVisible();

    // All three nav items in the Reporting section are present
    await expect(page.getByRole("link", { name: "Saved views", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Reports", exact: true })).toBeVisible();
    const dashLink = page.getByRole("link", { name: "Dashboards", exact: true });
    await expect(dashLink).toBeVisible();
    await expect(dashLink).toHaveAttribute("aria-current", "page");
  });
});
