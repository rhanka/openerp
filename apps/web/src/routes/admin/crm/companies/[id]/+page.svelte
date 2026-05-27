<script lang="ts">
  import { Alert, Card, EmptyState, Tag } from "@sentropic/design-system-svelte";

  import type { Company, CompanyStatus, Opportunity, OpportunityStatus, Contact } from "@sentropic/openerp-domain/crm";

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
  const opportunities: Opportunity[] = $derived(data.opportunities ?? []);
  const contacts: Contact[] = $derived(data.contacts ?? []);

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

  function oppStatusLabel(status: OpportunityStatus): string {
    return t(locale, `crm.opportunities.status.${status}`);
  }
  function oppStatusTone(status: OpportunityStatus): "success" | "warning" | "neutral" {
    if (status === "won") return "success";
    if (status === "lost") return "warning";
    return "neutral";
  }
  function formatOppAmount(opp: Opportunity): string | null {
    if (!opp.expectedValue) return null;
    const minor = opp.expectedValue.amountMinor;
    const scale = opp.expectedValue.scale ?? 2;
    const major = minor / Math.pow(10, scale);
    return major.toLocaleString(locale === "fr" ? "fr-CA" : "en-CA", {
      style: "currency",
      currency: opp.expectedValue.currency
    });
  }
  function contactStatusTone(status: string): "success" | "neutral" {
    return status === "active" ? "success" : "neutral";
  }
  function contactStatusLabel(status: string): string {
    return t(locale, `crm.contacts.status.${status}`);
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

    <h2 class="page__section-title" data-testid="opportunities-section-title">
      {t(locale, "crm.companies.detail.opportunities.title")}
    </h2>

    {#if opportunities.length === 0}
      <EmptyState
        title={t(locale, "crm.companies.detail.opportunities.empty.title")}
        message={t(locale, "crm.companies.detail.opportunities.empty.message")}
      />
    {:else}
      <ol class="page__items" data-testid="company-opportunities-list">
        {#each opportunities as opp (opp.id)}
          <li class="page__item">
            <a class="page__item-link" href="/admin/crm/opportunities/{opp.id}">
              <span class="page__item-name">{opp.name}</span>
              {#if opp.expectedValue}
                <span class="page__item-meta">{formatOppAmount(opp) ?? "—"}</span>
              {/if}
            </a>
            <Tag tone={oppStatusTone(opp.status)}>{oppStatusLabel(opp.status)}</Tag>
          </li>
        {/each}
      </ol>
    {/if}

    <h2 class="page__section-title" data-testid="contacts-section-title">
      {t(locale, "crm.companies.detail.contacts.title")}
    </h2>

    {#if contacts.length === 0}
      <EmptyState
        title={t(locale, "crm.companies.detail.contacts.empty.title")}
        message={t(locale, "crm.companies.detail.contacts.empty.message")}
      />
    {:else}
      <ol class="page__items" data-testid="company-contacts-list">
        {#each contacts as contact (contact.id)}
          <li class="page__item">
            <a class="page__item-link" href="/admin/crm/contacts/{contact.id}">
              <span class="page__item-name">{contact.displayName}</span>
              {#if contact.email}
                <span class="page__item-meta">{contact.email}</span>
              {/if}
            </a>
            <Tag tone={contactStatusTone(contact.status)}>{contactStatusLabel(contact.status)}</Tag>
          </li>
        {/each}
      </ol>
    {/if}

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
    box-sizing: border-box;
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
    color: var(--st-semantic-text-muted);
  }
  .page__actions {
    display: flex;
    align-items: center;
    gap: 1rem;
  }
  .page__back {
    color: var(--st-semantic-text-muted);
    font-size: 0.875rem;
  }
  .page__meta {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 1rem;
  }
  .page__meta dt {
    color: var(--st-semantic-text-muted);
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
    background: var(--st-semantic-surface-default);
    border: 1px solid var(--st-semantic-border-subtle);
    border-radius: var(--st-component-control-radius);
  }
  .page__timeline-body {
    color: var(--st-semantic-text-muted);
    font-size: 0.875rem;
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
  .page__items {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .page__item {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.75rem;
    background: var(--st-semantic-surface-default);
    border: 1px solid var(--st-semantic-border-subtle);
    border-radius: var(--st-component-control-radius);
  }
  .page__item-link {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
    text-decoration: none;
    color: inherit;
  }
  .page__item-link:hover,
  .page__item-link:focus {
    text-decoration: underline;
  }
  .page__item-name {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--st-semantic-text-primary);
  }
  .page__item-meta {
    font-size: 0.75rem;
    color: var(--st-semantic-text-muted);
  }
</style>
