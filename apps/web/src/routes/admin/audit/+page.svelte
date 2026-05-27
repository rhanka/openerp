<script lang="ts">
  import { Button, Card, DataTable, EmptyState, Tag } from "@sentropic/design-system-svelte";
  import type { DataTableColumn, DataTableRow } from "@sentropic/design-system-svelte";

  import { t, type LocaleCode } from "$lib/i18n";

  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();

  const locale: LocaleCode = $derived(data.locale);

  type AuditRow = DataTableRow & {
    id: string;
    time: string;
    actor: string;
    action: string;
    resource: string;
  };

  function humanizeAction(action: string): string {
    // Known audit action keys have explicit i18n entries; fall back to title-case for unknown codes
    const knownKeys: Record<string, string> = {
      "settings.changed": t(locale, "audit.action.settings.changed"),
      "roles.changed": t(locale, "audit.action.roles.changed"),
      "update.preflight_requested": t(locale, "audit.action.update.preflight_requested")
    };
    return knownKeys[action] ?? action.replace(/\./g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }

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
          action: humanizeAction(e.action),
          resource: `${e.resourceType}:${e.resourceId}`
        }))
      : demoRows.map((r) => ({ ...r, action: humanizeAction(r.action) }))
  );

  const columns: DataTableColumn[] = $derived([
    { key: "time", label: t(locale, "audit.column.timestamp") },
    { key: "actor", label: t(locale, "audit.column.actor") },
    { key: "action", label: t(locale, "audit.column.action") },
    { key: "resource", label: t(locale, "audit.column.resource") }
  ]);

  const tone: "success" | "warning" | "neutral" = $derived(
    data.source === "api" ? "success" : data.source === "error" ? "warning" : "neutral"
  );
  const sourceLabel: string = $derived(
    data.source === "api"
      ? t(locale, "approval.source.api")
      : data.source === "error"
        ? t(locale, "approval.source.error")
        : t(locale, "approval.source.demo")
  );
</script>

<section class="page">
  <header class="page__header">
    <div>
      <h1>{t(locale, "audit.page.title")}</h1>
      <p class="page__lede">{t(locale, "audit.page.lede")}</p>
    </div>
    <div class="page__actions">
      <span data-source={data.source} data-testid="data-source-badge">
        <Tag {tone}>{sourceLabel}</Tag>
      </span>
      <Button variant="primary">{t(locale, "audit.action.export")}</Button>
    </div>
  </header>

  {#if data.source === "error"}
    <Card>
      <p role="alert">{t(locale, "audit.error.message")}: {data.message ?? ""}</p>
    </Card>
  {/if}

  {#if rows.length === 0}
    <EmptyState title={t(locale, "audit.empty.title")} message={t(locale, "audit.empty.message")} />
  {:else}
    <DataTable
      {columns}
      {rows}
      caption={t(locale, "audit.caption")}
      pageSize={25}
      emptyLabel={t(locale, "audit.empty.title")}
    />
  {/if}
</section>
