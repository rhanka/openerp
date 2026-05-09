<script lang="ts">
  const rows = [
    { time: "2026-05-09 10:45", actor: "owner@example.com", action: "settings.changed", resource: "Organization" },
    { time: "2026-05-09 10:31", actor: "admin@example.com", action: "roles.changed", resource: "Finance Lead" },
    { time: "2026-05-09 10:02", actor: "system", action: "update.preflight_requested", resource: "Instance" }
  ];
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
      <span class="status">Permissioned</span>
    </div>
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
  </section>
</section>
