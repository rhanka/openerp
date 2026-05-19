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
}> = [
  { path: "/admin/approvals", labels: { en: "Approvals", fr: "Approbations" } },
  { path: "/admin/audit", labels: { en: "Audit", fr: "Audit" } }
];

test.describe("UI review: shell ergonomics", () => {
  for (const viewport of reviewMatrix) {
    for (const locale of ["fr", "en"] as const) {
      test(`keeps shell utilities and nav contained on ${viewport.name} in ${locale.toUpperCase()}`, async ({
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

        for (const route of reviewedRoutes) {
          await page.goto(route.path);
          await page.waitForLoadState("domcontentloaded");

          await expect(page.getByRole("heading", { name: route.labels[locale], exact: true })).toBeVisible();
          await expect(page.getByRole("link", { name: route.labels[locale], exact: true })).toHaveAttribute(
            "aria-current",
            "page"
          );

          const sidebar = page.getByLabel("Primary");
          const brand = page.getByLabel("OpenERP home");
          const switcher = page.getByTestId("locale-switcher");
          const nav = page.getByRole("navigation", { name: "Admin" });

          await expect(sidebar).toBeVisible();
          await expect(switcher).toBeVisible();
          await expect(nav).toBeVisible();

          await expectNoHorizontalOverflow(page);
          await expectContained(sidebar, brand, "brand");
          await expectContained(sidebar, switcher, "locale switcher");
          await expectContained(sidebar, nav, "admin navigation");
          await expectWithinViewport(switcher, page, "locale switcher");
          await expectNavBeforeUtility(nav, switcher);

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
        }
      });
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
  await tabUntilFocused(page, page.getByRole("link", { name: "Users" }), 1);

  for (let i = 0; i < 5; i += 1) {
    await page.keyboard.press("Tab");
  }
  const enButton = page.getByTestId("locale-switcher").getByRole("button", { name: "EN" });
  await expect(enButton).toBeFocused();
  await expectFocusVisible(enButton);

  await page.keyboard.press("Tab");
  const frButton = page.getByTestId("locale-switcher").getByRole("button", { name: "FR" });
  await expect(frButton).toBeFocused();
  await expectFocusVisible(frButton);

  await page.goto("/login");
  await page.waitForLoadState("domcontentloaded");

  await tabUntilFocused(page, page.getByLabel("Email address"), 10);
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

async function expectNavBeforeUtility(nav: Locator, switcher: Locator): Promise<void> {
  const [navBox, switcherBox] = await Promise.all([
    nav.boundingBox(),
    switcher.boundingBox()
  ]);
  expect(navBox, "admin navigation box").not.toBeNull();
  expect(switcherBox, "locale switcher box").not.toBeNull();
  if (!switcherBox || !navBox) return;

  expect(navBox.y + navBox.height, "admin nav should sit before locale utility").toBeLessThanOrEqual(
    switcherBox.y + 1
  );
}
