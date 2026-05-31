import { expect, test } from "@playwright/test";

// Demo Slice 5.3 — Reporting ScheduledDeliveries Playwright spec.
// Validates the admin page in demo mode (no live API).

test.describe("Reporting scheduled deliveries (DS 5.3 demo mode)", () => {
  test("list renders the demo delivery", async ({ page, context, baseURL }) => {
    await context.clearCookies();
    await context.addCookies([{
      name: "openerp_locale",
      value: "en",
      url: baseURL ?? "http://127.0.0.1:4173"
    }]);

    await page.goto("/admin/reporting/scheduled-deliveries");
    await page.waitForLoadState("domcontentloaded");

    await expect(page.getByRole("heading", { name: "Scheduled deliveries", exact: true })).toBeVisible();

    // The demo fallback list renders exactly one delivery item. Count only the
    // direct <li> children of the list — each delivery card can contain a nested
    // run-history <li> sublist, which a descendant "li" selector would also match.
    const list = page.getByTestId("reporting-scheduled-deliveries-list");
    await expect(list).toBeVisible();
    await expect(list.locator("> li")).toHaveCount(1);

    // The demo item name is visible
    await expect(page.getByText("Weekly funnel delivery (demo)")).toBeVisible();
  });

  test("list renders correctly in FR locale", async ({ page, context, baseURL }) => {
    await context.clearCookies();
    await context.addCookies([{
      name: "openerp_locale",
      value: "fr",
      url: baseURL ?? "http://127.0.0.1:4173"
    }]);

    await page.goto("/admin/reporting/scheduled-deliveries");
    await page.waitForLoadState("domcontentloaded");

    await expect(page.getByRole("heading", { name: "Livraisons planifiees", exact: true })).toBeVisible();
  });

  test("create form is present with cadence select", async ({ page, context, baseURL }) => {
    await context.clearCookies();
    await context.addCookies([{
      name: "openerp_locale",
      value: "en",
      url: baseURL ?? "http://127.0.0.1:4173"
    }]);

    await page.goto("/admin/reporting/scheduled-deliveries");
    await page.waitForLoadState("domcontentloaded");

    // The create form fieldset should be present
    await expect(page.getByRole("group", { name: "New scheduled delivery" })).toBeVisible();

    // Name input
    const nameInput = page.getByLabel("Name");
    await expect(nameInput).toBeVisible();

    // Cadence select
    const cadenceSelect = page.getByTestId("cadence-select");
    await expect(cadenceSelect).toBeVisible();

    // Submit button
    await expect(page.getByRole("button", { name: "Create" })).toBeVisible();
  });

  test("sidebar shows Reporting section with all four items including Scheduled deliveries", async ({ page, context, baseURL }) => {
    await context.clearCookies();
    await context.addCookies([{
      name: "openerp_locale",
      value: "en",
      url: baseURL ?? "http://127.0.0.1:4173"
    }]);

    await page.goto("/admin/reporting/scheduled-deliveries");
    await page.waitForLoadState("domcontentloaded");

    await expect(
      page.locator(".shell__nav-heading", { hasText: "Reporting" })
    ).toBeVisible();

    // All four nav items in the Reporting section are present
    await expect(page.getByRole("link", { name: "Saved views", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Reports", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Dashboards", exact: true })).toBeVisible();
    const sdLink = page.getByRole("link", { name: "Scheduled deliveries", exact: true });
    await expect(sdLink).toBeVisible();
    await expect(sdLink).toHaveAttribute("aria-current", "page");
  });
});
