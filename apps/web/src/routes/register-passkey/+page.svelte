<script lang="ts">
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
      // The API embeds the UserIdentity id inside options.user.id (base64url
      // of the raw uuid). Decode it for the finish payload.
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
  <header class="page-header">
    <div>
      <h1>Créer une passkey</h1>
      <p class="lede">Première utilisation : enregistrez une passkey sur ce poste. La même clé sera utilisable pour vous connecter ensuite.</p>
    </div>
  </header>

  <section class="panel" style="padding: 18px;">
    <form
      onsubmit={(event) => {
        event.preventDefault();
        void register();
      }}
      style="display: grid; gap: 12px; max-width: 420px;"
    >
      <label style="display: grid; gap: 4px;">
        <span>Adresse courriel (UserIdentity existante)</span>
        <input type="email" bind:value={email} required style="padding: 8px 10px; border: 1px solid #b9c8bd; border-radius: 6px;" />
      </label>
      <label style="display: grid; gap: 4px;">
        <span>Étiquette de la passkey</span>
        <input type="text" bind:value={label} required style="padding: 8px 10px; border: 1px solid #b9c8bd; border-radius: 6px;" />
      </label>
      <button class="button primary" type="submit" disabled={status === "running"}>
        {status === "running" ? "Enregistrement…" : "Enregistrer la passkey"}
      </button>
      {#if status === "error"}
        <p style="color: #7a1b1b;" role="alert">Erreur : {message}</p>
      {/if}
      {#if status === "ok"}
        <p style="color: #23543a;" role="status">{message} <a href="/login">Se connecter</a></p>
      {/if}
    </form>
  </section>
</section>
