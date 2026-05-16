<script lang="ts">
  import { goto } from "$app/navigation";
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
  <header class="page-header">
    <div>
      <h1>Connexion</h1>
      <p class="lede">Authentifiez-vous avec une passkey (Touch ID, Windows Hello, clé de sécurité).</p>
    </div>
  </header>

  <section class="panel login-panel">
    <form
      class="login-form"
      onsubmit={(event) => {
        event.preventDefault();
        void login();
      }}
    >
      <label>
        <span>Adresse courriel</span>
        <input
          type="email"
          bind:value={email}
          placeholder="alice@northwind.local"
          autocomplete="username webauthn"
          required
        />
      </label>
      <button class="button primary" type="submit" disabled={status === "running"}>
        {status === "running" ? "Vérification…" : "Se connecter avec une passkey"}
      </button>
      <p>
        Pas encore enregistrée ? <a href="/register-passkey">Créer une passkey</a>
      </p>
      {#if status === "error"}
        <p class="error" role="alert">Erreur : {message}</p>
      {/if}
      {#if status === "ok"}
        <p class="success" role="status">{message}</p>
      {/if}
    </form>
  </section>
</section>

<style>
  .login-panel { padding: 18px; }
  .login-form {
    display: grid;
    gap: 12px;
    max-width: 420px;
  }
  .login-form label {
    display: grid;
    gap: 4px;
  }
  .login-form input {
    padding: 8px 10px;
    border: 1px solid #b9c8bd;
    border-radius: 6px;
    font-size: 1rem;
  }
  .error { color: #7a1b1b; }
  .success { color: #23543a; }
</style>
