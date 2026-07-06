<script lang="ts">
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import { Alert, Button, Card, Container, Form, FormGroup, Input, Row, Stack } from "@sentropic/design-system-svelte";
  import { startAuthentication } from "@simplewebauthn/browser";

  import { t, type LocaleCode } from "$lib/i18n";

  const locale: LocaleCode = $derived(page.data.locale as LocaleCode);

  let email = $state("");
  let status: "idle" | "running" | "error" | "ok" = $state("idle");
  let message = $state("");

  async function login(): Promise<void> {
    status = "running";
    message = "";
    try {
      const begin = await fetch("/login/begin", {
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
      const assertion = await startAuthentication({ optionsJSON: beginBody });
      const finish = await fetch("/login/finish", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ response: assertion })
      });
      const finishBody = await finish.json();
      if (!finish.ok) {
        status = "error";
        message = finishBody?.code ?? `HTTP ${finish.status}`;
        return;
      }
      status = "ok";
      message = `Signed in as ${finishBody.userIdentityId} on org ${finishBody.organizationId}`;
      await goto("/");
    } catch (err) {
      status = "error";
      message = err instanceof Error ? err.message : String(err);
    }
  }
</script>

<Container size="xl" as="section">
<Stack gap={6}>
  <Row justify="between" align="start">
    <div>
      <h1>{t(locale, "login.page.title")}</h1>
      <p class="page__lede">
        {t(locale, "login.page.lede")}
      </p>
    </div>
  </Row>

  <Card>
    <Form
      submitting={status === "running"}
      onsubmit={(event) => {
        event.preventDefault();
        void login();
      }}
    >
      <FormGroup legend={t(locale, "login.form.legend")}>
        <Input
          name="email"
          type="email"
          label={t(locale, "login.email.label")}
          placeholder="alice@northwind.local"
          autocomplete="username webauthn"
          required
          bind:value={email}
        />
      </FormGroup>
      <div class="login-actions">
        <Button variant="primary" type="submit" disabled={status === "running"}>
          {status === "running" ? t(locale, "login.action.running") : t(locale, "login.action.submit")}
        </Button>
        <a href="/register-passkey">{t(locale, "login.action.register")}</a>
      </div>
      {#if status === "error"}
        <Alert tone="error" title={t(locale, "login.error.title")}>{message}</Alert>
      {/if}
      {#if status === "ok"}
        <Alert tone="success" title={t(locale, "login.success.title")}>{message}</Alert>
      {/if}
    </Form>
  </Card>
</Stack>
</Container>

<style>
  .login-actions {
    align-items: center;
    display: flex;
    gap: 1rem;
    margin-top: 1rem;
  }
</style>
