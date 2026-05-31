<script lang="ts">
  import "../app.css";

  import { page } from "$app/state";
  import {
    Button,
    Header,
    SideNav,
    ThemeProvider,
    type SideNavItem
  } from "@sentropic/design-system-svelte";
  import { sentTechTheme } from "@sentropic/design-system-themes";
  import { Languages } from "@lucide/svelte";

  import { SUPPORTED_LOCALES, t, type LocaleCode } from "$lib/i18n";

  import type { LayoutData } from "./$types";

  let { data, children }: { data: LayoutData; children?: import("svelte").Snippet } = $props();

  const locale: LocaleCode = $derived(data.locale);
  const currentPath = $derived(page.url?.pathname ?? "/");

  const preAuthRoutes = ["/login", "/register-passkey"];
  const isPreAuth = $derived(preAuthRoutes.some((r) => currentPath === r || currentPath.startsWith(r + "/")));

  function navGroup(items: Array<{ label: string; href: string }>): SideNavItem[] {
    return items.map((item) => ({
      ...item,
      active: currentPath.startsWith(item.href)
    }));
  }

  const crmItems = $derived(navGroup([
    { label: t(locale, "nav.leads"), href: "/admin/crm/leads" },
    { label: t(locale, "nav.crm"), href: "/admin/crm/companies" },
    { label: t(locale, "nav.contacts"), href: "/admin/crm/contacts" },
    { label: t(locale, "nav.opportunities"), href: "/admin/crm/opportunities" }
  ]));

  const projectItems = $derived(navGroup([
    { label: t(locale, "nav.projects"), href: "/admin/project/projects" },
    { label: t(locale, "nav.rates"), href: "/admin/project/rates" }
  ]));

  const billingItems = $derived(navGroup([
    { label: t(locale, "nav.invoices"), href: "/admin/billing/invoices" },
    { label: t(locale, "nav.taxes"), href: "/admin/billing/taxes" },
    { label: t(locale, "nav.accounting"), href: "/admin/billing/accounting" }
  ]));

  const reportingItems = $derived(navGroup([
    { label: t(locale, "nav.savedViews"), href: "/admin/reporting/saved-views" },
    { label: t(locale, "nav.reportDefinitions"), href: "/admin/reporting/report-definitions" },
    { label: t(locale, "nav.dashboards"), href: "/admin/reporting/dashboards" },
    { label: t(locale, "nav.scheduledDeliveries"), href: "/admin/reporting/scheduled-deliveries" }
  ]));

  const adminItems = $derived(navGroup([
    { label: t(locale, "nav.users"), href: "/admin/users" },
    { label: t(locale, "nav.roles"), href: "/admin/roles" },
    { label: t(locale, "nav.approvals"), href: "/admin/approvals" },
    { label: t(locale, "nav.audit"), href: "/admin/audit" },
    { label: t(locale, "nav.settings"), href: "/admin/settings" }
  ]));
</script>

<svelte:head>
  <title>OpenERP</title>
</svelte:head>

<ThemeProvider theme={sentTechTheme}>
  <div class="shell" class:shell--no-sidebar={isPreAuth}>
    <Header class="shell__header" label="Global application header">
      {#snippet logo()}
        <a class="shell__brand" href="/" aria-label="OpenERP home">
          <span aria-hidden="true">●</span>
          <span>
            <strong>OpenERP</strong>
            <small>Foundation</small>
          </span>
        </a>
      {/snippet}
      {#snippet actions()}
        <div
          class="shell__locale"
          data-testid="locale-switcher"
          role="group"
          aria-label={t(locale, "locale.switcher.label")}
        >
          <Languages
            data-testid="locale-switcher-icon"
            size={18}
            strokeWidth={2}
            aria-hidden="true"
          />
          {#each SUPPORTED_LOCALES as code}
            <form method="POST" action="/api/locale" class="shell__locale-form">
              <input type="hidden" name="next" value={currentPath} />
              <input type="hidden" name="locale" value={code} />
              <Button
                variant={locale === code ? "secondary" : "ghost"}
                size="sm"
                type="submit"
                aria-pressed={locale === code ? "true" : "false"}
                data-locale={code}
                class="shell__locale-button"
                data-active={locale === code}
              >{code.toUpperCase()}</Button>
            </form>
          {/each}
        </div>
      {/snippet}
    </Header>
    {#if !isPreAuth}
      <aside class="shell__sidebar" aria-label="Primary">
        <div class="shell__nav-group">
          <p class="shell__nav-heading" aria-hidden="true">{t(locale, "nav.section.crm")}</p>
          <SideNav
            class="shell__sidenav"
            items={crmItems}
            label={t(locale, "nav.section.crm")}
          />
        </div>
        <div class="shell__nav-group">
          <p class="shell__nav-heading" aria-hidden="true">{t(locale, "nav.section.projects")}</p>
          <SideNav
            class="shell__sidenav"
            items={projectItems}
            label={t(locale, "nav.section.projects")}
          />
        </div>
        <div class="shell__nav-group">
          <p class="shell__nav-heading" aria-hidden="true">{t(locale, "nav.section.billing")}</p>
          <SideNav
            class="shell__sidenav"
            items={billingItems}
            label={t(locale, "nav.section.billing")}
          />
        </div>
        <div class="shell__nav-group">
          <p class="shell__nav-heading" aria-hidden="true">{t(locale, "nav.section.reporting")}</p>
          <SideNav
            class="shell__sidenav"
            items={reportingItems}
            label={t(locale, "nav.section.reporting")}
          />
        </div>
        <div class="shell__nav-group">
          <p class="shell__nav-heading" aria-hidden="true">{t(locale, "nav.section.admin")}</p>
          <SideNav
            class="shell__sidenav"
            items={adminItems}
            label={t(locale, "nav.section.admin")}
          />
        </div>
      </aside>
    {/if}
    <main class="shell__main">
      {@render children?.()}
    </main>
  </div>
</ThemeProvider>
