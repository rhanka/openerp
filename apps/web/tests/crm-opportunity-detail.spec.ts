import { expect, test } from "@playwright/test";

// DS 2.2 — Opportunity detail page exposes the canon TimelineEntry projection
// (entry_type badge + occurredAt timestamp) alongside the live record. Demo
// fallback data ships with two canonical entries so this works without the
// API up.

test("opportunity detail renders timeline activity in demo mode", async ({ page, context, baseURL }) => {
  await context.clearCookies();
  await context.addCookies([
    { name: "openerp_locale", value: "en", url: baseURL ?? "http://127.0.0.1:4173" }
  ]);
  await page.goto("/admin/crm/opportunities/demo-op-1");
  await page.waitForLoadState("domcontentloaded");

  await expect(page.getByRole("heading", { level: 1 })).toContainText("Annual licence renewal");
  await expect(page.getByText("Activity", { exact: true })).toBeVisible();
  const timeline = page.getByTestId("crm-opportunity-timeline");
  await expect(timeline).toBeVisible();
  const items = timeline.locator(":scope > li");
  await expect(items).toHaveCount(2);
  await expect(items.first()).toHaveAttribute("data-entry-type", "crm.opportunity.created");
  await expect(items.nth(1)).toHaveAttribute("data-entry-type", "crm.opportunity.stage_changed");
});

test("opportunity detail switches activity labels with the active locale", async ({ page, context, baseURL }) => {
  await context.clearCookies();
  await context.addCookies([
    { name: "openerp_locale", value: "fr", url: baseURL ?? "http://127.0.0.1:4173" }
  ]);
  await page.goto("/admin/crm/opportunities/demo-op-1");
  await page.waitForLoadState("domcontentloaded");

  await expect(page.getByText("Activite", { exact: true })).toBeVisible();
  // FR badge for crm.opportunity.created
  await expect(page.getByText("creee").first()).toBeVisible();
});
