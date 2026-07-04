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

const adminRoutes: Array<{
  path: string;
  labels: Record<Locale, string>;
}> = [
  { path: "/admin/approvals", labels: { en: "Approvals", fr: "Approbations" } },
  { path: "/admin/audit", labels: { en: "Audit", fr: "Audit" } },
  { path: "/admin/crm/leads", labels: { en: "Leads", fr: "Leads" } },
  { path: "/admin/crm/companies", labels: { en: "Companies", fr: "Societes" } },
  { path: "/admin/crm/contacts", labels: { en: "Contacts", fr: "Contacts" } },
  {
    path: "/admin/crm/opportunities",
    labels: { en: "Opportunities", fr: "Opportunites" }
  },
  {
    path: "/admin/project/projects",
    labels: { en: "Projects", fr: "Projets" }
  },
  {
    path: "/admin/project/rates",
    labels: { en: "Rates", fr: "Taux" }
  },
  {
    path: "/admin/billing/invoices",
    labels: { en: "Invoices", fr: "Factures" }
  },
  {
    path: "/admin/billing/taxes",
    labels: { en: "Taxes", fr: "Taxes" }
  },
  {
    path: "/admin/reporting/saved-views",
    labels: { en: "Saved views", fr: "Vues" }
  },
  {
    path: "/admin/reporting/report-definitions",
    labels: { en: "Reports", fr: "Rapports personnalisés" }
  },
  {
    path: "/admin/reporting/dashboards",
    labels: { en: "Dashboards", fr: "Tableaux de bord" }
  },
  {
    path: "/admin/reporting/scheduled-deliveries",
    labels: { en: "Scheduled deliveries", fr: "Livraisons planifiees" }
  },
  {
    path: "/admin/reporting/workflows",
    labels: { en: "Workflows", fr: "Flux de travail" }
  },
  {
    path: "/admin/reporting/webhooks",
    labels: { en: "Webhooks", fr: "Webhooks" }
  }
];

const preAuthRoutes: Array<{
  path: string;
  labels: Record<Locale, string>;
}> = [
  { path: "/login", labels: { en: "Sign in", fr: "Connexion" } },
  { path: "/register-passkey", labels: { en: "Create a passkey", fr: "Créer une passkey" } }
];

test.describe("UI review: shell ergonomics — admin routes", () => {
  for (const viewport of reviewMatrix) {
    for (const locale of ["fr", "en"] as const) {
      for (const route of adminRoutes) {
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
          // Wait for Svelte hydration: the layout sets data-hydrated="true" in a $effect after mount
          await page.waitForFunction(
            () => document.documentElement.getAttribute("data-hydrated") === "true",
            { timeout: 10_000 }
          );

          await expect(page.getByRole("heading", { name: route.labels[locale], exact: true })).toBeVisible();

          // DS AppHeader: unnamed <header> banner; the aside sidebar is the only
          // role=complementary named "Primary" (AppHeader's own desktop <nav> also
          // carries aria-label="Primary", hence the role-scoped locator).
          const appHeader = page.getByRole("banner");
          const sidebar = page.getByRole("complementary", { name: "Primary" });
          const brand = page.getByLabel("OpenERP home");
          const switcher = page.getByTestId("locale-switcher");

          await expect(appHeader).toBeVisible();

          const sectionLabels = locale === "en"
            ? ["CRM", "Projects", "Billing", "Reporting", "Admin"]
            : ["CRM", "Projets", "Facturation", "Rapports", "Admin"];

          if (viewport.name === "mobile") {
            // DS AppHeader compact (UXDR-008 addendum): sidebar CSS-hidden, header
            // utilities move into the drawer; the bar keeps brand + burger only.
            await expect(sidebar).not.toBeVisible();
            await expect(switcher).not.toBeVisible();
            const openNavLabel = locale === "en" ? "Open navigation" : "Ouvrir la navigation";
            await page.getByRole("button", { name: openNavLabel }).click();
            const drawer = page.locator("#primary-nav");
            await expect(drawer).toBeVisible();
            // Active nav: the current route's link carries aria-current="page" inside the drawer
            await expect(drawer.getByRole("link", { name: route.labels[locale], exact: true })).toHaveAttribute(
              "aria-current",
              "page"
            );
            for (const sectionLabel of sectionLabels) {
              await expect(drawer.locator(".shell__nav-heading", { hasText: sectionLabel })).toBeVisible();
            }
            // Language + identity live in the drawer utilities on mobile (DS canon)
            await expect(drawer.locator(".st-languageToggle__accordionTrigger")).toBeVisible();
            await page.keyboard.press("Escape");
            await expect(drawer).not.toBeVisible();
          } else {
            await expect(sidebar).toBeVisible();
            await expect(switcher).toBeVisible();
            // Active nav: the current route's link carries aria-current="page" in the sidebar
            await expect(sidebar.getByRole("link", { name: route.labels[locale], exact: true })).toHaveAttribute(
              "aria-current",
              "page"
            );
            for (const sectionLabel of sectionLabels) {
              await expect(sidebar.locator(".shell__nav-heading", { hasText: sectionLabel })).toBeVisible();
            }
          }

          await expectNoHorizontalOverflow(page);
          await expectContained(appHeader, brand, "brand");
          await expectWithinViewport(appHeader, page, "global header");
          if (viewport.name !== "mobile") {
            await expectContained(appHeader, switcher, "locale switcher");
            await expectWithinViewport(switcher, page, "locale switcher");
          }

          // On mobile, sidebar is replaced by the Drawer overlay — layout differs
          if (viewport.name !== "mobile") {
            await expectHeaderBeforeShell(appHeader, sidebar, page.locator("main"));
          }

          const headerScreenshotPath = testInfo.outputPath(
            `ui-review-header-${viewport.name}-${locale}-${route.path.replaceAll("/", "-").replace(/^-/, "")}.png`
          );
          await page.locator(".shell__header").screenshot({ path: headerScreenshotPath });
          await testInfo.attach(`ui-review header ${viewport.name} ${locale} ${route.path}`, {
            path: headerScreenshotPath,
            contentType: "image/png"
          });

          if (viewport.name !== "mobile") {
            const sidebarScreenshotPath = testInfo.outputPath(
              `ui-review-${viewport.name}-${locale}-${route.path.replaceAll("/", "-").replace(/^-/, "")}.png`
            );
            await page.locator(".shell__sidebar").screenshot({ path: sidebarScreenshotPath });
            await testInfo.attach(`ui-review ${viewport.name} ${locale} ${route.path}`, {
              path: sidebarScreenshotPath,
              contentType: "image/png"
            });
          }

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

test.describe("UI review: shell ergonomics — pre-auth routes", () => {
  for (const viewport of reviewMatrix) {
    for (const locale of ["fr", "en"] as const) {
      for (const route of preAuthRoutes) {
        test(`header present, no admin nav, form visible on ${viewport.name} in ${locale.toUpperCase()} for ${route.path}`, async ({
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

          const appHeader = page.getByRole("banner");
          const brand = page.getByLabel("OpenERP home");
          const switcher = page.getByTestId("locale-switcher");

          // Header and locale switcher must be present (pre-auth stays non-compact
          // at every viewport: brand + language only, no burger)
          await expect(appHeader).toBeVisible();
          await expect(switcher).toBeVisible();

          // Admin sidebar must NOT be present on pre-auth routes
          await expect(page.getByRole("complementary", { name: "Primary" })).not.toBeAttached();

          // No admin navigation elements
          await expect(page.getByRole("navigation", { name: "CRM" })).not.toBeAttached();
          await expect(page.getByRole("navigation", { name: "Admin" })).not.toBeAttached();

          // The form should be visible in the first viewport (not pushed below the fold)
          const mainContent = page.locator("main");
          await expect(mainContent).toBeVisible();
          const mainBox = await mainContent.boundingBox();
          expect(mainBox, "main content box").not.toBeNull();
          if (mainBox && viewport.name === "mobile") {
            // The main content top edge should be within the first mobile viewport
            expect(mainBox.y, "form visible in first mobile viewport").toBeLessThan(viewport.height);
          }

          await expectNoHorizontalOverflow(page);
          await expectContained(appHeader, brand, "brand");
          await expectContained(appHeader, switcher, "locale switcher");
          await expectWithinViewport(appHeader, page, "global header");
          await expectWithinViewport(switcher, page, "locale switcher");

          const headerScreenshotPath = testInfo.outputPath(
            `ui-review-header-${viewport.name}-${locale}-${route.path.replaceAll("/", "-").replace(/^-/, "")}.png`
          );
          await page.locator(".shell__header").screenshot({ path: headerScreenshotPath });
          await testInfo.attach(`ui-review header ${viewport.name} ${locale} ${route.path}`, {
            path: headerScreenshotPath,
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
  // Wait for Svelte hydration: the DS LanguageToggle change handler only exists
  // once the client bundle has mounted (the layout sets data-hydrated then).
  await page.waitForFunction(
    () => document.documentElement.getAttribute("data-hydrated") === "true",
    { timeout: 10_000 }
  );
  await expect(page.getByRole("banner")).toBeVisible();
  // DS LanguageToggle: wrapper span (data-testid) contains the select element
  await expect(page.getByTestId("locale-switcher")).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "fr");
  await expect(page.getByRole("heading", { name: "Approbations" })).toBeVisible();
  // DS LanguageToggle select: value reflects the current locale
  await expect(page.getByTestId("locale-switcher").locator("select")).toHaveValue("fr");

  await Promise.all([
    page.waitForNavigation({ waitUntil: "load" }),
    page.getByTestId("locale-switcher").locator("select").selectOption("en")
  ]);
  expect(new URL(page.url()).pathname).toBe("/admin/approvals");
  await expect(page.getByTestId("locale-switcher")).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("heading", { name: "Approvals", exact: true })).toBeVisible();
  await expect(page.getByTestId("locale-switcher").locator("select")).toHaveValue("en");

  await Promise.all([
    page.waitForNavigation({ waitUntil: "load" }),
    page.getByTestId("locale-switcher").locator("select").selectOption("fr")
  ]);
  expect(new URL(page.url()).pathname).toBe("/admin/approvals");
  await expect(page.locator("html")).toHaveAttribute("lang", "fr");
  await expect(page.getByRole("heading", { name: "Approbations" })).toBeVisible();
  await expect(page.getByTestId("locale-switcher").locator("select")).toHaveValue("fr");
});

test("UI review: keyboard flow reaches locale switcher and admin nav on admin routes", async ({ page, context, baseURL }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await context.clearCookies();
  await context.addCookies([{
    name: "openerp_locale",
    value: "en",
    url: baseURL ?? "http://127.0.0.1:4173"
  }]);
  await page.goto("/admin/approvals");
  await page.waitForLoadState("domcontentloaded");

  await tabUntilFocused(page, page.getByLabel("OpenERP home"), 3);

  // DS LanguageToggle: one focusable <select> element (replaces the former EN/FR button pair)
  await page.keyboard.press("Tab");
  const localeSelect = page.getByTestId("locale-switcher").locator("select");
  await expect(localeSelect).toBeFocused();
  await expectFocusVisible(localeSelect);

  // DS IdentityMenu compact (signed-out): compact icon button with aria-label "Sign in"
  await page.keyboard.press("Tab");
  const signInButton = page.getByRole("banner").getByRole("button", { name: "Sign in" });
  await expect(signInButton).toBeFocused();

  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Leads" })).toBeFocused();
});

test("UI review: keyboard flow on /login reaches form fields directly (no sidebar)", async ({ page, context, baseURL }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await context.clearCookies();
  await context.addCookies([{
    name: "openerp_locale",
    value: "en",
    url: baseURL ?? "http://127.0.0.1:4173"
  }]);

  await page.goto("/login");
  await page.waitForLoadState("domcontentloaded");

  // On pre-auth: header controls (brand → locale select) then directly to form (no sidebar, no identity)
  await tabUntilFocused(page, page.getByLabel("Email address"), 11);
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Sign in with a passkey" })).toBeFocused();
});

// ─── UXDR-008: Shell complet — drawer mobile, header identité, skip link ───────

const SESSION_COOKIE = JSON.stringify({
  token: "test-token-uxdr008",
  userIdentityId: "00000000-0000-0000-0000-000000000001",
  organizationId: "00000000-0000-0000-0000-000000000002"
});

test.describe("UXDR-008: desktop 1280×800 — hamburger caché, sidebar visible, identité, skip link", () => {
  test.beforeEach(async ({ page, context, baseURL }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await context.clearCookies();
    await context.addCookies([
      { name: "openerp_locale", value: "fr", url: baseURL ?? "http://127.0.0.1:4173" },
      { name: "openerp_session", value: SESSION_COOKIE, url: baseURL ?? "http://127.0.0.1:4173" }
    ]);
    await page.goto("/admin/crm/leads");
    await page.waitForLoadState("domcontentloaded");
    // Wait for Svelte hydration: the layout sets data-hydrated="true" in a $effect after mount
    await page.waitForFunction(
      () => document.documentElement.getAttribute("data-hydrated") === "true",
      { timeout: 10_000 }
    );
  });

  test("hamburger est caché sur desktop", async ({ page }) => {
    const hamburger = page.getByRole("button", { name: /navigation/i }).first();
    await expect(hamburger).not.toBeVisible();
  });

  test("sidebar desktop est visible", async ({ page }) => {
    await expect(page.getByRole("complementary", { name: "Primary" })).toBeVisible();
  });

  test("identité (DS IdentityMenu compact) est visible dans le header", async ({ page }) => {
    const banner = page.getByRole("banner");
    // DS IdentityMenu compact authenticated trigger: .st-identityMenu__trigger
    await expect(banner.locator(".st-identityMenu__trigger")).toBeVisible();
  });

  test("locale-switcher est visible (UXDR-002 maintenu)", async ({ page }) => {
    await expect(page.getByTestId("locale-switcher")).toBeVisible();
  });

  test("skip link est focusable et visible au focus", async ({ page }) => {
    const skipLink = page.locator(".skip-link");
    await skipLink.focus();
    await expect(skipLink).toBeVisible();
    await expect(skipLink).toBeFocused();
  });

  test("menu identité : item Se déconnecter visible après clic", async ({ page }) => {
    const banner = page.getByRole("banner");
    // DS IdentityMenu compact: click the trigger to open the role="menu" dropdown
    await banner.locator(".st-identityMenu__trigger").click();
    await expect(page.getByRole("menu")).toBeVisible();
    await expect(page.getByRole("menuitem", { name: /déconnecter/i })).toBeVisible();
  });
});

test.describe("UXDR-008: mobile 375×812 — hamburger visible, sidebar cachée, drawer", () => {
  test.beforeEach(async ({ page, context, baseURL }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await context.clearCookies();
    await context.addCookies([
      { name: "openerp_locale", value: "fr", url: baseURL ?? "http://127.0.0.1:4173" },
      { name: "openerp_session", value: SESSION_COOKIE, url: baseURL ?? "http://127.0.0.1:4173" }
    ]);
    await page.goto("/admin/crm/leads");
    await page.waitForLoadState("domcontentloaded");
    // Wait for Svelte hydration: the layout sets data-hydrated="true" in a $effect after mount
    await page.waitForFunction(
      () => document.documentElement.getAttribute("data-hydrated") === "true",
      { timeout: 10_000 }
    );
  });

  test("hamburger visible sur mobile", async ({ page }) => {
    await expect(page.getByRole("button", { name: /ouvrir la navigation/i })).toBeVisible();
  });

  test("sidebar desktop cachée sur mobile", async ({ page }) => {
    await expect(page.getByRole("complementary", { name: "Primary" })).not.toBeVisible();
  });

  test("identité dans le tiroir mobile (DS AppHeader compact)", async ({ page }) => {
    // DS canon (AppChrome): in compact mode the header keeps brand + burger only;
    // utilities (language, identity) move into the drawer.
    await expect(page.getByRole("banner").locator(".st-identityMenu__trigger")).not.toBeVisible();
    await page.getByRole("button", { name: /ouvrir la navigation/i }).click();
    const drawer = page.locator("#primary-nav");
    await expect(drawer.locator(".st-identityMenu__trigger")).toBeVisible();
    await expect(drawer.locator(".st-languageToggle__accordionTrigger")).toBeVisible();
  });

  test("ouverture drawer via hamburger — groupe CRM visible", async ({ page }) => {
    await page.getByRole("button", { name: /ouvrir la navigation/i }).click();
    const drawer = page.locator("#primary-nav");
    await expect(drawer).toBeVisible();
    await expect(drawer.getByText("CRM")).toBeVisible();
  });

  test("fermeture drawer via Escape + retour focus hamburger", async ({ page }) => {
    await page.getByRole("button", { name: /ouvrir la navigation/i }).click();
    await expect(page.locator("#primary-nav")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator("#primary-nav")).not.toBeVisible();
    await expect(page.getByRole("button", { name: /ouvrir la navigation/i })).toBeFocused();
  });

  test("fermeture drawer via clic backdrop", async ({ page }) => {
    await page.getByRole("button", { name: /ouvrir la navigation/i }).click();
    await expect(page.locator("#primary-nav")).toBeVisible();
    // Click right of the drawer panel (min(24rem, 92vw) = 345px on 375px): hits the DS scrim
    await page.mouse.click(365, 400);
    await expect(page.locator("#primary-nav")).not.toBeVisible();
  });
});

test.describe("UXDR-008: /login — ni sidebar ni hamburger ni CTA connexion", () => {
  test("pré-auth : aucune sidebar, aucun hamburger, pas de bouton Se connecter dans le header", async ({
    page, context, baseURL
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await context.clearCookies();
    await context.addCookies([
      { name: "openerp_locale", value: "fr", url: baseURL ?? "http://127.0.0.1:4173" }
    ]);
    await page.goto("/login");
    await page.waitForLoadState("domcontentloaded");

    // No sidebar
    await expect(page.getByRole("complementary", { name: "Primary" })).not.toBeAttached();
    // No hamburger (pre-auth stays non-compact: AppHeader renders no burger)
    await expect(page.getByRole("button", { name: /navigation/i })).not.toBeAttached();
    // locale switcher still present (UXDR-002)
    await expect(page.getByTestId("locale-switcher")).toBeVisible();
    // No identity box on pre-auth — IdentityMenu not rendered ({#if !isPreAuth} guard)
    await expect(page.getByRole("banner").locator(".st-identityMenu__trigger")).not.toBeAttached();
    await expect(page.getByRole("banner").locator(".st-identityMenu__loginCompact")).not.toBeAttached();
  });
});

test.describe("UXDR-008: déconnexion — cookie effacé + redirect /login", () => {
  test("Se déconnecter efface le cookie openerp_session et redirige vers /login", async ({
    page, context, baseURL
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await context.clearCookies();
    await context.addCookies([
      { name: "openerp_locale", value: "fr", url: baseURL ?? "http://127.0.0.1:4173" },
      { name: "openerp_session", value: SESSION_COOKIE, url: baseURL ?? "http://127.0.0.1:4173" }
    ]);
    await page.goto("/admin/crm/leads");
    await page.waitForLoadState("domcontentloaded");
    // Wait for Svelte hydration before interacting
    await page.waitForFunction(
      () => document.documentElement.getAttribute("data-hydrated") === "true",
      { timeout: 10_000 }
    );

    // Mobile (DS AppHeader compact): identity lives in the drawer — open it first
    await page.getByRole("button", { name: /ouvrir la navigation/i }).click();
    const drawer = page.locator("#primary-nav");
    await expect(drawer).toBeVisible();
    // DS IdentityMenu (accordion variant): trigger opens the role="menu" items
    await drawer.locator(".st-identityMenu__trigger").click();
    await expect(page.getByRole("menuitem", { name: /déconnecter/i })).toBeVisible();
    await page.getByRole("menuitem", { name: /déconnecter/i }).click();

    await page.waitForURL(/\/login/);
    expect(page.url()).toContain("/login");

    const cookies = await context.cookies();
    const sessionCookie = cookies.find((c) => c.name === "openerp_session");
    expect(sessionCookie).toBeUndefined();
  });
});

// ─── End UXDR-008 tests ───────────────────────────────────────────────────────

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
