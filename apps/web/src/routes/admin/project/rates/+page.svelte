<script lang="ts">
  import { enhance } from "$app/forms";
  import { Alert, Card, Container, EmptyState, Row, Stack, Tag } from "@sentropic/design-system-svelte";

  import type { Rate } from "@sentropic/openerp-domain/project";

  import { t, type LocaleCode } from "$lib/i18n";

  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();

  const locale: LocaleCode = $derived(data.locale);
  const rates: Rate[] = $derived(data.rates ?? []);
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

  function formatAmount(amount: { amountMinor: number; currency: string; scale: number }): string {
    const value = amount.amountMinor / Math.pow(10, amount.scale);
    return new Intl.NumberFormat(locale === "fr" ? "fr-CA" : "en-CA", {
      style: "currency",
      currency: amount.currency
    }).format(value);
  }
</script>

<Container size="xl" as="section">
<Stack gap={6}>
  <Row justify="between" align="start">
    <div>
      <h1>{t(locale, "project.rates.page.title")}</h1>
      <p class="page__lede">{t(locale, "project.rates.page.lede")}</p>
    </div>
    <span data-source={data.source} data-testid="data-source-badge">
      <Tag tone={sourceTone}>{sourceLabel}</Tag>
    </span>
  </Row>

  {#if data.source === "error"}
    <Alert tone="warning" title={t(locale, "approval.backendError.title")}>
      {(data as { message?: string }).message ?? t(locale, "approval.backendError.fallback")}
    </Alert>
  {/if}

  <Card>
    <form
      method="POST"
      action="?/create"
      use:enhance={() => {
        creating = true;
        return async ({ update }) => {
          creating = false;
          await update();
        };
      }}
      class="page__form"
    >
      <fieldset>
        <legend class="page__form-legend">{t(locale, "project.rates.form.legend")}</legend>
        <div class="page__form-fields">
          <label>
            <span>{t(locale, "project.rates.field.name")}</span>
            <input type="text" name="name" required placeholder={t(locale, "project.rates.field.name")} />
          </label>
          <label>
            <span>{t(locale, "project.rates.field.amount")}</span>
            <input type="number" name="amountDollars" min="0" step="0.01" required placeholder="150.00" />
          </label>
          <label>
            <span>{t(locale, "project.rates.field.currency")}</span>
            <input type="text" name="currency" value="CAD" maxlength="3" />
          </label>
          <label>
            <span>{t(locale, "project.rates.field.effectiveFrom")}</span>
            <input type="date" name="effectiveFrom" required />
          </label>
          <button type="submit" disabled={creating}>
            {creating ? t(locale, "project.rates.action.creating") : t(locale, "project.rates.action.create")}
          </button>
        </div>
      </fieldset>
    </form>
  </Card>

  {#if rates.length === 0}
    <EmptyState
      title={t(locale, "project.rates.empty.title")}
      message={t(locale, "project.rates.empty.message")}
    />
  {:else}
    <ol class="page__list" data-testid="project-rates-list">
      {#each rates as rate (rate.id)}
        <li class="page__item" data-rate-id={rate.id} data-rate-active={rate.active}>
          <div class="page__item-body">
            <span class="page__item-name">{rate.name}</span>
            <span class="page__item-meta">{formatAmount(rate.amount)} / h &mdash; {rate.effectiveFrom}</span>
          </div>
          <div class="page__item-status">
            <Tag tone={rate.active ? "success" : "neutral"}>{rate.active ? "Active" : "Inactive"}</Tag>
          </div>
          <div class="page__item-actions">
            <form
              method="POST"
              action="?/delete"
              use:enhance
              onsubmit={(e) => {
                if (!confirm(t(locale, "project.rates.action.deleteConfirm"))) {
                  e.preventDefault();
                }
              }}
            >
              <input type="hidden" name="id" value={rate.id} />
              <button type="submit" class="page__action-btn page__action-btn--delete">
                {t(locale, "project.rates.action.delete")}
              </button>
            </form>
          </div>
        </li>
      {/each}
    </ol>
  {/if}
</Stack>
</Container>

<style>
  .page__form {
    padding: 0.75rem 0;
  }
  .page__form-legend {
    font-size: 0.875rem;
    font-weight: 600;
    margin-bottom: 0.75rem;
  }
  .page__form-fields {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
    align-items: flex-end;
  }
  .page__form-fields label {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    font-size: 0.875rem;
  }
  .page__form-fields input {
    padding: 0.5rem 0.75rem;
    border: 1px solid var(--st-semantic-border-subtle);
    border-radius: var(--st-component-control-radius);
    font-size: 0.875rem;
  }
  .page__form-fields button {
    padding: 0.5rem 1rem;
    border-radius: var(--st-component-control-radius);
    border: none;
    background: var(--st-semantic-action-primary);
    color: var(--st-semantic-action-primaryText);
    font-size: 0.875rem;
    cursor: pointer;
  }
  .page__list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  .page__item {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.75rem 1rem;
    background: var(--st-semantic-surface-default);
    border: 1px solid var(--st-semantic-border-subtle);
    border-radius: var(--st-component-control-radius);
  }
  .page__item-body {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  .page__item-name {
    font-size: 0.875rem;
    font-weight: 500;
  }
  .page__item-meta {
    font-size: 0.75rem;
    color: var(--st-semantic-text-muted);
  }
  .page__item-actions {
    display: flex;
    gap: 0.5rem;
  }
  .page__action-btn {
    padding: 0.25rem 0.75rem;
    border-radius: var(--st-component-control-radius);
    border: 1px solid var(--st-semantic-border-subtle);
    font-size: 0.75rem;
    cursor: pointer;
    background: transparent;
  }
  .page__action-btn--delete {
    color: var(--st-semantic-text-muted);
  }
</style>
