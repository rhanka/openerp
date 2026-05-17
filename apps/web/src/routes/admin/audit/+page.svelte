<script lang="ts">
  import { Button, Card, DataTable, EmptyState, Tag } from "@sentropic/design-system-svelte";
  import type { DataTableColumn, DataTableRow } from "@sentropic/design-system-svelte";

  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();

  type AuditRow = DataTableRow & {
    id: string;
    time: string;
    actor: string;
    action: string;
    resource: string;
  };

  const demoRows: AuditRow[] = [
    { id: "demo-1", time: "2026-05-09 10:45", actor: "owner@example.com", action: "settings.changed", resource: "Organization" },
    { id: "demo-2", time: "2026-05-09 10:31", actor: "admin@example.com", action: "roles.changed", resource: "Finance Lead" },
    { id: "demo-3", time: "2026-05-09 10:02", actor: "system", action: "update.preflight_requested", resource: "Instance" }
  ];

  const rows: AuditRow[] = $derived(
    data.events
      ? data.events.map((e) => ({
          id: e.id,
          time: new Date(e.createdAt).toISOString().replace("T", " ").slice(0, 16),
          actor: e.actorUserId ?? e.actorType,
          action: e.action,
          resource: `${e.resourceType}:${e.resourceId}`
        }))
      : demoRows
  );

  const columns: DataTableColumn[] = [
    { key: "time", label: "Timestamp" },
    { key: "actor", label: "Actor" },
    { key: "action", label: "Action" },
    { key: "resource", label: "Resource" }
  ];

  const tone: "success" | "warning" | "neutral" = $derived(
    data.source === "api" ? "success" : data.source === "error" ? "warning" : "neutral"
  );
  const sourceLabel: string = $derived(
    data.source === "api" ? "Live" : data.source === "error" ? "Backend error" : "Demo data"
  );
</script>

<section class="page">
  <header class="page__header">
    <div>
      <h1>Audit</h1>
      <p class="page__lede">Append-only tenant log for sensitive changes, exports, and update actions.</p>
    </div>
    <div class="page__actions">
      <span data-source={data.source} data-testid="data-source-badge">
        <Tag {tone}>{sourceLabel}</Tag>
      </span>
      <Button variant="primary">Export</Button>
    </div>
  </header>

  {#if data.source === "error"}
    <Card>
      <p role="alert">Could not load audit events: {data.message ?? "unknown error"}</p>
    </Card>
  {/if}

  {#if rows.length === 0}
    <EmptyState title="No audit events recorded yet" message="The log will populate as users and agents act on this tenant." />
  {:else}
    <DataTable
      {columns}
      {rows}
      caption="Audit log"
      pageSize={25}
      emptyLabel="No audit events recorded yet."
    />
  {/if}
</section>
