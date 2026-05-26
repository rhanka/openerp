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

  const navItems: SideNavItem[] = $derived([
    { label: t(locale, "nav.leads"), href: "/admin/crm/leads" },
    { label: t(locale, "nav.crm"), href: "/admin/crm/companies" },
    { label: t(locale, "nav.contacts"), href: "/admin/crm/contacts" },
    { label: t(locale, "nav.opportunities"), href: "/admin/crm/opportunities" },
    { label: t(locale, "nav.projects"), href: "/admin/project/projects" },
    { label: t(locale, "nav.rates"), href: "/admin/project/rates" },
    { label: t(locale, "nav.invoices"), href: "/admin/billing/invoices" },
    { label: t(locale, "nav.users"), href: "/admin/users" },
    { label: t(locale, "nav.roles"), href: "/admin/roles" },
    { label: t(locale, "nav.approvals"), href: "/admin/approvals" },
    { label: t(locale, "nav.audit"), href: "/admin/audit" },
    { label: t(locale, "nav.settings"), href: "/admin/settings" }
  ].map((item) => ({ ...item, active: currentPath.startsWith(item.href) })));
</script>

<svelte:head>
  <title>OpenERP</title>
</svelte:head>

<ThemeProvider theme={sentTechTheme}>
  <div class="shell">
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
    <aside class="shell__sidebar" aria-label="Primary">
      <SideNav class="shell__sidenav" items={navItems} label="Admin" />
    </aside>
    <main class="shell__main">
      {@render children?.()}
    </main>
  </div>
</ThemeProvider>
