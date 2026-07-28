<script lang="ts">
  import { page } from "$app/state";
  import { goto } from "$app/navigation";
  import AuthRegister from "@sentropic/auth-ui/components/AuthRegister.svelte";
  import type { AuthRegisterProps } from "@sentropic/auth-ui/components/AuthRegister.svelte";
  import type { SvelteComponent } from "svelte";

  import {
    createOpenERPAuthTransport,
    requiresTenantSelection,
    resolveAuthUiLabels,
    safeRelativeReturnUrl,
  } from "$lib/auth-transport";
  import { t, type LocaleCode } from "$lib/i18n";

  // See the login host: the published component renders this documented slot,
  // while its 0.7.1 Svelte declaration does not include a slot map.
  const AuthRegisterWithLinks = AuthRegister as unknown as new (...args: any[]) => SvelteComponent<
    AuthRegisterProps,
    Record<string, never>,
    { "login-link": Record<string, never> }
  >;

  const locale: LocaleCode = $derived(page.data.locale as LocaleCode);
  const authTransport = $derived(createOpenERPAuthTransport(locale));
  const authLabels = $derived(resolveAuthUiLabels(locale));
  const returnUrl = $derived(safeRelativeReturnUrl(page.url.searchParams.get("returnUrl")));
  const loginHref = $derived(`/login?returnUrl=${encodeURIComponent(returnUrl)}`);

  async function handlePlatformRegistration(session: import("@sentropic/auth-ui").AuthUiSession): Promise<void> {
    if (requiresTenantSelection(session)) {
      await goto(`/select-organization?returnUrl=${encodeURIComponent(returnUrl)}`);
      return;
    }
    // Enrolment establishes the session cookie, but this page's root layout
    // load ran without one. Invalidate so the shell picks the session up and
    // renders the identity menu instead of treating the visitor as anonymous.
    await goto(returnUrl, { invalidateAll: true });
  }
</script>

<h1 class="st-visually-hidden">{t(locale, "auth.register.title")}</h1>
<AuthRegisterWithLinks transport={authTransport} labels={authLabels} onRegistered={handlePlatformRegistration}>
  <a slot="login-link" href={loginHref}>{t(locale, "register.action.login")}</a>
</AuthRegisterWithLinks>
