<script lang="ts">
  import { Alert, Card, Container, EmptyState, Flex, Row, Stack, Tag } from "@sentropic/design-system-svelte";

  import type { Opportunity, OpportunityStatus, PipelineStage } from "@sentropic/openerp-domain/crm";
  import type { TimelineEntry } from "@sentropic/openerp-domain";

  import { t, type LocaleCode } from "$lib/i18n";
  import StatusStepper, { type StepperStep } from "$lib/components/StatusStepper.svelte";

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
  const opp: Opportunity | null = $derived(data.opportunity);
  const stagesById: Record<string, PipelineStage> = $derived(
    Object.fromEntries(data.stages.map((s) => [s.id, s]))
  );

  function statusLabel(status: OpportunityStatus): string {
    return t(locale, `crm.opportunities.status.${status}`);
  }
  function statusTone(status: OpportunityStatus): "success" | "warning" | "neutral" {
    if (status === "won") return "success";
    if (status === "lost") return "warning";
    return "neutral";
  }
  function entryVerb(entryType: string): string {
    const parts = entryType.split(".");
    return parts[parts.length - 1] ?? entryType;
  }
  function entryLabel(entryType: string): string {
    const verb = entryVerb(entryType);
    const key = `crm.opportunities.entryType.${verb}`;
    return t(locale, key);
  }
  function entryTone(entryType: string): "success" | "warning" | "info" | "neutral" {
    const verb = entryVerb(entryType);
    if (verb === "won") return "success";
    if (verb === "lost") return "warning";
    if (verb === "created" || verb === "stage_changed") return "info";
    return "neutral";
  }
  /** Build stepper steps from sorted pipeline stages. */
  const pipelineStepperSteps: StepperStep[] = $derived.by(() => {
    if (!opp) return [];
    const sorted = [...data.stages].sort((a, b) => a.orderIndex - b.orderIndex);
    // Only show non-terminal stages in the sequence
    const activeStages = sorted.filter((s) => !s.isWon && !s.isLost);
    let foundCurrent = false;
    return activeStages.map((stage) => {
      let state: StepperStep["state"];
      if (stage.id === opp.stageId && opp.status === "open") {
        state = "current";
        foundCurrent = true;
      } else if (foundCurrent) {
        state = "upcoming";
      } else if (stage.id === opp.stageId && opp.status !== "open") {
        // won/lost: treat the last reached stage as done
        state = "done";
        foundCurrent = true;
      } else {
        state = "done";
      }
      return { key: stage.id, label: stage.name, state };
    });
  });

  const pipelineTerminalLabel: string | null = $derived.by(() => {
    if (!opp) return null;
    if (opp.status === "won") return t(locale, "crm.opportunities.status.won");
    if (opp.status === "lost") return t(locale, "crm.opportunities.status.lost");
    return null;
  });

  const pipelineTerminalTone: "success" | "warning" | "neutral" = $derived(
    opp?.status === "won" ? "success" : opp?.status === "lost" ? "warning" : "neutral"
  );

  function formatAmount(o: Opportunity): string | null {
    if (!o.expectedValue) return null;
    const minor = o.expectedValue.amountMinor;
    const scale = o.expectedValue.scale ?? 2;
    const major = minor / Math.pow(10, scale);
    return major.toLocaleString(locale === "fr" ? "fr-CA" : "en-CA", {
      style: "currency",
      currency: o.expectedValue.currency
    });
  }
  function formatTimestamp(iso: string): string {
    return new Date(iso).toLocaleString(locale === "fr" ? "fr-CA" : "en-CA");
  }
  function payloadStageLabel(payload: Record<string, unknown>): string | null {
    const stageId = typeof payload?.stageId === "string" ? (payload.stageId as string) : null;
    if (!stageId) return null;
    return stagesById[stageId]?.name ?? stageId;
  }
</script>

<Container size="xl" as="section">
<Stack gap={6}>
  <Row justify="between" align="start">
    <div>
      <h1>{opp?.name ?? t(locale, "crm.opportunities.detail.notFound")}</h1>
      {#if opp}
        <p class="page__lede">
          {stagesById[opp.stageId]?.name ?? opp.stageId} · {formatAmount(opp) ?? "—"}
        </p>
      {/if}
    </div>
    <Flex gap={2} align="center" wrap={true}>
      <span data-source={data.source} data-testid="data-source-badge">
        <Tag tone={sourceTone}>{sourceLabel}</Tag>
      </span>
      <a class="page__back" href="/admin/crm/opportunities">
        ← {t(locale, "crm.opportunities.detail.action.back")}
      </a>
    </Flex>
  </Row>

  {#if data.source === "error"}
    <Alert tone="warning" title={t(locale, "approval.backendError.title")}>
      {data.message ?? t(locale, "approval.backendError.fallback")}
    </Alert>
  {/if}

  {#if data.source === "not_found" || !opp}
    <EmptyState
      title={t(locale, "crm.opportunities.detail.notFound")}
      message={data.message ?? ""}
    />
  {:else}
    <Card>
      <div class="page__meta">
        <div>
          <dt>{t(locale, "crm.opportunities.field.status")}</dt>
          <dd>
            <Tag tone={statusTone(opp.status)}>{statusLabel(opp.status)}</Tag>
          </dd>
        </div>
        <div>
          <dt>{t(locale, "crm.opportunities.field.stage")}</dt>
          <dd>{stagesById[opp.stageId]?.name ?? opp.stageId}</dd>
        </div>
        <div>
          <dt>{t(locale, "crm.opportunities.field.expectedValue")}</dt>
          <dd>{formatAmount(opp) ?? "—"}</dd>
        </div>
      </div>
    </Card>

    {#if pipelineStepperSteps.length > 0}
      <StatusStepper
        steps={pipelineStepperSteps}
        terminalLabel={pipelineTerminalLabel}
        terminalTone={pipelineTerminalTone}
        testId="opportunity-pipeline-stepper"
      />
    {/if}

    <h2 class="page__section-title">
      {t(locale, "crm.opportunities.detail.timeline.title")}
    </h2>

    {#if data.timeline.length === 0}
      <EmptyState
        title={t(locale, "crm.opportunities.detail.empty.title")}
        message={t(locale, "crm.opportunities.detail.empty.message")}
      />
    {:else}
      <ol class="page__timeline" data-testid="crm-opportunity-timeline">
        {#each data.timeline as entry (entry.id)}
          {@const stageLabel = payloadStageLabel(entry.payloadSummary as Record<string, unknown>)}
          <li class="page__timeline-item" data-entry-type={entry.entryType}>
            <div class="page__timeline-badge">
              <Tag tone={entryTone(entry.entryType)}>{entryLabel(entry.entryType)}</Tag>
            </div>
            <div class="page__timeline-body">
              <time datetime={entry.occurredAt}>{formatTimestamp(entry.occurredAt)}</time>
              {#if stageLabel}
                <span>· {stageLabel}</span>
              {/if}
              {#if (entry.payloadSummary as Record<string, unknown>)?.lossReason}
                <span>· {(entry.payloadSummary as Record<string, string>).lossReason}</span>
              {/if}
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
