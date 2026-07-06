<script lang="ts">
  import { Button, Card, Container, DataTable, Flex, Row, Stack, Tag } from "@sentropic/design-system-svelte";
  import type { DataTableColumn, DataTableRow } from "@sentropic/design-system-svelte";

  type MetricRow = DataTableRow & { id: string; label: string; value: string };
  type AuditRow = DataTableRow & { id: string; time: string; actor: string; action: string; resource: string };

  const metrics: MetricRow[] = [
    { id: "m1", label: "Active users", value: "24" },
    { id: "m2", label: "Roles", value: "6" },
    { id: "m3", label: "Audit events", value: "1,248" },
    { id: "m4", label: "Update state", value: "Supported" }
  ];

  const auditRows: AuditRow[] = [
    { id: "a1", time: "2026-05-09 10:45", actor: "owner@example.com", action: "organization.settings_changed", resource: "Tenant settings" },
    { id: "a2", time: "2026-05-09 10:31", actor: "admin@example.com", action: "user.roles_changed", resource: "Finance user" }
  ];

  const auditColumns: DataTableColumn[] = [
    { key: "time", label: "Time" },
    { key: "actor", label: "Actor" },
    { key: "action", label: "Action" },
    { key: "resource", label: "Resource" }
  ];
</script>

<Container size="xl" as="section">
<Stack gap={6}>
  <Row justify="between" align="start">
    <div>
      <h1>OpenERP</h1>
      <p class="page__lede">
        Tenant foundation for Northwind Services. Locale EN, Canada/Quebec tax region, UTC storage.
      </p>
    </div>
    <Flex gap={2} align="center" wrap={true}>
      <a href="/login"><Button variant="secondary">Sign in</Button></a>
      <Button variant="primary">Run preflight</Button>
    </Flex>
  </Row>

  <div class="dashboard-metrics">
    {#each metrics as metric}
      <Card>
        <span class="dashboard-metric__label">{metric.label}</span>
        <strong class="dashboard-metric__value">{metric.value}</strong>
      </Card>
    {/each}
  </div>

  <Stack gap={4}>
    <header class="dashboard-section-header">
      <h2>Latest audit activity</h2>
      <Tag tone="success">Append-only</Tag>
    </header>
    <DataTable columns={auditColumns} rows={auditRows} caption="Recent audit events" />
  </Stack>
</Stack>
</Container>

<style>
  .dashboard-metrics {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 1rem;
  }
  .dashboard-metric__label {
    color: var(--st-semantic-text-secondary);
    display: block;
    font-size: 0.78rem;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }
  .dashboard-metric__value {
    display: block;
    font-size: 1.65rem;
    margin-top: 0.5rem;
  }
  .dashboard-section-header {
    align-items: center;
    display: flex;
    gap: 0.75rem;
    justify-content: space-between;
  }
  .dashboard-section-header h2 {
    font-size: 1.05rem;
    margin: 0;
  }
</style>
