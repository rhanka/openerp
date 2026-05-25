<script lang="ts">
  import { enhance } from "$app/forms";
  import { Alert, Card, EmptyState, Tag } from "@sentropic/design-system-svelte";

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

<section class="page">
  <header class="page__header">
    <div>
      <h1>{t(locale, "project.rates.page.title")}</h1>
      <p class="page__lede">{t(locale, "project.rates.page.lede")}</p>
    </div>
    <span data-source={data.source} data-testid="data-source-badge">
      <Tag tone={sourceTone}>{sourceLabel}</Tag>
    </span>
  </header>

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
    font-size: var(--sent-font-size-sm);
  }
  .page__form {
    padding: var(--sent-space-sm) 0;
  }
  .page__form-legend {
    font-size: var(--sent-font-size-sm);
    font-weight: 600;
    margin-bottom: var(--sent-space-sm);
  }
  .page__form-fields {
    display: flex;
    gap: var(--sent-space-sm);
    flex-wrap: wrap;
    align-items: flex-end;
  }
  .page__form-fields label {
    display: flex;
    flex-direction: column;
    gap: var(--sent-space-2xs);
    font-size: var(--sent-font-size-sm);
  }
  .page__form-fields input {
    padding: var(--sent-space-xs) var(--sent-space-sm);
    border: 1px solid var(--sent-color-border-default);
    border-radius: var(--sent-radius-sm);
    font-size: var(--sent-font-size-sm);
  }
  .page__form-fields button {
    padding: var(--sent-space-xs) var(--sent-space-md);
    border-radius: var(--sent-radius-sm);
    border: none;
    background: var(--sent-color-action-primary);
    color: var(--sent-color-text-on-primary);
    font-size: var(--sent-font-size-sm);
    cursor: pointer;
  }
  .page__list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--sent-space-sm);
  }
  .page__item {
    display: flex;
    align-items: center;
    gap: var(--sent-space-md);
    padding: var(--sent-space-sm) var(--sent-space-md);
    background: var(--sent-color-surface-default);
    border: 1px solid var(--sent-color-border-default);
    border-radius: var(--sent-radius-sm);
  }
  .page__item-body {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: var(--sent-space-2xs);
  }
  .page__item-name {
    font-size: var(--sent-font-size-sm);
    font-weight: 500;
  }
  .page__item-meta {
    font-size: var(--sent-font-size-xs);
    color: var(--sent-color-text-muted);
  }
  .page__item-actions {
    display: flex;
    gap: var(--sent-space-xs);
  }
  .page__action-btn {
    padding: var(--sent-space-2xs) var(--sent-space-sm);
    border-radius: var(--sent-radius-sm);
    border: 1px solid var(--sent-color-border-default);
    font-size: var(--sent-font-size-xs);
    cursor: pointer;
    background: transparent;
  }
  .page__action-btn--delete {
    color: var(--sent-color-text-muted);
  }
</style>
