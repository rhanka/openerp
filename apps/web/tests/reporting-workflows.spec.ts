import { expect, test } from "@playwright/test";

// Demo Slice 5.4 — Reporting Workflows Playwright spec.
// Validates the admin page in demo mode (no live API).

test.describe("Reporting workflows (DS 5.4 demo mode)", () => {
  test("list renders the demo workflow", async ({ page, context, baseURL }) => {
    await context.clearCookies();
    await context.addCookies([{
      name: "openerp_locale",
      value: "en",
      url: baseURL ?? "http://127.0.0.1:4173"
    }]);

    await page.goto("/admin/reporting/workflows");
    await page.waitForLoadState("domcontentloaded");

    await expect(page.getByRole("heading", { name: "Workflows", exact: true })).toBeVisible();

    // The demo fallback list renders exactly one workflow item. Count only the
    // direct <li> children of the list — each workflow card can contain a nested
    // run-history <li> sublist, which a descendant "li" selector would also match.
    const list = page.getByTestId("reporting-workflows-list");
    await expect(list).toBeVisible();
    await expect(list.locator("> li")).toHaveCount(1);

    // The demo item name is visible
    await expect(page.getByText("Notify on opportunity won (demo)")).toBeVisible();
  });

  test("list renders correctly in FR locale", async ({ page, context, baseURL }) => {
    await context.clearCookies();
    await context.addCookies([{
      name: "openerp_locale",
      value: "fr",
      url: baseURL ?? "http://127.0.0.1:4173"
    }]);

    await page.goto("/admin/reporting/workflows");
    await page.waitForLoadState("domcontentloaded");

    await expect(page.getByRole("heading", { name: "Flux de travail", exact: true })).toBeVisible();
  });

  test("create form is present with trigger-select and action-select", async ({ page, context, baseURL }) => {
    await context.clearCookies();
    await context.addCookies([{
      name: "openerp_locale",
      value: "en",
      url: baseURL ?? "http://127.0.0.1:4173"
    }]);

    await page.goto("/admin/reporting/workflows");
    await page.waitForLoadState("domcontentloaded");

    // The create form fieldset should be present
    await expect(page.getByRole("group", { name: "New workflow" })).toBeVisible();

    // Name input
    const nameInput = page.getByLabel("Name");
    await expect(nameInput).toBeVisible();

    // Trigger select
    const triggerSelect = page.getByTestId("trigger-select");
    await expect(triggerSelect).toBeVisible();

    // Action select
    const actionSelect = page.getByTestId("action-select");
    await expect(actionSelect).toBeVisible();

    // Submit button
    await expect(page.getByRole("button", { name: "Create" })).toBeVisible();
  });

  test("sidebar shows Reporting section with all six items including Workflows", async ({ page, context, baseURL }) => {
    await context.clearCookies();
    await context.addCookies([{
      name: "openerp_locale",
      value: "en",
      url: baseURL ?? "http://127.0.0.1:4173"
    }]);

    await page.goto("/admin/reporting/workflows");
    await page.waitForLoadState("domcontentloaded");

    await expect(
      page.locator(".st-navSection__label", { hasText: "Reporting" })
    ).toBeVisible();

    // All six nav items in the Reporting section are present
    await expect(page.getByRole("link", { name: "Saved views", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Reports", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Dashboards", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Scheduled deliveries", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Webhooks", exact: true })).toBeVisible();
    const wfLink = page.getByRole("link", { name: "Workflows", exact: true });
    await expect(wfLink).toBeVisible();
    await expect(wfLink).toHaveAttribute("aria-current", "page");
  });
});
