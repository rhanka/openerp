<script lang="ts">
  import { enhance } from "$app/forms";
  import { Alert, Button, Card, Container, EmptyState, Flex, Input, Row, Stack, Tag } from "@sentropic/design-system-svelte";

  import type {
    Company,
    Opportunity,
    OpportunityStatus,
    PipelineStage
  } from "@sentropic/openerp-domain/crm";

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

  const companies: Company[] = $derived(data.companies ?? []);

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
  function nextStage(current: PipelineStage | undefined): PipelineStage | null {
    if (!current) return null;
    const ordered = [...data.stages].sort((a, b) => a.orderIndex - b.orderIndex);
    const idx = ordered.findIndex((s) => s.id === current.id);
    return idx >= 0 && idx + 1 < ordered.length ? ordered[idx + 1]! : null;
  }
  function formatAmount(opp: Opportunity): string | null {
    if (!opp.expectedValue) return null;
    const minor = opp.expectedValue.amountMinor;
    const scale = opp.expectedValue.scale ?? 2;
    const major = minor / Math.pow(10, scale);
    return `${major.toLocaleString(locale === "fr" ? "fr-CA" : "en-CA", {
      style: "currency",
      currency: opp.expectedValue.currency
    })}`;
  }
</script>

<Container size="xl" as="section">
<Stack gap={6}>
  <Row justify="between" align="start">
    <div>
      <h1>{t(locale, "crm.opportunities.page.title")}</h1>
      <p class="page__lede">
        {t(locale, "crm.opportunities.page.lede")}
      </p>
    </div>
    <Flex gap={2} align="center" wrap={true}>
      <span data-source={data.source} data-testid="data-source-badge">
        <Tag tone={sourceTone}>{sourceLabel}</Tag>
      </span>
    </Flex>
  </Row>

  {#if data.source === "error"}
    <Alert tone="warning" title={t(locale, "approval.backendError.title")}>
      {data.message ?? t(locale, "approval.backendError.fallback")}
    </Alert>
  {/if}

  {#if form && "ok" in form && form.ok}
    <Alert tone="success" title={t(locale, "approval.success.title")}>
      {form.name ?? form.id}
    </Alert>
  {/if}

  {#if form && "code" in form}
    <Alert tone="warning" title={t(locale, "approval.actionError.title")}>
      {form.code}
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
        <legend>{t(locale, "crm.opportunities.form.legend")}</legend>
        <Input
          label={t(locale, "crm.opportunities.field.name")}
          name="name"
          required
          minlength={2}
        />
        <label class="page__select">
          <span>{t(locale, "crm.opportunities.field.company")}</span>
          <select name="companyId" required data-testid="company-select">
            <option value="" disabled selected>{t(locale, "crm.opportunities.field.company")}...</option>
            {#each companies as company (company.id)}
              <option value={company.id}>{company.displayName}</option>
            {/each}
          </select>
        </label>
        <label class="page__select">
          <span>{t(locale, "crm.opportunities.field.stage")}</span>
          <select name="stageId" required>
            {#each data.stages as stage (stage.id)}
              <option value={stage.id}>{stage.name}</option>
            {/each}
          </select>
        </label>
        <Input
          label={t(locale, "crm.opportunities.field.expectedValue")}
          name="expectedAmount"
          inputmode="decimal"
          placeholder="12000"
        />
      </fieldset>
      <div class="page__form-actions">
        <Button type="submit" variant="primary" disabled={creating}>
          {creating
            ? t(locale, "crm.opportunities.action.creating")
            : t(locale, "crm.opportunities.action.create")}
        </Button>
      </div>
    </form>
  </Card>

  {#if data.opportunities.length === 0}
    <EmptyState
      title={t(locale, "crm.opportunities.empty.title")}
      message={t(locale, "crm.opportunities.empty.message")}
    />
  {:else}
    <ul class="page__list" data-testid="crm-opportunities-list">
      {#each data.opportunities as opp (opp.id)}
        {@const stage = stagesById[opp.stageId]}
        {@const advanceTarget = nextStage(stage)}
        {@const amount = formatAmount(opp)}
        <li class="page__item" data-status={opp.status} data-stage-id={opp.stageId}>
          <Card>
            <header class="page__item-header">
              <div>
                <h2>
                  <a class="page__item-link" href="/admin/crm/opportunities/{opp.id}">{opp.name}</a>
                </h2>
                <p class="page__item-sub">
                  {stage?.name ?? opp.stageId} · {amount ?? "–"}
                </p>
              </div>
              <Tag tone={statusTone(opp.status)}>{statusLabel(opp.status)}</Tag>
            </header>
            <div class="page__item-actions">
              {#if opp.status === "open"}
                {#if advanceTarget}
                  <form method="POST" action="?/advance" use:enhance>
                    <input type="hidden" name="id" value={opp.id} />
                    <input type="hidden" name="stageId" value={advanceTarget.id} />
                    <Button type="submit" variant="secondary" size="sm">
                      {t(locale, "crm.opportunities.action.advance")} → {advanceTarget.name}
                    </Button>
                  </form>
                {/if}
                <form method="POST" action="?/win" use:enhance>
                  <input type="hidden" name="id" value={opp.id} />
                  <Button type="submit" variant="primary" size="sm">
                    {t(locale, "crm.opportunities.action.win")}
                  </Button>
                </form>
                <form method="POST" action="?/lose" use:enhance class="page__lose-form">
                  <input type="hidden" name="id" value={opp.id} />
                  <input
                    type="text"
                    name="lossReason"
                    placeholder={t(locale, "crm.opportunities.field.lossReasonPlaceholder")}
                    aria-label={t(locale, "crm.opportunities.field.lossReason")}
                    required
                    minlength={2}
                  />
                  <Button type="submit" variant="secondary" size="sm">
                    {t(locale, "crm.opportunities.action.lose")}
                  </Button>
                </form>
              {/if}
              <form
                method="POST"
                action="?/delete"
                use:enhance
                onsubmit={(e) => { if (!confirm(t(locale, "crm.opportunities.action.deleteConfirm"))) e.preventDefault(); }}
              >
                <input type="hidden" name="id" value={opp.id} />
                <Button type="submit" variant="secondary" size="sm" data-testid="crm-delete-btn">
                  {t(locale, "crm.opportunities.action.delete")}
                </Button>
              </form>
            </div>
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
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 1rem;
  }
  .page__select {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    font-size: 0.875rem;
  }
  .page__select select {
    padding: 0.75rem;
    border: 1px solid var(--st-semantic-border-subtle);
    border-radius: var(--st-component-control-radius);
    background: var(--st-semantic-surface-default);
    color: var(--st-semantic-text-primary);
  }
  .page__form-actions {
    display: flex;
    justify-content: flex-end;
  }
  .page__list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(360px, 100%), 1fr));
    gap: 1rem;
  }
  .page__item-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 0.75rem;
  }
  .page__item-sub {
    margin: 0.25rem 0 0 0;
    color: var(--st-semantic-text-muted);
    font-size: 0.875rem;
  }
  .page__item-link {
    color: inherit;
    text-decoration: none;
  }
  .page__item-link:hover,
  .page__item-link:focus {
    text-decoration: underline;
  }
  .page__item-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    margin-top: 1rem;
  }
  .page__lose-form {
    display: flex;
    gap: 0.25rem;
    align-items: center;
  }
  .page__lose-form input {
    padding: 0.25rem 0.75rem;
    border: 1px solid var(--st-semantic-border-subtle);
    border-radius: var(--st-component-control-radius);
    font-size: 0.875rem;
  }
</style>
