<script lang="ts">
  import { enhance } from "$app/forms";
  import { Alert, Button, Card, Container, EmptyState, Flex, Input, Row, Select, Stack, Tag } from "@sentropic/design-system-svelte";

  import type { DeliveryRun, ReportDefinition, ScheduledDelivery } from "@sentropic/openerp-domain/reporting";

  import { t, type LocaleCode } from "$lib/i18n";

  import type { PageData, ActionData } from "./$types";

  let { data, form }: { data: PageData; form: ActionData } = $props();

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

  let creating = $state(false);
  let runningDue = $state(false);

  const CADENCES: ScheduledDelivery["cadence"][] = ["daily", "weekly", "monthly", "quarterly", "annual"];

  function cadenceLabel(cadence: ScheduledDelivery["cadence"]): string {
    const key = `reporting.scheduledDeliveries.cadence.${cadence}` as Parameters<typeof t>[1];
    return t(locale, key);
  }

  function runStatus(run: DeliveryRun): string {
    const key = `reporting.deliveryRuns.status.${run.status}` as Parameters<typeof t>[1];
    return t(locale, key);
  }

  function triggeredByLabel(run: DeliveryRun): string {
    const key = `reporting.deliveryRuns.triggeredBy.${run.triggeredBy}` as Parameters<typeof t>[1];
    return t(locale, key);
  }

  function formatDate(iso: string | null): string {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
    }
  }

  function getReportDefName(defs: ReportDefinition[], id: string): string {
    return defs.find((d) => d.id === id)?.name ?? id;
  }
</script>

<Container size="xl" as="section">
<Stack gap={6}>
  <Row justify="between" align="start">
    <div>
      <h1>{t(locale, "reporting.scheduledDeliveries.page.title")}</h1>
      <p class="page__lede">
        {t(locale, "reporting.scheduledDeliveries.page.lede")}
      </p>
    </div>
    <Flex gap={2} align="center" wrap={true}>
      <span data-source={data.source} data-testid="data-source-badge">
        <Tag tone={sourceTone}>{sourceLabel}</Tag>
      </span>
      <form
        method="POST"
        action="?/runDue"
        use:enhance={() => {
          runningDue = true;
          return async ({ update }) => {
            await update();
            runningDue = false;
          };
        }}
      >
        <Button type="submit" variant="secondary" size="sm" disabled={runningDue}>
          {runningDue
            ? t(locale, "reporting.scheduledDeliveries.action.runningDue")
            : t(locale, "reporting.scheduledDeliveries.action.runDue")}
        </Button>
      </form>
    </Flex>
  </Row>

  {#if data.source === "error"}
    <Alert tone="warning" title={t(locale, "approval.backendError.title")}>
      {(data as unknown as { message?: string }).message ?? t(locale, "approval.backendError.fallback")}
    </Alert>
  {/if}

  {#if form && "ok" in form && form.ok}
    <Alert tone="success" title={t(locale, "approval.success.title")}>
      {(form as unknown as { name?: string }).name ?? (form as unknown as { id?: string }).id}
    </Alert>
  {/if}

  {#if form && "code" in form}
    <Alert tone="warning" title={t(locale, "approval.actionError.title")}>
      {(form as unknown as { code?: string }).code}
    </Alert>
  {/if}

  <Card>
    <form
      class="page__form"
      method="POST"
      action="?/create"
      use:enhance={() => {
        creating = true;
        return async ({ update }) => {
          await update();
          creating = false;
        };
      }}
    >
      <fieldset class="page__fieldset">
        <legend>{t(locale, "reporting.scheduledDeliveries.form.legend")}</legend>
        <Input
          label={t(locale, "reporting.scheduledDeliveries.field.name")}
          name="name"
          required
          minlength={1}
        />
        <Select
          label={t(locale, "reporting.scheduledDeliveries.field.targetId")}
          name="targetId"
          required
        >
          <option value="">{t(locale, "reporting.scheduledDeliveries.field.targetIdPlaceholder")}</option>
          {#each data.reportDefs as rd (rd.id)}
            <option value={rd.id}>{rd.name}</option>
          {/each}
        </Select>
        <Select
          label={t(locale, "reporting.scheduledDeliveries.field.cadence")}
          name="cadence"
          required
          data-testid="cadence-select"
        >
          <option value="">{t(locale, "reporting.scheduledDeliveries.field.cadencePlaceholder")}</option>
          {#each CADENCES as cadence}
            <option value={cadence}>{cadenceLabel(cadence)}</option>
          {/each}
        </Select>
        <Input
          label={t(locale, "reporting.scheduledDeliveries.field.timezone")}
          name="timezone"
          value="UTC"
        />
        <Input
          label={t(locale, "reporting.scheduledDeliveries.field.recipientUserIds")}
          name="recipientUserIds"
          placeholder="user-id-1, user-id-2"
        />
        <div class="page__checkbox-group">
          <label class="page__checkbox-label">
            <input type="checkbox" name="isShared" class="page__checkbox" />
            {t(locale, "reporting.scheduledDeliveries.field.isShared")}
          </label>
        </div>
      </fieldset>
      <div class="page__form-actions">
        <Button type="submit" variant="primary" disabled={creating}>
          {creating
            ? t(locale, "reporting.scheduledDeliveries.action.creating")
            : t(locale, "reporting.scheduledDeliveries.action.create")}
        </Button>
      </div>
    </form>
  </Card>

  {#if data.deliveries.length === 0}
    <EmptyState
      title={t(locale, "reporting.scheduledDeliveries.empty.title")}
      message={t(locale, "reporting.scheduledDeliveries.empty.message")}
    />
  {:else}
    <ul class="page__list" data-testid="reporting-scheduled-deliveries-list">
      {#each data.deliveries as delivery (delivery.id)}
        <li class="page__item">
          <Card>
            <header class="page__item-header">
              <div>
                <h2>{delivery.name}</h2>
                <p class="page__item-sub">
                  {getReportDefName(data.reportDefs, delivery.targetId)} &mdash;
                  {cadenceLabel(delivery.cadence)} &mdash;
                  {t(locale, "reporting.scheduledDeliveries.field.nextRunAt")}: {formatDate(delivery.nextRunAt)}
                </p>
              </div>
              <div class="page__item-tags">
                {#if delivery.active}
                  <Tag tone="success">{t(locale, "reporting.scheduledDeliveries.tag.active")}</Tag>
                {:else}
                  <Tag tone="neutral">{t(locale, "reporting.scheduledDeliveries.tag.inactive")}</Tag>
                {/if}
                {#if delivery.isShared}
                  <Tag tone="info">{t(locale, "reporting.scheduledDeliveries.tag.shared")}</Tag>
                {/if}
              </div>
            </header>

            <div class="page__item-actions">
              <form
                method="POST"
                action="?/runNow"
                use:enhance
              >
                <input type="hidden" name="id" value={delivery.id} />
                <Button type="submit" variant="secondary" size="sm">
                  {t(locale, "reporting.scheduledDeliveries.action.run")}
                </Button>
              </form>
              <form
                method="POST"
                action="?/delete"
                use:enhance
                onsubmit={(e) => { if (!confirm(t(locale, "reporting.scheduledDeliveries.action.deleteConfirm"))) e.preventDefault(); }}
              >
                <input type="hidden" name="id" value={delivery.id} />
                <Button type="submit" variant="secondary" size="sm">
                  {t(locale, "reporting.scheduledDeliveries.action.delete")}
                </Button>
              </form>
            </div>

            {#if data.runsByDelivery[delivery.id]?.length}
              <details class="page__runs">
                <summary class="page__runs-summary">
                  {t(locale, "reporting.scheduledDeliveries.runs.title")}
                  ({data.runsByDelivery[delivery.id]!.length})
                </summary>
                <ul class="page__runs-list">
                  {#each data.runsByDelivery[delivery.id]! as run (run.id)}
                    <li class="page__run-item">
                      <Tag tone={run.status === "completed" ? "success" : run.status === "failed" ? "warning" : "neutral"}>
                        {runStatus(run)}
                      </Tag>
                      <span class="page__run-meta">
                        {triggeredByLabel(run)} &mdash; {formatDate(run.createdAt)}
                        {#if run.reportRunId}
                          &mdash; snapshot: {run.reportRunId}
                        {/if}
                      </span>
                    </li>
                  {/each}
                </ul>
              </details>
            {:else}
              <p class="page__runs-empty">{t(locale, "reporting.scheduledDeliveries.runs.empty")}</p>
            {/if}
          </Card>
        </li>
      {/each}
    </ul>
  {/if}
</Stack>
</Container>

<style>
  .page__form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .page__fieldset {
    border: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .page__fieldset legend {
    font-weight: 600;
    margin-bottom: 0.5rem;
    color: var(--st-semantic-text-primary);
  }

  .page__checkbox-group {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .page__checkbox-label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
    cursor: pointer;
  }

  .page__checkbox {
    width: 1rem;
    height: 1rem;
  }

  .page__form-actions {
    display: flex;
    justify-content: flex-end;
  }

  .page__list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .page__item-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
  }

  .page__item-tags {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .page__item-sub {
    margin: 0.25rem 0 0 0;
    font-size: 0.875rem;
    color: var(--st-semantic-text-muted);
  }

  .page__item-actions {
    display: flex;
    gap: 0.5rem;
    margin-top: 1rem;
    flex-wrap: wrap;
  }

  .page__runs {
    margin-top: 1rem;
    border-top: 1px solid var(--st-semantic-border-default);
    padding-top: 0.75rem;
  }

  .page__runs-summary {
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    color: var(--st-semantic-text-secondary);
  }

  .page__runs-list {
    list-style: none;
    padding: 0;
    margin: 0.5rem 0 0 0;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .page__run-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.75rem;
  }

  .page__run-meta {
    color: var(--st-semantic-text-muted);
  }

  .page__runs-empty {
    margin: 0.5rem 0 0 0;
    font-size: 0.875rem;
    color: var(--st-semantic-text-muted);
  }
</style>
