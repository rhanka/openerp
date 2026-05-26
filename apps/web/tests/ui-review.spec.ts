import { expect, type Locator, type Page, test } from "@playwright/test";

type Locale = "en" | "fr";

const reviewMatrix: Array<{
  name: string;
  width: number;
  height: number;
}> = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "short-desktop", width: 1280, height: 720 },
  { name: "mobile", width: 390, height: 844 }
];

const reviewedRoutes: Array<{
  path: string;
  labels: Record<Locale, string>;
  activeNav?: boolean;
}> = [
  { path: "/admin/approvals", labels: { en: "Approvals", fr: "Approbations" }, activeNav: true },
  { path: "/admin/audit", labels: { en: "Audit", fr: "Audit" }, activeNav: true },
  { path: "/admin/crm/leads", labels: { en: "Leads", fr: "Leads" }, activeNav: true },
  { path: "/admin/crm/companies", labels: { en: "Companies", fr: "Societes" }, activeNav: true },
  { path: "/admin/crm/contacts", labels: { en: "Contacts", fr: "Contacts" }, activeNav: true },
  {
    path: "/admin/crm/opportunities",
    labels: { en: "Opportunities", fr: "Opportunites" },
    activeNav: true
  },
  {
    path: "/admin/project/projects",
    labels: { en: "Projects", fr: "Projets" },
    activeNav: true
  },
  {
    path: "/admin/project/rates",
    labels: { en: "Rates", fr: "Taux" },
    activeNav: true
  },
  {
    path: "/admin/billing/invoices",
    labels: { en: "Invoices", fr: "Factures" },
    activeNav: true
  },
  { path: "/login", labels: { en: "Sign in", fr: "Connexion" } },
  { path: "/register-passkey", labels: { en: "Create a passkey", fr: "Créer une passkey" } }
];

test.describe("UI review: shell ergonomics", () => {
  for (const viewport of reviewMatrix) {
    for (const locale of ["fr", "en"] as const) {
      for (const route of reviewedRoutes) {
        test(`keeps shell utilities and nav contained on ${viewport.name} in ${locale.toUpperCase()} for ${route.path}`, async ({
          page,
          context,
          baseURL
        }, testInfo) => {
          await page.setViewportSize({ width: viewport.width, height: viewport.height });
          await context.clearCookies();
          await context.addCookies([{
            name: "openerp_locale",
            value: locale,
            url: baseURL ?? "http://127.0.0.1:4173"
          }]);

          await page.goto(route.path);
          await page.waitForLoadState("domcontentloaded");

          await expect(page.getByRole("heading", { name: route.labels[locale], exact: true })).toBeVisible();
          if (route.activeNav) {
            await expect(page.getByRole("link", { name: route.labels[locale], exact: true })).toHaveAttribute(
              "aria-current",
              "page"
            );
          }

          const appHeader = page.getByRole("banner", { name: "Global application header" });
          const sidebar = page.getByLabel("Primary");
          const brand = page.getByLabel("OpenERP home");
          const switcher = page.getByTestId("locale-switcher");
          const switcherIcon = page.getByTestId("locale-switcher-icon");
          const nav = page.getByRole("navigation", { name: "Admin" });

          await expect(appHeader).toBeVisible();
          await expect(sidebar).toBeVisible();
          await expect(switcher).toBeVisible();
          await expect(switcherIcon).toBeVisible();
          await expect(nav).toBeVisible();

          await expectNoHorizontalOverflow(page);
          await expectContained(appHeader, brand, "brand");
          await expectContained(appHeader, switcher, "locale switcher");
          await expectContained(sidebar, nav, "admin navigation");
          await expectWithinViewport(appHeader, page, "global header");
          await expectWithinViewport(switcher, page, "locale switcher");
          await expectHeaderBeforeShell(appHeader, sidebar, page.locator("main"));

          const headerScreenshotPath = testInfo.outputPath(
            `ui-review-header-${viewport.name}-${locale}-${route.path.replaceAll("/", "-").replace(/^-/, "")}.png`
          );
          await page.locator(".shell__header").screenshot({ path: headerScreenshotPath });
          await testInfo.attach(`ui-review header ${viewport.name} ${locale} ${route.path}`, {
            path: headerScreenshotPath,
            contentType: "image/png"
          });

          const sidebarScreenshotPath = testInfo.outputPath(
            `ui-review-${viewport.name}-${locale}-${route.path.replaceAll("/", "-").replace(/^-/, "")}.png`
          );
          await page.locator(".shell__sidebar").screenshot({ path: sidebarScreenshotPath });
          await testInfo.attach(`ui-review ${viewport.name} ${locale} ${route.path}`, {
            path: sidebarScreenshotPath,
            contentType: "image/png"
          });

          const mainScreenshotPath = testInfo.outputPath(
            `ui-review-main-${viewport.name}-${locale}-${route.path.replaceAll("/", "-").replace(/^-/, "")}.png`
          );
          await page.locator("main").screenshot({ path: mainScreenshotPath });
          await testInfo.attach(`ui-review main ${viewport.name} ${locale} ${route.path}`, {
            path: mainScreenshotPath,
            contentType: "image/png"
          });
        });
      }
    }
  }
});

test("UI review: locale switcher preserves admin route and document language", async ({
  page,
  context,
  baseURL
}) => {
  await context.clearCookies();
  await context.addCookies([{
    name: "openerp_locale",
    value: "fr",
    url: baseURL ?? "http://127.0.0.1:4173"
  }]);

  await page.goto("/admin/approvals");
  await page.waitForLoadState("domcontentloaded");
  await expect(page.getByRole("banner", { name: "Global application header" })).toBeVisible();
  await expect(page.getByRole("group", { name: "Langue" })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "fr");
  await expect(page.getByRole("heading", { name: "Approbations" })).toBeVisible();
  await expect(page.getByTestId("locale-switcher").getByRole("button", { name: "FR" })).toHaveAttribute("aria-pressed", "true");

  await Promise.all([
    page.waitForNavigation({ waitUntil: "load" }),
    page.getByTestId("locale-switcher").getByRole("button", { name: "EN" }).click()
  ]);
  expect(new URL(page.url()).pathname).toBe("/admin/approvals");
  await expect(page.getByRole("group", { name: "Language" })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("heading", { name: "Approvals", exact: true })).toBeVisible();
  await expect(page.getByTestId("locale-switcher").getByRole("button", { name: "EN" })).toHaveAttribute("aria-pressed", "true");

  await Promise.all([
    page.waitForNavigation({ waitUntil: "load" }),
    page.getByTestId("locale-switcher").getByRole("button", { name: "FR" }).click()
  ]);
  expect(new URL(page.url()).pathname).toBe("/admin/approvals");
  await expect(page.locator("html")).toHaveAttribute("lang", "fr");
  await expect(page.getByRole("heading", { name: "Approbations" })).toBeVisible();
  await expect(page.getByTestId("locale-switcher").getByRole("button", { name: "FR" })).toHaveAttribute("aria-pressed", "true");
});

test("UI review: keyboard flow reaches locale switcher and login actions", async ({ page, context, baseURL }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await context.clearCookies();
  await context.addCookies([{
    name: "openerp_locale",
    value: "en",
    url: baseURL ?? "http://127.0.0.1:4173"
  }]);
  await page.goto("/admin/approvals");
  await page.waitForLoadState("domcontentloaded");

  await tabUntilFocused(page, page.getByLabel("OpenERP home"), 1);
  await page.keyboard.press("Tab");
  const enButton = page.getByTestId("locale-switcher").getByRole("button", { name: "EN" });
  await expect(enButton).toBeFocused();
  await expectFocusVisible(enButton);

  await page.keyboard.press("Tab");
  const frButton = page.getByTestId("locale-switcher").getByRole("button", { name: "FR" });
  await expect(frButton).toBeFocused();
  await expectFocusVisible(frButton);

  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Leads" })).toBeFocused();

  await page.goto("/login");
  await page.waitForLoadState("domcontentloaded");

  await tabUntilFocused(page, page.getByLabel("Email address"), 20);
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Sign in with a passkey" })).toBeFocused();
});

async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const overflow = await page.evaluate(() => ({
    bodyDelta: document.body.scrollWidth - document.body.clientWidth,
    documentDelta: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    documentScrollWidth: document.documentElement.scrollWidth,
    viewportWidth: window.innerWidth
  }));

  expect(overflow.documentDelta, JSON.stringify(overflow)).toBeLessThanOrEqual(1);
  expect(overflow.bodyDelta, JSON.stringify(overflow)).toBeLessThanOrEqual(1);
}

async function expectContained(container: Locator, child: Locator, label: string): Promise<void> {
  const [containerBox, childBox] = await Promise.all([
    container.boundingBox(),
    child.boundingBox()
  ]);
  expect(containerBox, `${label} container box`).not.toBeNull();
  expect(childBox, `${label} box`).not.toBeNull();
  if (!containerBox || !childBox) return;

  expect(childBox.x, `${label} left edge`).toBeGreaterThanOrEqual(containerBox.x - 1);
  expect(childBox.x + childBox.width, `${label} right edge`).toBeLessThanOrEqual(
    containerBox.x + containerBox.width + 1
  );
}

async function expectWithinViewport(locator: Locator, page: Page, label: string): Promise<void> {
  const [box, viewport] = await Promise.all([
    locator.boundingBox(),
    page.viewportSize()
  ]);
  expect(box, `${label} box`).not.toBeNull();
  expect(viewport, "viewport").not.toBeNull();
  if (!box || !viewport) return;

  expect(box.y, `${label} top edge`).toBeGreaterThanOrEqual(-1);
  expect(box.y + box.height, `${label} bottom edge`).toBeLessThanOrEqual(viewport.height + 1);
}

async function expectFocusVisible(locator: Locator): Promise<void> {
  const focusStyle = await locator.evaluate((node) => {
    const style = window.getComputedStyle(node);
    return {
      outlineStyle: style.outlineStyle,
      outlineWidth: style.outlineWidth,
      boxShadow: style.boxShadow
    };
  });

  const hasOutline = focusStyle.outlineStyle !== "none" && focusStyle.outlineWidth !== "0px";
  const hasShadow = focusStyle.boxShadow !== "none";
  expect(hasOutline || hasShadow, JSON.stringify(focusStyle)).toBe(true);
}

async function tabUntilFocused(page: Page, locator: Locator, maxTabs: number): Promise<void> {
  for (let i = 0; i < maxTabs; i += 1) {
    await page.keyboard.press("Tab");
    if (await locator.evaluateAll((nodes) => nodes.some((node) => node === document.activeElement))) {
      return;
    }
  }

  await expect(locator).toBeFocused();
}

async function expectHeaderBeforeShell(header: Locator, sidebar: Locator, main: Locator): Promise<void> {
  const [headerBox, sidebarBox, mainBox] = await Promise.all([
    header.boundingBox(),
    sidebar.boundingBox(),
    main.boundingBox()
  ]);
  expect(headerBox, "global header box").not.toBeNull();
  expect(sidebarBox, "sidebar box").not.toBeNull();
  expect(mainBox, "main box").not.toBeNull();
  if (!headerBox || !sidebarBox || !mainBox) return;

  expect(headerBox.y, "global header should start at viewport top").toBeLessThanOrEqual(1);
  expect(sidebarBox.y, "sidebar should sit below global header").toBeGreaterThanOrEqual(
    headerBox.y + headerBox.height - 1
  );
  expect(mainBox.y, "main should sit below global header").toBeGreaterThanOrEqual(
    headerBox.y + headerBox.height - 1
  );
}
