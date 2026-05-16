<script lang="ts">
  import { enhance } from "$app/forms";

  import type { PageData, ActionData } from "./$types";

  let { data, form }: { data: PageData; form: ActionData } = $props();

  function urgencyClass(urgency: string): string {
    switch (urgency) {
      case "high": return "urgency-high";
      case "low": return "urgency-low";
      default: return "urgency-normal";
    }
  }
</script>

<section class="page">
  <header class="page-header">
    <div>
      <h1>Approbations</h1>
      <p class="lede">Demandes d'approbation en attente — déclenchées par des agents ou des humains pour les opérations sensibles.</p>
    </div>
    <span class="status" data-source={data.source}>
      {#if data.source === "api"}Live{:else if data.source === "error"}Backend error{:else}Demo data{/if}
    </span>
  </header>

  {#if data.source === "error"}
    <p class="error" role="alert">Could not load approvals: {data.message ?? "unknown error"}</p>
  {/if}

  {#if form && "code" in form}
    {@const message = (form as { message?: string }).message}
    <p class="error" role="alert">Action error: {form.code}{message ? ` — ${message}` : ""}</p>
  {/if}
  {#if form && "ok" in form && form.ok}
    <p class="success" role="status">Approval {form.id} → {form.decision}.</p>
  {/if}

  {#if data.approvals.length === 0}
    <section class="panel"><p class="empty">No pending approvals 🎉</p></section>
  {:else}
    <section class="panel">
      <div class="panel-header">
        <h2>Pending queue</h2>
        <span class="status">{data.approvals.length}</span>
      </div>
      <table>
        <thead>
          <tr>
            <th>Subject</th>
            <th>Reason</th>
            <th>Urgency</th>
            <th>Created</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {#each data.approvals as ar}
            <tr>
              <td>{ar.subjectType}:{ar.subjectId}</td>
              <td>{ar.reason}</td>
              <td><span class="status {urgencyClass(ar.urgency)}">{ar.urgency}</span></td>
              <td>{new Date(ar.createdAt).toISOString().slice(0, 16).replace("T", " ")}</td>
              <td>
                <form method="POST" action="?/decide" use:enhance class="decide-form">
                  <input type="hidden" name="id" value={ar.id} />
                  <input type="text" name="decisionReason" placeholder="Reason (required)" required minlength="3" />
                  <button class="button primary" type="submit" name="decision" value="approved">Approve</button>
                  <button class="button" type="submit" name="decision" value="rejected">Reject</button>
                </form>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </section>
  {/if}
</section>

<style>
  .decide-form {
    display: flex;
    gap: 6px;
    align-items: center;
    flex-wrap: wrap;
  }
  .decide-form input[type="text"] {
    min-width: 180px;
    padding: 6px 8px;
    border: 1px solid #b9c8bd;
    border-radius: 6px;
  }
  .urgency-high { background: #fce4e4; color: #7a1b1b; }
  .urgency-low { background: #e8eef0; color: #2c5566; }
  .urgency-normal { background: #e7f3ea; color: #23543a; }
  .error { color: #7a1b1b; }
  .success { color: #23543a; }
  .empty { padding: 14px; color: #536259; }
</style>
