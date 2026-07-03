<script lang="ts">
  import "../app.css";

  import { page } from "$app/state";
  import { afterNavigate } from "$app/navigation";
  import { browser } from "$app/environment";
  import {
    Button,
    Drawer,
    Header,
    OverflowMenu,
    SideNav,
    ThemeProvider,
    type SideNavItem,
    type OverflowMenuItem
  } from "@sentropic/design-system-svelte";
  import { sentTechTheme } from "@sentropic/design-system-themes";
  import { Languages, LogIn, Menu, User, X } from "@lucide/svelte";

  // Chat dock — feature-flagged (chatEnabled from server load).
  import ChatDock from "@sentropic/chat-ui/components/ChatDock.svelte";
  import ChatPanel from "@sentropic/chat-ui/components/ChatPanel.svelte";
  import {
    createDefaultTransport,
    createStreamHub,
    createWebHost,
    createRendererRegistry,
  } from "@sentropic/chat-ui";

  import { SUPPORTED_LOCALES, t, type LocaleCode } from "$lib/i18n";
  import { setCanvasContext, installWindowAccessor } from "$lib/canvas-context";

  import type { LayoutData } from "./$types";

  let { data, children }: { data: LayoutData; children?: import("svelte").Snippet } = $props();

  const locale: LocaleCode = $derived(data.locale);
  const chatEnabled: boolean = $derived(data.chatEnabled ?? false);
  const session = $derived(data.session);
  const currentPath = $derived(page.url?.pathname ?? "/");

  // Drawer state (client-only isMobile via matchMedia, never SSR)
  let drawerOpen = $state(false);
  let isMobile = $state(false);
  let hamburgerRef: HTMLButtonElement | undefined = $state();
  let signOutFormRef: HTMLFormElement | undefined = $state();
  let identityMenuOpen = $state(false);

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

  // Close drawer on navigation (afterNavigate)
  afterNavigate(() => {
    drawerOpen = false;
  });

  // Escape key: close drawer + refocus hamburger
  function handleKeydown(event: KeyboardEvent) {
    if (event.key === "Escape" && drawerOpen) {
      event.preventDefault();
      drawerOpen = false;
      hamburgerRef?.focus();
    }
  }

  // Backdrop click: close drawer when clicking outside the drawer panel
  function handleWindowClick(event: MouseEvent) {
    if (!drawerOpen) return;
    const aside = document.querySelector(".st-drawer");
    if (aside && !aside.contains(event.target as Node)) {
      drawerOpen = false;
    }
  }

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

  // Identity menu items — sign out via programmatic form submission
  const identityItems = $derived<OverflowMenuItem[]>([
    {
      value: "signout",
      label: t(locale, "auth.signOut"),
      danger: true,
      onclick: () => signOutFormRef?.requestSubmit()
    }
  ]);
</script>

<svelte:window onkeydown={handleKeydown} onclick={handleWindowClick} />

<svelte:head>
  <title>OpenERP</title>
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

<ThemeProvider theme={sentTechTheme}>
  <!-- Skip link: first focusable element in the page (WCAG 2.4.1) -->
  <a class="skip-link" href="#main-content">{t(locale, "shell.skipToContent")}</a>

  <div class="shell" class:shell--no-sidebar={isPreAuth}>
    <Header class="shell__header" label="Global application header">
      {#snippet logo()}
        {#if !isPreAuth}
          <!-- Hamburger toggle: mobile-only, controls the mobile drawer -->
          <button
            bind:this={hamburgerRef}
            class="shell__hamburger"
            type="button"
            aria-label={drawerOpen ? t(locale, "nav.toggle.close") : t(locale, "nav.toggle.open")}
            aria-expanded={drawerOpen}
            aria-controls="primary-nav"
            onpointerdown={(e) => e.stopPropagation()}
            onclick={(e) => { e.stopPropagation(); drawerOpen = !drawerOpen; }}
          >
            {#if drawerOpen}
              <X size={20} aria-hidden="true" />
            {:else}
              <Menu size={20} aria-hidden="true" />
            {/if}
          </button>
        {/if}
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
        {#if !isPreAuth}
          {#if session}
            <!-- Hidden sign-out form submitted programmatically by the identity menu -->
            <form
              bind:this={signOutFormRef}
              method="POST"
              action="/auth/logout"
              class="shell__signout-form"
              aria-hidden="true"
            ></form>
            <!-- Identity box: User icon button + OverflowMenu DS (placement="bottom-end") -->
            <div class="shell__identity">
              <button
                class="shell__identity-trigger"
                type="button"
                aria-label={t(locale, "auth.user.label")}
                aria-haspopup="menu"
                aria-expanded={identityMenuOpen}
                onpointerdown={(e) => e.stopPropagation()}
                onclick={() => (identityMenuOpen = !identityMenuOpen)}
              >
                <User size={20} aria-hidden="true" />
              </button>
              <OverflowMenu
                bind:open={identityMenuOpen}
                items={identityItems}
                placement="bottom-end"
                label={t(locale, "auth.user.label")}
                triggerLabel={t(locale, "auth.user.label")}
                class="shell__identity-menu"
              />
            </div>
          {:else}
            <!-- Icon + text on desktop, icon-only on mobile (long FR label overflows
                 390px viewports); aria-label keeps the accessible name stable. -->
            <a
              class="st-button st-button--secondary st-button--sm shell__signin"
              href="/login"
              aria-label={t(locale, "auth.signIn")}
            >
              <LogIn size={16} aria-hidden="true" />
              <span class="shell__signin-label">{t(locale, "auth.signIn")}</span>
            </a>
          {/if}
        {/if}
      {/snippet}
    </Header>

    {#if !isPreAuth}
      <!-- Mobile overlay drawer (Drawer DS component) -->
      <Drawer
        id="primary-nav"
        side="left"
        open={drawerOpen}
        title={t(locale, "nav.drawer.title")}
        onclose={() => { drawerOpen = false; hamburgerRef?.focus(); }}
        class="shell__drawer"
      >
        {@render navGroups()}
      </Drawer>

      <!-- Desktop persistent sidebar (CSS grid, always visible ≥769px) -->
      <aside class="shell__sidebar" aria-label="Primary" inert={isMobile && drawerOpen}>
        {@render navGroups()}
      </aside>
    {/if}

    <main
      id="main-content"
      class="shell__main"
      tabindex="-1"
      inert={isMobile && drawerOpen}
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
</ThemeProvider>
