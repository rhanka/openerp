<script lang="ts">
  import { Button, Container, DataTable, Flex, Row, Stack, Tag } from "@sentropic/design-system-svelte";
  import type { DataTableColumn, DataTableRow } from "@sentropic/design-system-svelte";

  type RoleRow = DataTableRow & {
    id: string;
    role: string;
    description: string;
    system: string;
    permissions: number;
    status: string;
  };

  const rows: RoleRow[] = [
    { id: "r1", role: "Owner", description: "Tenant ownership and exports", system: "Yes", permissions: 10, status: "Active" },
    { id: "r2", role: "Admin", description: "Users, roles, settings", system: "Yes", permissions: 8, status: "Active" },
    { id: "r3", role: "Auditor", description: "Read-only audit and reports", system: "Yes", permissions: 3, status: "Active" }
  ];

  const columns: DataTableColumn[] = [
    { key: "role", label: "Role" },
    { key: "description", label: "Description" },
    { key: "system", label: "System role" },
    { key: "permissions", label: "Permissions" },
    { key: "status", label: "Status" }
  ];
</script>

<Container size="xl" as="section">
<Stack gap={6}>
  <Row justify="between" align="start">
    <div>
      <h1>Roles</h1>
      <p class="page__lede">Review system roles and permission coverage before module rollout.</p>
    </div>
    <Flex gap={2} align="center" wrap={true}>
      <Tag tone="info">Scoped permissions</Tag>
      <Button variant="primary">Create role</Button>
    </Flex>
  </Row>

  <DataTable {columns} {rows} caption="Role catalog" />
</Stack>
</Container>
