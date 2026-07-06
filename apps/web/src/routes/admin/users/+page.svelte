<script lang="ts">
  import { Button, Container, DataTable, Flex, Row, Stack, Tag } from "@sentropic/design-system-svelte";
  import type { DataTableColumn, DataTableRow } from "@sentropic/design-system-svelte";

  type UserRow = DataTableRow & {
    id: string;
    email: string;
    name: string;
    locale: string;
    status: string;
    roles: string;
  };

  const rows: UserRow[] = [
    { id: "u1", email: "owner@example.com", name: "Owner Admin", locale: "EN", status: "Active", roles: "Owner, Admin" },
    { id: "u2", email: "finance@example.com", name: "Finance Lead", locale: "FR", status: "Active", roles: "Auditor" },
    { id: "u3", email: "pm@example.com", name: "Project Manager", locale: "EN", status: "Invited", roles: "Manager" }
  ];

  const columns: DataTableColumn[] = [
    { key: "email", label: "Email" },
    { key: "name", label: "Display name" },
    { key: "locale", label: "Locale" },
    { key: "status", label: "Status" },
    { key: "roles", label: "Roles" }
  ];
</script>

<Container size="xl" as="section">
<Stack gap={6}>
  <Row justify="between" align="start">
    <div>
      <h1>Users</h1>
      <p class="page__lede">Manage tenant users, locale preferences, status, and role assignments.</p>
    </div>
    <Flex gap={2} align="center" wrap={true}>
      <Tag tone="info">Deny by default</Tag>
      <Button variant="primary">Invite user</Button>
    </Flex>
  </Row>

  <DataTable {columns} {rows} caption="User directory" />
</Stack>
</Container>
