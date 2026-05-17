<script lang="ts">
  import { Alert, Button, Card, Form, FormGroup, Input } from "@sentropic/design-system-svelte";
  import { startRegistration } from "@simplewebauthn/browser";

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
      message = `Passkey ${finishBody?.credentialId?.slice(0, 12) ?? "registered"} créée.`;
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
</script>

<section class="page">
  <header class="page__header">
    <div>
      <h1>Créer une passkey</h1>
      <p class="page__lede">
        Première utilisation : enregistrez une passkey sur ce poste. La même clé sera utilisable pour vous connecter ensuite.
      </p>
    </div>
  </header>

  <Card>
    <Form
      submitting={status === "running"}
      onsubmit={(event) => {
        event.preventDefault();
        void register();
      }}
    >
      <FormGroup legend="Identité">
        <Input
          name="email"
          type="email"
          label="Adresse courriel (UserIdentity existante)"
          required
          bind:value={email}
        />
      </FormGroup>
      <FormGroup legend="Métadonnées">
        <Input
          name="label"
          type="text"
          label="Étiquette de la passkey"
          required
          bind:value={label}
        />
      </FormGroup>
      <div class="register-actions">
        <Button variant="primary" type="submit" disabled={status === "running"}>
          {status === "running" ? "Enregistrement…" : "Enregistrer la passkey"}
        </Button>
        <a href="/login">Se connecter</a>
      </div>
      {#if status === "error"}
        <Alert tone="error" title="Échec d'enregistrement">{message}</Alert>
      {/if}
      {#if status === "ok"}
        <Alert tone="success" title="Passkey enregistrée">{message}</Alert>
      {/if}
    </Form>
  </Card>
</section>

<style>
  .register-actions {
    align-items: center;
    display: flex;
    gap: 1rem;
    margin-top: 1rem;
  }
</style>
