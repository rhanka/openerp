import { expect, test } from "@playwright/test";

// Project list and detail pages — demo-mode (no API required).

test("project list renders in demo mode", async ({ page, context, baseURL }) => {
  await context.clearCookies();
  await context.addCookies([
    { name: "openerp_locale", value: "en", url: baseURL ?? "http://127.0.0.1:4173" }
  ]);
  await page.goto("/admin/project/projects");
  await page.waitForLoadState("domcontentloaded");

  await expect(page.getByRole("heading", { name: "Projects", exact: true })).toBeVisible();
  const list = page.getByTestId("project-projects-list");
  await expect(list).toBeVisible();
  const items = list.locator(":scope > li");
  await expect(items.first()).toHaveAttribute("data-status", "active");
});

test("project detail renders timeline in demo mode", async ({ page, context, baseURL }) => {
  await context.clearCookies();
  await context.addCookies([
    { name: "openerp_locale", value: "en", url: baseURL ?? "http://127.0.0.1:4173" }
  ]);
  await page.goto("/admin/project/projects/demo-pr-1");
  await page.waitForLoadState("domcontentloaded");

  await expect(page.getByRole("heading", { level: 1 })).toContainText("Northwind Implementation");
  await expect(page.getByText("Activity", { exact: true })).toBeVisible();
  const timeline = page.getByTestId("project-project-timeline");
  await expect(timeline).toBeVisible();
  const items = timeline.locator(":scope > li");
  await expect(items.first()).toHaveAttribute("data-entry-type", "project.project.created");
});
