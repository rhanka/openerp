import { expect, test } from "@playwright/test";

// Rates list and project assignments section — demo-mode (no API required).

test("rates list renders in demo mode", async ({ page, context, baseURL }) => {
  await context.clearCookies();
  await context.addCookies([
    { name: "openerp_locale", value: "en", url: baseURL ?? "http://127.0.0.1:4173" }
  ]);
  await page.goto("/admin/project/rates");
  await page.waitForLoadState("domcontentloaded");

  await expect(page.getByRole("heading", { name: "Rates", exact: true })).toBeVisible();
  const list = page.getByTestId("project-rates-list");
  await expect(list).toBeVisible();
  const items = list.locator(":scope > li");
  await expect(items.first()).toHaveAttribute("data-rate-id", "demo-rate-1");
});

test("rates list renders in French (nav.rates = Taux)", async ({ page, context, baseURL }) => {
  await context.clearCookies();
  await context.addCookies([
    { name: "openerp_locale", value: "fr", url: baseURL ?? "http://127.0.0.1:4173" }
  ]);
  await page.goto("/admin/project/rates");
  await page.waitForLoadState("domcontentloaded");

  await expect(page.getByRole("heading", { name: "Taux", exact: true })).toBeVisible();
});

test("project detail renders Assignments section with demo assignment (DS 3.3)", async ({ page, context, baseURL }) => {
  await context.clearCookies();
  await context.addCookies([
    { name: "openerp_locale", value: "en", url: baseURL ?? "http://127.0.0.1:4173" }
  ]);
  await page.goto("/admin/project/projects/demo-pr-1");
  await page.waitForLoadState("domcontentloaded");

  const assignmentsHeading = page.getByTestId("assignments-section-title");
  await expect(assignmentsHeading).toBeVisible();
  await expect(assignmentsHeading).toContainText("Team");

  const assignmentsList = page.getByTestId("project-assignments-list");
  await expect(assignmentsList).toBeVisible();
  const items = assignmentsList.locator(":scope > li");
  await expect(items).toHaveCount(1);
  await expect(items.first()).toHaveAttribute("data-assignment-id", "demo-asgn-1");
});
