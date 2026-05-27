<script lang="ts">
  import { Alert, Card, EmptyState, Tag } from "@sentropic/design-system-svelte";

  import type { Company, CompanyStatus } from "@sentropic/openerp-domain/crm";

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
  const company: Company | null = $derived(data.company);

  function statusLabel(status: CompanyStatus): string {
    return t(locale, `crm.companies.status.${status}`);
  }
  function statusTone(status: CompanyStatus): "success" | "neutral" {
    return status === "active" ? "success" : "neutral";
  }
  function entryVerb(entryType: string): string {
    const parts = entryType.split(".");
    return parts[parts.length - 1] ?? entryType;
  }
  function entryLabel(entryType: string): string {
    const verb = entryVerb(entryType);
    return t(locale, `crm.companies.entryType.${verb}`);
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
      <h1>{company?.displayName ?? t(locale, "crm.companies.detail.notFound")}</h1>
      {#if company?.legalName}
        <p class="page__lede">{company.legalName}</p>
      {/if}
    </div>
    <div class="page__actions">
      <span data-source={data.source} data-testid="data-source-badge">
        <Tag tone={sourceTone}>{sourceLabel}</Tag>
      </span>
      <a class="page__back" href="/admin/crm/companies">
        ← {t(locale, "crm.companies.detail.action.back")}
      </a>
    </div>
  </header>

  {#if data.source === "error"}
    <Alert tone="warning" title={t(locale, "approval.backendError.title")}>
      {data.message ?? t(locale, "approval.backendError.fallback")}
    </Alert>
  {/if}

  {#if data.source === "not_found" || !company}
    <EmptyState
      title={t(locale, "crm.companies.detail.notFound")}
      message={data.message ?? ""}
    />
  {:else}
    <Card>
      <div class="page__meta">
        <div>
          <dt>{t(locale, "crm.companies.field.status")}</dt>
          <dd>
            <Tag tone={statusTone(company.status)}>{statusLabel(company.status)}</Tag>
          </dd>
        </div>
        {#if company.email}
          <div>
            <dt>{t(locale, "crm.companies.field.email")}</dt>
            <dd>{company.email}</dd>
          </div>
        {/if}
        {#if company.website}
          <div>
            <dt>{t(locale, "crm.companies.field.website")}</dt>
            <dd>{company.website}</dd>
          </div>
        {/if}
      </div>
    </Card>

    <h2 class="page__section-title">
      {t(locale, "crm.companies.detail.timeline.title")}
    </h2>

    {#if data.timeline.length === 0}
      <EmptyState
        title={t(locale, "crm.companies.detail.empty.title")}
        message={t(locale, "crm.companies.detail.empty.message")}
      />
    {:else}
      <ol class="page__timeline" data-testid="crm-company-timeline">
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
    gap: 1.5rem;
    padding: 1.5rem;
  }
  .page__header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
  }
  .page__lede {
    margin: 0.5rem 0 0 0;
    color: var(--st-semantic-text-muted, #64748b);
  }
  .page__actions {
    display: flex;
    align-items: center;
    gap: 1rem;
  }
  .page__back {
    color: var(--st-semantic-text-muted, #64748b);
    font-size: 0.875rem;
  }
  .page__meta {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 1rem;
  }
  .page__meta dt {
    color: var(--st-semantic-text-muted, #64748b);
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .page__meta dd {
    margin: 0.25rem 0 0 0;
  }
  .page__section-title {
    margin: 0;
    font-size: 1.125rem;
  }
  .page__timeline {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  .page__timeline-item {
    display: flex;
    align-items: flex-start;
    gap: 1rem;
    padding: 0.75rem;
    background: var(--st-semantic-surface-default, #ffffff);
    border: 1px solid var(--st-semantic-border-subtle, #e2e8f0);
    border-radius: var(--st-component-control-radius, 0.375rem);
  }
  .page__timeline-body {
    color: var(--st-semantic-text-muted, #64748b);
    font-size: 0.875rem;
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
</style>
