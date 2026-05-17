<script lang="ts">
  import { Button, DataTable, Tag } from "@sentropic/design-system-svelte";
  import type { DataTableColumn, DataTableRow } from "@sentropic/design-system-svelte";

  type SettingRow = DataTableRow & { id: string; field: string; value: string };

  const rows: SettingRow[] = [
    { id: "1", field: "Primary locale", value: "English" },
    { id: "2", field: "Supported locales", value: "English, French" },
    { id: "3", field: "Currency", value: "CAD" },
    { id: "4", field: "Timezone", value: "America/Toronto" },
    { id: "5", field: "Tax region", value: "CA-QC" },
    { id: "6", field: "Fiscal year start", value: "January 1" },
    { id: "7", field: "Update support window", value: "Supported" }
  ];

  const columns: DataTableColumn[] = [
    { key: "field", label: "Setting" },
    { key: "value", label: "Value" }
  ];
</script>

<section class="page">
  <header class="page__header">
    <div>
      <h1>Settings</h1>
      <p class="page__lede">
        Organization defaults, locale policy, tax region, retention, and self-hosted update state.
      </p>
    </div>
    <div class="page__actions">
      <Tag tone="info">FR/EN ready</Tag>
      <Button variant="primary">Run preflight</Button>
    </div>
  </header>

  <DataTable {columns} {rows} caption="Organization settings" />
</section>
