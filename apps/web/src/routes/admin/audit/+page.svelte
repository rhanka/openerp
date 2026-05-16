<script lang="ts">
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();

  const demoRows = [
    { time: "2026-05-09 10:45", actor: "owner@example.com", action: "settings.changed", resource: "Organization" },
    { time: "2026-05-09 10:31", actor: "admin@example.com", action: "roles.changed", resource: "Finance Lead" },
    { time: "2026-05-09 10:02", actor: "system", action: "update.preflight_requested", resource: "Instance" }
  ];

  type Row = { time: string; actor: string; action: string; resource: string };

  const rows: Row[] = $derived(
    data.events
      ? data.events.map((e) => ({
          time: new Date(e.createdAt).toISOString().replace("T", " ").slice(0, 16),
          actor: e.actorUserId ?? e.actorType,
          action: e.action,
          resource: `${e.resourceType}:${e.resourceId}`
        }))
      : demoRows
  );

  const isEmpty = $derived(data.events !== null && rows.length === 0);
</script>

<section class="page">
  <header class="page-header">
    <div>
      <h1>Audit</h1>
      <p class="lede">Append-only tenant log for sensitive changes, exports, and update actions.</p>
    </div>
    <button class="button primary" type="button">Export</button>
  </header>

  <section class="panel">
    <div class="panel-header">
      <h2>Audit log</h2>
      <span class="status" data-source={data.source}>
        {#if data.source === "api"}Live{:else if data.source === "error"}Backend error{:else}Demo data{/if}
      </span>
    </div>
    {#if data.source === "error"}
      <p class="error" role="alert">Could not load audit events: {data.message ?? "unknown error"}</p>
    {/if}
    {#if isEmpty}
      <p class="empty">No audit events recorded yet.</p>
    {:else}
      <table>
        <thead>
          <tr>
            <th>Timestamp</th>
            <th>Actor</th>
            <th>Action</th>
            <th>Resource</th>
          </tr>
        </thead>
        <tbody>
          {#each rows as row}
            <tr>
              <td>{row.time}</td>
              <td>{row.actor}</td>
              <td>{row.action}</td>
              <td>{row.resource}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    {/if}
  </section>
</section>
