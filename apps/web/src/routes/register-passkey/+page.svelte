<script lang="ts">
  import { page } from "$app/state";
  import { goto } from "$app/navigation";
  import AuthRegister from "@sentropic/auth-ui/components/AuthRegister.svelte";
  import type { AuthRegisterProps } from "@sentropic/auth-ui/components/AuthRegister.svelte";
  import { Alert, Button, Card, Container, Form, FormGroup, Input, Row, Stack } from "@sentropic/design-system-svelte";
  import { startRegistration } from "@simplewebauthn/browser";
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
  const platformAuthUiEnabled = $derived(page.data.platformAuthUiEnabled === true);
  const authTransport = $derived(createOpenERPAuthTransport(locale));
  const authLabels = $derived(resolveAuthUiLabels(locale));
  const returnUrl = $derived(safeRelativeReturnUrl(page.url.searchParams.get("returnUrl")));
  const loginHref = $derived(`/login?returnUrl=${encodeURIComponent(returnUrl)}`);

  let email = $state("alice@northwind.local");
  let label = $state("Demo passkey");
  let status: "idle" | "running" | "error" | "ok" = $state("idle");
  let message = $state("");

  async function register(): Promise<void> {
    status = "running";
    message = "";
    try {
      const begin = await fetch("/register-passkey/begin", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email })
      });
      const beginBody = await begin.json();
      if (!begin.ok) {
        status = "error";
        message = beginBody?.code ?? `HTTP ${begin.status}`;
        return;
      }
      const decoded = decodeUserId(beginBody?.user?.id ?? "");
      const attestation = await startRegistration({ optionsJSON: beginBody });
      const finish = await fetch("/register-passkey/finish", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          userIdentityId: decoded,
          response: attestation,
          label
        })
      });
      const finishBody = await finish.json();
      if (!finish.ok) {
        status = "error";
        message = finishBody?.code ?? `HTTP ${finish.status}`;
        return;
      }
      status = "ok";
      message = `${t(locale, "register.success.messagePrefix")} ${finishBody?.credentialId?.slice(0, 12) ?? "registered"} ${t(locale, "register.success.messageSuffix")}`;
    } catch (err) {
      status = "error";
      message = err instanceof Error ? err.message : String(err);
    }
  }

  function decodeUserId(base64url: string): string {
    if (!base64url) return "";
    try {
      const padded = base64url.replace(/-/g, "+").replace(/_/g, "/");
      const padding = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
      return atob(padded + padding);
    } catch {
      return "";
    }
  }

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

{#if platformAuthUiEnabled}
  <h1 class="st-visually-hidden">{t(locale, "auth.register.title")}</h1>
  <AuthRegisterWithLinks transport={authTransport} labels={authLabels} onRegistered={handlePlatformRegistration}>
    <a slot="login-link" href={loginHref}>{t(locale, "register.action.login")}</a>
  </AuthRegisterWithLinks>
{:else}
<Container size="xl" as="section">
<Stack gap={6}>
  <Row justify="between" align="start">
    <div>
      <h1>{t(locale, "register.page.title")}</h1>
      <p class="page__lede">
        {t(locale, "register.page.lede")}
      </p>
    </div>
  </Row>

  <Card>
    <Form
      submitting={status === "running"}
      onsubmit={(event) => {
        event.preventDefault();
        void register();
      }}
    >
      <FormGroup legend={t(locale, "register.form.identity")}>
        <Input
          name="email"
          type="email"
          label={t(locale, "register.email.label")}
          required
          bind:value={email}
        />
      </FormGroup>
      <FormGroup legend={t(locale, "register.form.metadata")}>
        <Input
          name="label"
          type="text"
          label={t(locale, "register.label.label")}
          required
          bind:value={label}
        />
      </FormGroup>
      <div class="register-actions">
        <Button variant="primary" type="submit" disabled={status === "running"}>
          {status === "running" ? t(locale, "register.action.running") : t(locale, "register.action.submit")}
        </Button>
        <a href="/login">{t(locale, "register.action.login")}</a>
      </div>
      {#if status === "error"}
        <Alert tone="error" title={t(locale, "register.error.title")}>{message}</Alert>
      {/if}
      {#if status === "ok"}
        <Alert tone="success" title={t(locale, "register.success.title")}>{message}</Alert>
      {/if}
    </Form>
  </Card>
</Stack>
</Container>

<style>
  .register-actions {
    align-items: center;
    display: flex;
    gap: 1rem;
    margin-top: 1rem;
  }
</style>
{/if}
