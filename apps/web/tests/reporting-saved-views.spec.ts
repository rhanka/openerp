import { expect, test } from "@playwright/test";

// Demo Slice 5.0 — Reporting SavedViews Playwright spec.
// Validates the admin page in demo mode (no live API).

test.describe("Reporting saved-views (DS 5.0 demo mode)", () => {
  test("list renders the demo saved view", async ({ page, context, baseURL }) => {
    await context.clearCookies();
    await context.addCookies([{
      name: "openerp_locale",
      value: "en",
      url: baseURL ?? "http://127.0.0.1:4173"
    }]);

    await page.goto("/admin/reporting/saved-views");
    await page.waitForLoadState("domcontentloaded");

    await expect(page.getByRole("heading", { name: "Saved views", exact: true })).toBeVisible();

    // The demo fallback list renders at least one item
    const list = page.getByTestId("reporting-saved-views-list");
    await expect(list).toBeVisible();
    await expect(list.locator("li")).toHaveCount(1);

    // The demo item name is visible
    await expect(page.getByText("Open opportunities")).toBeVisible();
  });

  test("list renders correctly in FR locale", async ({ page, context, baseURL }) => {
    await context.clearCookies();
    await context.addCookies([{
      name: "openerp_locale",
      value: "fr",
      url: baseURL ?? "http://127.0.0.1:4173"
    }]);

    await page.goto("/admin/reporting/saved-views");
    await page.waitForLoadState("domcontentloaded");

    await expect(page.getByRole("heading", { name: "Vues", exact: true })).toBeVisible();
  });

  test("create form is present with name, resourceType, and isShared fields", async ({ page, context, baseURL }) => {
    await context.clearCookies();
    await context.addCookies([{
      name: "openerp_locale",
      value: "en",
      url: baseURL ?? "http://127.0.0.1:4173"
    }]);

    await page.goto("/admin/reporting/saved-views");
    await page.waitForLoadState("domcontentloaded");

    // The create form fieldset should be present
    await expect(page.getByRole("group", { name: "New saved view" })).toBeVisible();

    // Name input
    const nameInput = page.getByLabel("Name");
    await expect(nameInput).toBeVisible();

    // ResourceType select
    const rtSelect = page.locator("select[name='resourceType']");
    await expect(rtSelect).toBeVisible();

    // isShared checkbox
    const sharedCheckbox = page.locator("input[name='isShared']");
    await expect(sharedCheckbox).toBeVisible();

    // Submit button
    await expect(page.getByRole("button", { name: "Create" })).toBeVisible();
  });

  test("sidebar shows Reporting section with Saved views link", async ({ page, context, baseURL }) => {
    await context.clearCookies();
    await context.addCookies([{
      name: "openerp_locale",
      value: "en",
      url: baseURL ?? "http://127.0.0.1:4173"
    }]);

    await page.goto("/admin/reporting/saved-views");
    await page.waitForLoadState("domcontentloaded");

    await expect(
      page.locator(".st-navSection__label", { hasText: "Reporting" })
    ).toBeVisible();

    const savedViewsLink = page.getByRole("link", { name: "Saved views", exact: true });
    await expect(savedViewsLink).toBeVisible();
    await expect(savedViewsLink).toHaveAttribute("aria-current", "page");
  });
});
