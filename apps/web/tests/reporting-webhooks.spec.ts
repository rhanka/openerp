import { expect, test } from "@playwright/test";

// Demo Slice 5.5 — Reporting Webhooks Playwright spec.
// Validates the admin page in demo mode (no live API).

test.describe("Reporting webhooks (DS 5.5 demo mode)", () => {
  test("list renders the demo endpoint", async ({ page, context, baseURL }) => {
    await context.clearCookies();
    await context.addCookies([{
      name: "openerp_locale",
      value: "en",
      url: baseURL ?? "http://127.0.0.1:4173"
    }]);

    await page.goto("/admin/reporting/webhooks");
    await page.waitForLoadState("domcontentloaded");

    await expect(page.getByRole("heading", { name: "Webhooks", exact: true })).toBeVisible();

    // The demo fallback list renders at least one item
    const list = page.getByTestId("reporting-webhooks-list");
    await expect(list).toBeVisible();
    await expect(list.locator("> li")).toHaveCount(1);

    // The demo item name is visible
    await expect(page.getByText("CRM won events (demo)")).toBeVisible();
  });

  test("list renders correctly in FR locale", async ({ page, context, baseURL }) => {
    await context.clearCookies();
    await context.addCookies([{
      name: "openerp_locale",
      value: "fr",
      url: baseURL ?? "http://127.0.0.1:4173"
    }]);

    await page.goto("/admin/reporting/webhooks");
    await page.waitForLoadState("domcontentloaded");

    await expect(page.getByRole("heading", { name: "Webhooks", exact: true })).toBeVisible();
  });

  test("create form is present with targetUrl and event-types fields", async ({ page, context, baseURL }) => {
    await context.clearCookies();
    await context.addCookies([{
      name: "openerp_locale",
      value: "en",
      url: baseURL ?? "http://127.0.0.1:4173"
    }]);

    await page.goto("/admin/reporting/webhooks");
    await page.waitForLoadState("domcontentloaded");

    // The create form fieldset should be present
    await expect(page.getByRole("group", { name: "New webhook endpoint" })).toBeVisible();

    // Name input
    const nameInput = page.getByLabel("Name");
    await expect(nameInput).toBeVisible();

    // Target URL input
    const urlInput = page.getByLabel("Target URL (https)");
    await expect(urlInput).toBeVisible();

    // Event types select
    const eventTypesSelect = page.getByTestId("event-types-select");
    await expect(eventTypesSelect).toBeVisible();

    // Submit button
    await expect(page.getByRole("button", { name: "Create" })).toBeVisible();
  });

  test("sidebar shows Reporting section with all SIX items including Webhooks", async ({ page, context, baseURL }) => {
    await context.clearCookies();
    await context.addCookies([{
      name: "openerp_locale",
      value: "en",
      url: baseURL ?? "http://127.0.0.1:4173"
    }]);

    await page.goto("/admin/reporting/webhooks");
    await page.waitForLoadState("domcontentloaded");

    await expect(
      page.locator(".st-navSection__label", { hasText: "Reporting" })
    ).toBeVisible();

    // All six nav items in the Reporting section are present
    await expect(page.getByRole("link", { name: "Saved views", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Reports", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Dashboards", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Scheduled deliveries", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Workflows", exact: true })).toBeVisible();
    const whLink = page.getByRole("link", { name: "Webhooks", exact: true });
    await expect(whLink).toBeVisible();
    await expect(whLink).toHaveAttribute("aria-current", "page");
  });
});
