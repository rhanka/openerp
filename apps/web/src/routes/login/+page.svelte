<script lang="ts">
  import { goto } from "$app/navigation";
  import { Alert, Button, Card, Form, FormGroup, Input } from "@sentropic/design-system-svelte";
  import { startAuthentication } from "@simplewebauthn/browser";

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

<section class="page">
  <header class="page__header">
    <div>
      <h1>Connexion</h1>
      <p class="page__lede">
        Authentifiez-vous avec une passkey (Touch ID, Windows Hello, clé de sécurité).
      </p>
    </div>
  </header>

  <Card>
    <Form
      submitting={status === "running"}
      onsubmit={(event) => {
        event.preventDefault();
        void login();
      }}
    >
      <FormGroup legend="Identifiant">
        <Input
          name="email"
          type="email"
          label="Adresse courriel"
          placeholder="alice@northwind.local"
          autocomplete="username webauthn"
          required
          bind:value={email}
        />
      </FormGroup>
      <div class="login-actions">
        <Button variant="primary" type="submit" disabled={status === "running"}>
          {status === "running" ? "Vérification…" : "Se connecter avec une passkey"}
        </Button>
        <a href="/register-passkey">Créer une passkey</a>
      </div>
      {#if status === "error"}
        <Alert tone="error" title="Échec de connexion">{message}</Alert>
      {/if}
      {#if status === "ok"}
        <Alert tone="success" title="Connecté">{message}</Alert>
      {/if}
    </Form>
  </Card>
</section>

<style>
  .login-actions {
    align-items: center;
    display: flex;
    gap: 1rem;
    margin-top: 1rem;
  }
</style>
