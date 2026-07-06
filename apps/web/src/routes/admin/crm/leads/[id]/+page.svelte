<script lang="ts">
  import { Alert, Card, Container, EmptyState, Flex, Row, Stack, Tag } from "@sentropic/design-system-svelte";

  import type { Lead, LeadStatus } from "@sentropic/openerp-domain/crm";

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
  const lead: Lead | null = $derived(data.lead);

  function statusLabel(status: LeadStatus): string {
    return t(locale, `crm.leads.status.${status}`);
  }
  function statusTone(status: LeadStatus): "success" | "warning" | "info" | "neutral" {
    if (status === "converted") return "success";
    if (status === "disqualified") return "warning";
    if (status === "working") return "info";
    return "neutral";
  }
  function entryVerb(entryType: string): string {
    const parts = entryType.split(".");
    return parts[parts.length - 1] ?? entryType;
  }
  function entryLabel(entryType: string): string {
    const verb = entryVerb(entryType);
    return t(locale, `crm.leads.entryType.${verb}`);
  }
  function entryTone(entryType: string): "success" | "warning" | "info" | "neutral" {
    const verb = entryVerb(entryType);
    if (verb === "converted") return "success";
    if (verb === "disqualified" || verb === "deleted") return "warning";
    if (verb === "created") return "info";
    return "neutral";
  }
  function formatTimestamp(iso: string): string {
    return new Date(iso).toLocaleString(locale === "fr" ? "fr-CA" : "en-CA");
  }
</script>

<Container size="xl" as="section">
<Stack gap={6}>
  <Row justify="between" align="start">
    <div>
      <h1>{lead?.displayName ?? t(locale, "crm.leads.detail.notFound")}</h1>
      {#if lead?.companyName}
        <p class="page__lede">{lead.companyName} · {lead.source ?? "—"}</p>
      {/if}
    </div>
    <Flex gap={2} align="center" wrap={true}>
      <span data-source={data.source} data-testid="data-source-badge">
        <Tag tone={sourceTone}>{sourceLabel}</Tag>
      </span>
      <a class="page__back" href="/admin/crm/leads">
        ← {t(locale, "crm.leads.detail.action.back")}
      </a>
    </Flex>
  </Row>

  {#if data.source === "error"}
    <Alert tone="warning" title={t(locale, "approval.backendError.title")}>
      {data.message ?? t(locale, "approval.backendError.fallback")}
    </Alert>
  {/if}

  {#if data.source === "not_found" || !lead}
    <EmptyState
      title={t(locale, "crm.leads.detail.notFound")}
      message={data.message ?? ""}
    />
  {:else}
    <Card>
      <div class="page__meta">
        <div>
          <dt>{t(locale, "crm.leads.field.status")}</dt>
          <dd>
            <Tag tone={statusTone(lead.status)}>{statusLabel(lead.status)}</Tag>
          </dd>
        </div>
        {#if lead.source}
          <div>
            <dt>{t(locale, "crm.leads.field.source")}</dt>
            <dd>{lead.source}</dd>
          </div>
        {/if}
        {#if lead.companyName}
          <div>
            <dt>{t(locale, "crm.leads.field.companyName")}</dt>
            <dd>{lead.companyName}</dd>
          </div>
        {/if}
        {#if lead.email}
          <div>
            <dt>{t(locale, "crm.leads.field.email")}</dt>
            <dd>{lead.email}</dd>
          </div>
        {/if}
      </div>
    </Card>

    {#if lead.status === "converted" && lead.convertedOpportunityId}
      <div class="page__converted">
        → <a href="/admin/crm/opportunities/{lead.convertedOpportunityId}">
          {t(locale, "crm.opportunities.detail.action.openDetail")}
        </a>
      </div>
    {/if}

    <h2 class="page__section-title">
      {t(locale, "crm.leads.detail.timeline.title")}
    </h2>

    {#if data.timeline.length === 0}
      <EmptyState
        title={t(locale, "crm.leads.detail.empty.title")}
        message={t(locale, "crm.leads.detail.empty.message")}
      />
    {:else}
      <ol class="page__timeline" data-testid="crm-lead-timeline">
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
</Stack>
</Container>

<style>
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
  .page__converted {
    font-size: 0.875rem;
    color: var(--st-semantic-text-muted);
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
</style>
