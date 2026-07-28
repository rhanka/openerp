<script lang="ts">
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import AuthLogin from "@sentropic/auth-ui/components/AuthLogin.svelte";
  import type { AuthLoginProps } from "@sentropic/auth-ui/components/AuthLogin.svelte";
  import type { SvelteComponent } from "svelte";

  import {
    createOpenERPAuthTransport,
    requiresTenantSelection,
    resolveAuthUiLabels,
    safeRelativeReturnUrl,
  } from "$lib/auth-transport";
  import { t, type LocaleCode } from "$lib/i18n";

  // auth-ui 0.7.1 exposes these documented legacy named slots at runtime, but
  // its Svelte 5 declaration omits the slot map. This narrows only that type
  // boundary; the rendered component remains the published component.
  const AuthLoginWithLinks = AuthLogin as unknown as new (...args: any[]) => SvelteComponent<
    AuthLoginProps,
    Record<string, never>,
    { "no-account": Record<string, never>; "register-new-device": Record<string, never> }
  >;

  const locale: LocaleCode = $derived(page.data.locale as LocaleCode);
  const authTransport = $derived(createOpenERPAuthTransport(locale));
  const authLabels = $derived(resolveAuthUiLabels(locale));
  const returnUrl = $derived(safeRelativeReturnUrl(page.url.searchParams.get("returnUrl")));
  const registerHref = $derived(`/register-passkey?returnUrl=${encodeURIComponent(returnUrl)}`);

  async function handlePlatformLogin(session: import("@sentropic/auth-ui").AuthUiSession): Promise<void> {
    if (requiresTenantSelection(session)) {
      await goto(`/select-organization?returnUrl=${encodeURIComponent(returnUrl)}`);
      return;
    }
    // The session cookie is set by the ceremony, but the root layout's server
    // load already ran on this page with no session. Without invalidating, the
    // shell keeps believing the visitor is anonymous and renders no identity
    // menu, so there is no way to sign out until a full reload.
    await goto(returnUrl, { invalidateAll: true });
  }
</script>

<h1 class="st-visually-hidden">{t(locale, "login.page.title")}</h1>
<AuthLoginWithLinks transport={authTransport} labels={authLabels} onLoggedIn={handlePlatformLogin}>
  <a slot="no-account" href={registerHref}>{t(locale, "login.action.register")}</a>
  <a slot="register-new-device" href={registerHref}>{t(locale, "login.action.register")}</a>
</AuthLoginWithLinks>
