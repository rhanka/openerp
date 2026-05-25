<script lang="ts">
  import { Alert, Card, EmptyState, Tag } from "@sentropic/design-system-svelte";

  import type { Project, ProjectStatus } from "@sentropic/openerp-domain/project";

  import { t, type LocaleCode } from "$lib/i18n";

  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();

  const locale: LocaleCode = $derived(data.locale);
  const sourceTone: "success" | "warning" | "neutral" = $derived(
    data.source === "api" ? "success" : data.source === "error" ? "warning" : "neutral"
  );
  const sourceLabel: string = $derived(
    data.source === "api"
      ? t(locale, "approval.source.api")
      : data.source === "error"
        ? t(locale, "approval.source.error")
        : t(locale, "approval.source.demo")
  );
  const project: Project | null = $derived(data.project);

  function statusLabel(status: ProjectStatus): string {
    return t(locale, `project.projects.status.${status}`);
  }
  function statusTone(status: ProjectStatus): "success" | "warning" | "neutral" {
    if (status === "active") return "success";
    if (status === "on_hold") return "warning";
    return "neutral";
  }
  function entryVerb(entryType: string): string {
    const parts = entryType.split(".");
    return parts[parts.length - 1] ?? entryType;
  }
  function entryLabel(entryType: string): string {
    const verb = entryVerb(entryType);
    return t(locale, `project.projects.entryType.${verb}`);
  }
  function entryTone(entryType: string): "success" | "warning" | "info" | "neutral" {
    const verb = entryVerb(entryType);
    if (verb === "created") return "info";
    if (verb === "deleted") return "warning";
    return "neutral";
  }
  function formatTimestamp(iso: string): string {
    return new Date(iso).toLocaleString(locale === "fr" ? "fr-CA" : "en-CA");
  }
</script>

<section class="page">
  <header class="page__header">
    <div>
      <h1>{project?.name ?? t(locale, "project.projects.detail.notFound")}</h1>
      {#if project?.code}
        <p class="page__lede">{project.code}</p>
      {/if}
    </div>
    <div class="page__actions">
      <span data-source={data.source} data-testid="data-source-badge">
        <Tag tone={sourceTone}>{sourceLabel}</Tag>
      </span>
      <a class="page__back" href="/admin/project/projects">
        ← {t(locale, "project.projects.detail.action.back")}
      </a>
    </div>
  </header>

  {#if data.source === "error"}
    <Alert tone="warning" title={t(locale, "approval.backendError.title")}>
      {data.message ?? t(locale, "approval.backendError.fallback")}
    </Alert>
  {/if}

  {#if data.source === "not_found" || !project}
    <EmptyState
      title={t(locale, "project.projects.detail.notFound")}
      message={data.message ?? ""}
    />
  {:else}
    <Card>
      <div class="page__meta">
        <div>
          <dt>{t(locale, "project.projects.field.status")}</dt>
          <dd>
            <Tag tone={statusTone(project.status)}>{statusLabel(project.status)}</Tag>
          </dd>
        </div>
        {#if project.description}
          <div>
            <dt>{t(locale, "project.projects.field.description")}</dt>
            <dd>{project.description}</dd>
          </div>
        {/if}
        {#if project.startDate}
          <div>
            <dt>{t(locale, "project.projects.field.startDate")}</dt>
            <dd>{project.startDate}</dd>
          </div>
        {/if}
        {#if project.endDate}
          <div>
            <dt>{t(locale, "project.projects.field.endDate")}</dt>
            <dd>{project.endDate}</dd>
          </div>
        {/if}
      </div>
    </Card>

    <h2 class="page__section-title">
      {t(locale, "project.projects.detail.timeline.title")}
    </h2>

    {#if data.timeline.length === 0}
      <EmptyState
        title={t(locale, "project.projects.detail.empty.title")}
        message={t(locale, "project.projects.detail.empty.message")}
      />
    {:else}
      <ol class="page__timeline" data-testid="project-project-timeline">
        {#each data.timeline as entry (entry.id)}
          <li class="page__timeline-item" data-entry-type={entry.entryType}>
            <div class="page__timeline-badge">
              <Tag tone={entryTone(entry.entryType)}>{entryLabel(entry.entryType)}</Tag>
            </div>
            <div class="page__timeline-body">
              <time datetime={entry.occurredAt}>{formatTimestamp(entry.occurredAt)}</time>
            </div>
          </li>
        {/each}
      </ol>
    {/if}
  {/if}
</section>

<style>
  .page {
    display: flex;
    flex-direction: column;
    gap: var(--sent-space-lg);
    padding: var(--sent-space-lg);
  }
  .page__header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: var(--sent-space-md);
  }
  .page__lede {
    margin: var(--sent-space-xs) 0 0 0;
    color: var(--sent-color-text-muted);
  }
  .page__actions {
    display: flex;
    align-items: center;
    gap: var(--sent-space-md);
  }
  .page__back {
    color: var(--sent-color-text-muted);
    font-size: var(--sent-font-size-sm);
  }
  .page__meta {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: var(--sent-space-md);
  }
  .page__meta dt {
    color: var(--sent-color-text-muted);
    font-size: var(--sent-font-size-xs);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .page__meta dd {
    margin: var(--sent-space-2xs) 0 0 0;
  }
  .page__section-title {
    margin: 0;
    font-size: var(--sent-font-size-lg);
  }
  .page__timeline {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--sent-space-sm);
  }
  .page__timeline-item {
    display: flex;
    align-items: flex-start;
    gap: var(--sent-space-md);
    padding: var(--sent-space-sm);
    background: var(--sent-color-surface-default);
    border: 1px solid var(--sent-color-border-default);
    border-radius: var(--sent-radius-sm);
  }
  .page__timeline-body {
    color: var(--sent-color-text-muted);
    font-size: var(--sent-font-size-sm);
    display: flex;
    gap: var(--sent-space-xs);
    flex-wrap: wrap;
  }
</style>
