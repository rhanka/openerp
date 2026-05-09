<script lang="ts">
  const roles = [
    { role: "Owner", description: "Tenant ownership and exports", system: "Yes", permissions: 10, status: "Active" },
    { role: "Admin", description: "Users, roles, settings", system: "Yes", permissions: 8, status: "Active" },
    { role: "Auditor", description: "Read-only audit and reports", system: "Yes", permissions: 3, status: "Active" }
  ];
</script>

<section class="page">
  <header class="page-header">
    <div>
      <h1>Roles</h1>
      <p class="lede">Review system roles and permission coverage before module rollout.</p>
    </div>
    <button class="button primary" type="button">Create role</button>
  </header>

  <section class="panel">
    <div class="panel-header">
      <h2>Role catalog</h2>
      <span class="status">Scoped permissions</span>
    </div>
    <table>
      <thead>
        <tr>
          <th>Role</th>
          <th>Description</th>
          <th>System role</th>
          <th>Permissions</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {#each roles as row}
          <tr>
            <td>{row.role}</td>
            <td>{row.description}</td>
            <td>{row.system}</td>
            <td>{row.permissions}</td>
            <td><span class="status">{row.status}</span></td>
          </tr>
        {/each}
      </tbody>
    </table>
  </section>
</section>
