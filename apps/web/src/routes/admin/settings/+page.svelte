<script lang="ts">
  const settings = [
    { field: "Primary locale", value: "English" },
    { field: "Supported locales", value: "English, French" },
    { field: "Currency", value: "CAD" },
    { field: "Timezone", value: "America/Toronto" },
    { field: "Tax region", value: "CA-QC" },
    { field: "Fiscal year start", value: "January 1" },
    { field: "Update support window", value: "Supported" }
  ];
</script>

<section class="page">
  <header class="page-header">
    <div>
      <h1>Settings</h1>
      <p class="lede">Organization defaults, locale policy, tax region, retention, and self-hosted update state.</p>
    </div>
    <button class="button primary" type="button">Run preflight</button>
  </header>

  <section class="panel">
    <div class="panel-header">
      <h2>Organization settings</h2>
      <span class="status">FR/EN ready</span>
    </div>
    <table>
      <thead>
        <tr>
          <th>Setting</th>
          <th>Value</th>
        </tr>
      </thead>
      <tbody>
        {#each settings as row}
          <tr>
            <td>{row.field}</td>
            <td>{row.value}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </section>
</section>
