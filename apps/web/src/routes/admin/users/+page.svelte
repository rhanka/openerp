<script lang="ts">
  const users = [
    { email: "owner@example.com", name: "Owner Admin", locale: "EN", status: "Active", roles: "Owner, Admin" },
    { email: "finance@example.com", name: "Finance Lead", locale: "FR", status: "Active", roles: "Auditor" },
    { email: "pm@example.com", name: "Project Manager", locale: "EN", status: "Invited", roles: "Manager" }
  ];
</script>

<section class="page">
  <header class="page-header">
    <div>
      <h1>Users</h1>
      <p class="lede">Manage tenant users, locale preferences, status, and role assignments.</p>
    </div>
    <button class="button primary" type="button">Invite user</button>
  </header>

  <section class="panel">
    <div class="panel-header">
      <h2>User directory</h2>
      <span class="status">Deny by default</span>
    </div>
    <table>
      <thead>
        <tr>
          <th>Email</th>
          <th>Display name</th>
          <th>Locale</th>
          <th>Status</th>
          <th>Roles</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {#each users as user}
          <tr>
            <td>{user.email}</td>
            <td>{user.name}</td>
            <td>{user.locale}</td>
            <td><span class="status">{user.status}</span></td>
            <td>{user.roles}</td>
            <td><button class="button" type="button">Edit</button></td>
          </tr>
        {/each}
      </tbody>
    </table>
  </section>
</section>
