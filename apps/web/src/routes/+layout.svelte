<script lang="ts">
  import "../app.css";

  import { page } from "$app/state";
  import { afterNavigate } from "$app/navigation";
  import { browser } from "$app/environment";
  import {
    AppHeader,
    IdentityMenu,
    LanguageToggle,
    Menu,
    MenuPopover,
    Modal,
    Search,
    SideNav,
    type SideNavItem,
  } from "@sentropic/design-system-svelte";
  import { ChevronDown, Globe, Search as SearchIcon } from "@lucide/svelte";
  import { compileTheme, sentTechTheme } from "@sentropic/design-system-themes";

  // B1 (fidélité DS) : le thème est émis à :root comme le fait l'app docs du DS,
  // pas via le wrapper scoped du ThemeProvider — sinon les tokens --st-* sont
  // indéfinis pour :root/body et tout le texte tombe en noir/fonte fallback.
  const themeCss = compileTheme(sentTechTheme, { selector: ":root" });

  // Chat dock — feature-flagged (chatEnabled from server load).
  import ChatDock from "@sentropic/chat-ui/components/ChatDock.svelte";
  import ChatPanel from "@sentropic/chat-ui/components/ChatPanel.svelte";
  import {
    createDefaultTransport,
    createStreamHub,
    createWebHost,
    createRendererRegistry,
  } from "@sentropic/chat-ui";

  import { t, type LocaleCode } from "$lib/i18n";
  import { setCanvasContext, installWindowAccessor } from "$lib/canvas-context";

  import type { LayoutData } from "./$types";

  let { data, children }: { data: LayoutData; children?: import("svelte").Snippet } = $props();

  const locale: LocaleCode = $derived(data.locale);
  const chatEnabled: boolean = $derived(data.chatEnabled ?? false);
  const session = $derived(data.session);
  const currentPath = $derived(page.url?.pathname ?? "/");

  // AppHeader compact/drawer state (client-only isMobile via matchMedia, never SSR)
  let menuOpen = $state(false);
  let isMobile = $state(false);
  let signOutFormRef: HTMLFormElement | undefined = $state();

  // Recherche globale (pill --icon canonique ; la feature est un stub tracké)
  let searchOpen = $state(false);
  let searchValue = $state("");

  // Contrôle langue canonique du header (pill st-appHeader__control + MenuPopover DS)
  let localeMenuOpen = $state(false);
  let localeTriggerEl: HTMLButtonElement | null = $state(null);
  const localeItems = [
    { label: "Français", value: "fr" },
    { label: "English", value: "en" }
  ];

  $effect(() => {
    if (!browser) return;
    const mq = window.matchMedia("(max-width: 768px)");
    isMobile = mq.matches;
    const onChange = (e: MediaQueryListEvent) => { isMobile = e.matches; };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  });

  // Hydration marker — set once after mount (browser-only; used by Playwright tests)
  $effect(() => {
    document.documentElement.dataset.hydrated = "true";
  });

  // Close the AppHeader drawer on navigation
  afterNavigate(() => {
    menuOpen = false;
  });

  // Escape: close the drawer and return focus to the AppHeader burger (the DS
  // scrim handles backdrop clicks; Escape/focus-return are consumer-side).
  function handleKeydown(event: KeyboardEvent) {
    if (event.key === "Escape" && menuOpen) {
      event.preventDefault();
      menuOpen = false;
      document.querySelector<HTMLButtonElement>(".st-appHeader__burgerButton")?.focus();
    }
  }

  // Locale change: set cookie synchronously via document.cookie, then reload the
  // page (full SSR round-trip so hooks.server.ts updates html[lang]). Values come
  // only from the DS LanguageToggle so they are validated at the call-site.
  function handleLocaleChange(code: LocaleCode) {
    if (!browser) return;
    const maxAge = 60 * 60 * 24 * 365;
    document.cookie = `openerp_locale=${encodeURIComponent(code)}; path=/; max-age=${maxAge}; samesite=lax`;
    window.location.reload();
  }

  // Identity user for the DS IdentityMenu — the session carries token + IDs only
  // (no name/email yet); displayName drives the avatar initials.
  const identityUser = $derived(
    session
      ? { displayName: t(locale, "auth.user.label"), id: session.userIdentityId }
      : null
  );

  // Chat host — created lazily in the browser when the feature flag is ON.
  const chatHost = $derived.by(() => {
    if (!browser || !chatEnabled) return null;
    const baseUrl = `${page.url.origin}/chat-transport`;
    const transport = createDefaultTransport(baseUrl);
    const streamClient = createStreamHub({
      getBaseUrl: () => baseUrl,
      getAuthState: () => true,
    });
    const renderers = createRendererRegistry();
    return createWebHost({
      transport,
      streamClient,
      renderers,
      labels: (key) => {
        try {
          return t(locale, key as Parameters<typeof t>[1]);
        } catch {
          return key;
        }
      },
    });
  });

  // Install the window getter once after hydration (browser-only, safe for SSR).
  $effect(() => {
    installWindowAccessor();
  });

  // Keep canvas context in sync with the current route (reactive to currentPath).
  $effect(() => {
    setCanvasContext(currentPath);
  });

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
    { label: t(locale, "nav.scheduledDeliveries"), href: "/admin/reporting/scheduled-deliveries" },
    { label: t(locale, "nav.workflows"), href: "/admin/reporting/workflows" },
    { label: t(locale, "nav.webhooks"), href: "/admin/reporting/webhooks" }
  ]));

  const adminItems = $derived(navGroup([
    { label: t(locale, "nav.users"), href: "/admin/users" },
    { label: t(locale, "nav.roles"), href: "/admin/roles" },
    { label: t(locale, "nav.approvals"), href: "/admin/approvals" },
    { label: t(locale, "nav.audit"), href: "/admin/audit" },
    { label: t(locale, "nav.settings"), href: "/admin/settings" }
  ]));
</script>

<svelte:window onkeydown={handleKeydown} />

<svelte:head>
  <title>OpenERP</title>
  {@html `<style data-st-base-theme>${themeCss}</style>`}
</svelte:head>

{#snippet navGroups()}
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
{/snippet}

<!-- Skip link: first focusable element in the page (WCAG 2.4.1) -->
<a class="skip-link" href="#main-content">{t(locale, "shell.skipToContent")}</a>

  <!-- Hidden sign-out form — submitted by the IdentityMenu (header or drawer). -->
  <form
    bind:this={signOutFormRef}
    method="POST"
    action="/auth/logout"
    class="shell__signout-form"
    aria-hidden="true"
  ></form>

  <div class="shell" class:shell--no-sidebar={isPreAuth}>
    <!--
      DS AppHeader, canonical usage: structured brand via props (no custom brand
      markup), integrated burger + drawer in compact mode (mobile, admin routes),
      utilities in `actions` on desktop. In compact mode the DS moves utilities
      into the drawer (per AppChrome), so language + identity render there too.
    -->
    <AppHeader
      brandName="OpenERP"
      productName="Foundation"
      brandMode="full"
      logoSrc="/SENT-logo-squared.svg"
      brandHref="/"
      brandLabel="OpenERP home"
      compact={!isPreAuth && isMobile}
      menuOpen={menuOpen}
      onMenuToggle={() => (menuOpen = !menuOpen)}
      menuLabel={menuOpen ? t(locale, "nav.toggle.close") : t(locale, "nav.toggle.open")}
      drawerId="primary-nav"
    >
      {#snippet actions()}
        {#if !isPreAuth}
          <!-- Recherche : pill icône canonique (st-appHeader__control--icon) -->
          <button
            type="button"
            class="st-appHeader__control st-appHeader__control--icon"
            aria-label={t(locale, "shell.search")}
            aria-haspopup="dialog"
            onclick={() => (searchOpen = true)}
          >
            <SearchIcon size={16} aria-hidden="true" />
          </button>
        {/if}
        <!-- Contrôle langue canonique (démo docs components/header) :
             button.st-appHeader__control (globe + locale + chevron) + menu DS. -->
        <button
          type="button"
          class="st-appHeader__control"
          bind:this={localeTriggerEl}
          aria-haspopup="menu"
          aria-expanded={localeMenuOpen}
          aria-label={t(locale, "locale.switcher.label")}
          onclick={() => (localeMenuOpen = !localeMenuOpen)}
        >
          <Globe size={14} aria-hidden="true" />
          {locale.toUpperCase()}
          <ChevronDown size={12} aria-hidden="true" />
        </button>
        <MenuPopover
          bind:open={localeMenuOpen}
          trigger={localeTriggerEl}
          placement="bottom-end"
          label={t(locale, "locale.switcher.label")}
        >
          <Menu
            label={t(locale, "locale.switcher.label")}
            items={localeItems}
            onselect={(v) => handleLocaleChange(v as LocaleCode)}
          />
        </MenuPopover>
        {#if !isPreAuth}
          <IdentityMenu
            isAuthenticated={!!session}
            user={identityUser}
            compact={true}
            onLogin={() => { if (browser) window.location.href = "/login"; }}
            onLogout={() => signOutFormRef?.requestSubmit()}
            loginLabel={t(locale, "auth.signIn")}
            logoutLabel={t(locale, "auth.signOut")}
          />
        {/if}
      {/snippet}

      {#snippet drawer()}
        {@render navGroups()}
        <div class="shell__drawer-utils">
          <LanguageToggle
            variant="accordion"
            accordionLabel={t(locale, "locale.switcher.label")}
            locale={locale}
            onLocaleChange={handleLocaleChange}
            frLabel="Français"
            enLabel="English"
          />
          <IdentityMenu
            variant="accordion"
            isAuthenticated={!!session}
            user={identityUser}
            onLogin={() => { if (browser) window.location.href = "/login"; }}
            onLogout={() => signOutFormRef?.requestSubmit()}
            loginLabel={t(locale, "auth.signIn")}
            logoutLabel={t(locale, "auth.signOut")}
          />
        </div>
      {/snippet}
    </AppHeader>

    {#if !isPreAuth}
      <!-- Recherche globale — modale DS + champ Search DS (feature stub trackée) -->
      <Modal
        open={searchOpen}
        title={t(locale, "shell.search")}
        onclose={() => (searchOpen = false)}
      >
        <Search
          label={t(locale, "shell.search")}
          placeholder={t(locale, "shell.search")}
          helperText={t(locale, "shell.searchHint")}
          bind:value={searchValue}
          fluid={true}
        />
      </Modal>
    {/if}

    {#if !isPreAuth}
      <!-- Desktop persistent sidebar (CSS grid, always visible ≥769px) -->
      <aside class="shell__sidebar" aria-label="Primary" inert={isMobile && menuOpen}>
        {@render navGroups()}
      </aside>
    {/if}

    <main
      id="main-content"
      class="shell__main"
      tabindex="-1"
      inert={isMobile && menuOpen}
    >
      {@render children?.()}
    </main>
  </div>

  {#if chatEnabled}
    <div data-testid="chat-dock" class="chat-dock-root">
      {#if browser && chatHost}
        <ChatDock isBrowser={true} hostMode="overlay">
          {#snippet renderBubble({ toggle, isOpen })}
            <button
              class="chat-dock-bubble"
              aria-label={t(locale, "chat.dock.toggle")}
              aria-expanded={isOpen}
              onclick={toggle}
            >
              <span aria-hidden="true">💬</span>
            </button>
          {/snippet}
          {#snippet renderContent()}
            <div class="chat-dock-panel">
              <div class="chat-dock-panel__header">
                <span class="chat-dock-panel__title">{t(locale, "chat.dock.title")}</span>
              </div>
              <ChatPanel host={chatHost} />
            </div>
          {/snippet}
        </ChatDock>
      {/if}
    </div>
  {/if}
