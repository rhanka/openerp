import { expect, test } from "@playwright/test";

// CRM detail pages expose the TimelineEntry activity stream for Company,
// Contact, and Lead, mirroring the opportunity detail pattern. Demo fallback
// data ships with at least one timeline entry per entity so these tests work
// without the API up.

test("company detail renders timeline activity in demo mode", async ({ page, context, baseURL }) => {
  await context.clearCookies();
  await context.addCookies([
    { name: "openerp_locale", value: "en", url: baseURL ?? "http://127.0.0.1:4173" }
  ]);
  await page.goto("/admin/crm/companies/demo-co-1");
  await page.waitForLoadState("domcontentloaded");

  await expect(page.getByRole("heading", { level: 1 })).toContainText("Acme Northwind");
  await expect(page.getByText("Activity", { exact: true })).toBeVisible();
  const timeline = page.getByTestId("crm-company-timeline");
  await expect(timeline).toBeVisible();
  const items = timeline.locator(":scope > li");
  await expect(items.first()).toHaveAttribute("data-entry-type", "crm.company.created");
});

test("contact detail renders timeline activity in demo mode", async ({ page, context, baseURL }) => {
  await context.clearCookies();
  await context.addCookies([
    { name: "openerp_locale", value: "en", url: baseURL ?? "http://127.0.0.1:4173" }
  ]);
  await page.goto("/admin/crm/contacts/demo-ct-1");
  await page.waitForLoadState("domcontentloaded");

  await expect(page.getByRole("heading", { level: 1 })).toContainText("Alice Tremblay");
  await expect(page.getByText("Activity", { exact: true })).toBeVisible();
  const timeline = page.getByTestId("crm-contact-timeline");
  await expect(timeline).toBeVisible();
  const items = timeline.locator(":scope > li");
  await expect(items.first()).toHaveAttribute("data-entry-type", "crm.contact.created");
});

test("lead detail renders timeline activity in demo mode", async ({ page, context, baseURL }) => {
  await context.clearCookies();
  await context.addCookies([
    { name: "openerp_locale", value: "en", url: baseURL ?? "http://127.0.0.1:4173" }
  ]);
  await page.goto("/admin/crm/leads/demo-lead-1");
  await page.waitForLoadState("domcontentloaded");

  await expect(page.getByRole("heading", { level: 1 })).toContainText("Acme, inbound demo request");
  await expect(page.getByText("Activity", { exact: true })).toBeVisible();
  const timeline = page.getByTestId("crm-lead-timeline");
  await expect(timeline).toBeVisible();
  const items = timeline.locator(":scope > li");
  await expect(items.first()).toHaveAttribute("data-entry-type", "crm.lead.created");
});
