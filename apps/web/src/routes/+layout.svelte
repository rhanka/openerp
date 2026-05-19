<script lang="ts">
  import "../app.css";

  import { page } from "$app/state";
  import {
    SideNav,
    ThemeProvider,
    type SideNavItem
  } from "@sentropic/design-system-svelte";
  import { sentTechTheme } from "@sentropic/design-system-themes";

  import { SUPPORTED_LOCALES, t, type LocaleCode } from "$lib/i18n";

  import type { LayoutData } from "./$types";

  let { data, children }: { data: LayoutData; children?: import("svelte").Snippet } = $props();

  const locale: LocaleCode = $derived(data.locale);
  const currentPath = $derived(page.url?.pathname ?? "/");

  const navItems: SideNavItem[] = $derived([
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
    <aside class="shell__sidebar" aria-label="Primary">
      <a class="shell__brand" href="/" aria-label="OpenERP home">
        <span aria-hidden="true">●</span>
        <span>
          <strong>OpenERP</strong>
          <small>Foundation</small>
        </span>
      </a>
      <SideNav class="shell__sidenav" items={navItems} label="Admin" />
      <div
        class="shell__locale"
        data-testid="locale-switcher"
        role="group"
        aria-label={t(locale, "locale.switcher.label")}
      >
        {#each SUPPORTED_LOCALES as code}
          <form method="POST" action="/api/locale" class="shell__locale-form">
            <input type="hidden" name="next" value={currentPath} />
            <input type="hidden" name="locale" value={code} />
            <button
              type="submit"
              aria-pressed={locale === code ? "true" : "false"}
              data-locale={code}
              class="shell__locale-button"
              data-active={locale === code}
            >{code.toUpperCase()}</button>
          </form>
        {/each}
      </div>
    </aside>
    <main class="shell__main">
      {@render children?.()}
    </main>
  </div>
</ThemeProvider>
