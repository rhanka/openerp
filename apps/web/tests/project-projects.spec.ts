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

test("project detail renders Tasks section with demo tasks (DS 3.1)", async ({ page, context, baseURL }) => {
  await context.clearCookies();
  await context.addCookies([
    { name: "openerp_locale", value: "en", url: baseURL ?? "http://127.0.0.1:4173" }
  ]);
  await page.goto("/admin/project/projects/demo-pr-1");
  await page.waitForLoadState("domcontentloaded");

  // Tasks section heading visible
  const tasksHeading = page.getByTestId("tasks-section-title");
  await expect(tasksHeading).toBeVisible();
  await expect(tasksHeading).toContainText("Tasks");

  // Task list with at least one task
  const tasksList = page.getByTestId("project-tasks-list");
  await expect(tasksList).toBeVisible();
  const taskItems = tasksList.locator(":scope > li");
  await expect(taskItems).toHaveCount(2);
  await expect(taskItems.first()).toHaveAttribute("data-task-status", "done");
});

test("project detail renders Time section with demo time entries (DS 3.2)", async ({ page, context, baseURL }) => {
  await context.clearCookies();
  await context.addCookies([
    { name: "openerp_locale", value: "en", url: baseURL ?? "http://127.0.0.1:4173" }
  ]);
  await page.goto("/admin/project/projects/demo-pr-1");
  await page.waitForLoadState("domcontentloaded");

  // Time section heading visible
  const timeHeading = page.getByTestId("time-entries-section-title");
  await expect(timeHeading).toBeVisible();
  await expect(timeHeading).toContainText("Time");

  // Time entries list with at least 1 demo entry
  const entriesList = page.getByTestId("project-time-entries-list");
  await expect(entriesList).toBeVisible();
  const entryItems = entriesList.locator(":scope > li");
  await expect(entryItems).toHaveCount(2);
  // First demo entry is approved
  await expect(entryItems.first()).toHaveAttribute("data-entry-status", "approved");
});

test("project detail assignee field is a select in demo mode (DS consolidation)", async ({ page, context, baseURL }) => {
  await context.clearCookies();
  await context.addCookies([
    { name: "openerp_locale", value: "en", url: baseURL ?? "http://127.0.0.1:4173" }
  ]);
  await page.goto("/admin/project/projects/demo-pr-1");
  await page.waitForLoadState("domcontentloaded");

  const assigneeSelect = page.getByTestId("assignee-select");
  await expect(assigneeSelect).toBeVisible();
  // In demo mode the select should contain the demo user option
  const options = assigneeSelect.locator("option");
  await expect(options).toHaveCount(2); // placeholder + 1 demo user
});

test("project detail renders Invoicing section with demo proposal (DS 3.4)", async ({ page, context, baseURL }) => {
  await context.clearCookies();
  await context.addCookies([
    { name: "openerp_locale", value: "en", url: baseURL ?? "http://127.0.0.1:4173" }
  ]);
  await page.goto("/admin/project/projects/demo-pr-1");
  await page.waitForLoadState("domcontentloaded");

  // Invoicing section heading visible
  const invoicingHeading = page.getByTestId("invoice-proposals-section-title");
  await expect(invoicingHeading).toBeVisible();
  await expect(invoicingHeading).toContainText("Invoicing");

  // Demo proposal renders in the list
  const proposalsList = page.getByTestId("project-proposals-list");
  await expect(proposalsList).toBeVisible();
  const proposalItems = proposalsList.locator(":scope > li");
  await expect(proposalItems).toHaveCount(1);
  await expect(proposalItems.first()).toHaveAttribute("data-proposal-status", "draft");
});
