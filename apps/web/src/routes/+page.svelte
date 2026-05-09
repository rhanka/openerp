<script lang="ts">
  const metrics = [
    { label: "Active users", value: "24" },
    { label: "Roles", value: "6" },
    { label: "Audit events", value: "1,248" },
    { label: "Update state", value: "Supported" }
  ];

  const auditRows = [
    {
      time: "2026-05-09 10:45",
      actor: "owner@example.com",
      action: "organization.settings_changed",
      resource: "Tenant settings"
    },
    {
      time: "2026-05-09 10:31",
      actor: "admin@example.com",
      action: "user.roles_changed",
      resource: "Finance user"
    }
  ];
</script>

<section class="page">
  <header class="page-header">
    <div>
      <h1>OpenERP</h1>
      <p class="lede">Tenant foundation for Northwind Services. Locale EN, Canada/Quebec tax region, UTC storage.</p>
    </div>
    <div class="toolbar">
      <button class="button" type="button">FR</button>
      <button class="button primary" type="button">Run preflight</button>
    </div>
  </header>

  <div class="metric-grid" aria-label="Foundation metrics">
    {#each metrics as metric}
      <div class="metric">
        <span>{metric.label}</span>
        <strong>{metric.value}</strong>
      </div>
    {/each}
  </div>

  <section class="panel">
    <div class="panel-header">
      <h2>Latest audit activity</h2>
      <span class="status">Append-only</span>
    </div>
    <table>
      <thead>
        <tr>
          <th>Time</th>
          <th>Actor</th>
          <th>Action</th>
          <th>Resource</th>
        </tr>
      </thead>
      <tbody>
        {#each auditRows as row}
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
