<script lang="ts">
  import { enhance } from "$app/forms";
  import {
    Alert,
    Button,
    Card,
    EmptyState,
    Input,
    Tag
  } from "@sentropic/design-system-svelte";

  import type { TaxCategory, TaxRateVersion } from "@sentropic/openerp-domain/billing";

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

  let creatingCategory = $state(false);
  let creatingRate = $state(false);

  function rateDisplay(rateBps: number): string {
    return (rateBps / 1000).toFixed(3);
  }

  function ratesForCategory(catId: string): TaxRateVersion[] {
    return data.rates.filter((r) => r.taxCategoryId === catId);
  }
</script>

<section class="page">
  <header class="page__header">
    <div>
      <h1>{t(locale, "billing.taxCategories.page.title")}</h1>
      <p class="page__lede">
        {t(locale, "billing.taxCategories.page.lede")}
      </p>
    </div>
    <div class="page__actions">
      <span data-source={data.source} data-testid="data-source-badge">
        <Tag tone={sourceTone}>{sourceLabel}</Tag>
      </span>
    </div>
  </header>

  {#if data.source === "error"}
    <Alert tone="warning" title={t(locale, "approval.backendError.title")}>
      {data.message ?? t(locale, "approval.backendError.fallback")}
    </Alert>
  {/if}

  {#if form && "ok" in form && form.ok}
    <Alert tone="success" title={t(locale, "approval.success.title")}>
      {"action" in form ? String(form.action) : ""}
    </Alert>
  {/if}

  {#if form && "code" in form && !("ok" in form)}
    <Alert tone="warning" title={t(locale, "approval.actionError.title")}>
      {form.code}
    </Alert>
  {/if}

  <!-- New category form -->
  <Card>
    <form
      class="page__form"
      method="POST"
      action="?/createCategory"
      use:enhance={() => {
        creatingCategory = true;
        return async ({ update }) => {
          await update();
          creatingCategory = false;
        };
      }}
    >
      <fieldset class="page__fieldset">
        <legend>{t(locale, "billing.taxCategories.form.legend")}</legend>
        <Input
          label={t(locale, "billing.taxCategories.field.name")}
          name="name"
          required
          data-testid="tax-category-name"
        />
        <Input
          label={t(locale, "billing.taxCategories.field.code")}
          name="code"
          required
          data-testid="tax-category-code"
        />
        <Input
          label={t(locale, "billing.taxCategories.field.description")}
          name="description"
          data-testid="tax-category-description"
        />
      </fieldset>
      <div class="page__form-actions">
        <Button type="submit" variant="primary" disabled={creatingCategory} data-testid="tax-category-submit">
          {creatingCategory
            ? t(locale, "billing.taxCategories.action.creating")
            : t(locale, "billing.taxCategories.action.create")}
        </Button>
      </div>
    </form>
  </Card>

  <!-- Categories list -->
  {#if data.categories.length === 0}
    <EmptyState
      title={t(locale, "billing.taxCategories.empty.title")}
      message={t(locale, "billing.taxCategories.empty.message")}
    />
  {:else}
    <ul class="page__list" data-testid="tax-categories-list">
      {#each data.categories as category (category.id)}
        {@const rates = ratesForCategory(category.id)}
        <li class="page__item">
          <Card>
            <header class="page__item-header">
              <div>
                <h2 class="page__item-title" data-testid="tax-category-name-{category.id}">
                  {category.name}
                  <code class="page__item-code">{category.code}</code>
                </h2>
                {#if category.description}
                  <p class="page__item-sub">{category.description}</p>
                {/if}
              </div>
              <form method="POST" action="?/deleteCategory" use:enhance>
                <input type="hidden" name="id" value={category.id} />
                <Button
                  type="submit"
                  variant="secondary"
                  size="sm"
                  data-testid="delete-category-{category.id}"
                >
                  {t(locale, "billing.taxCategories.action.delete")}
                </Button>
              </form>
            </header>

            <!-- Rate versions for this category -->
            <div class="page__rates">
              <h3 class="page__rates-title">{t(locale, "billing.taxRates.form.legend")}</h3>

              {#if rates.length === 0}
                <p class="page__rates-empty">{t(locale, "billing.taxRates.empty.message")}</p>
              {:else}
                <table class="page__rates-table" data-testid="rates-table-{category.id}">
                  <thead>
                    <tr>
                      <th>{t(locale, "billing.taxRates.field.jurisdiction")}</th>
                      <th>{t(locale, "billing.taxRates.field.label")}</th>
                      <th class="page__col-num">{t(locale, "billing.taxRates.field.rateBps")}</th>
                      <th>{t(locale, "billing.taxRates.field.effectiveFrom")}</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {#each rates as rate (rate.id)}
                      <tr>
                        <td>{rate.jurisdiction}</td>
                        <td>{rate.label}</td>
                        <td class="page__col-num">{rateDisplay(rate.rateBps)}%</td>
                        <td>{rate.effectiveFrom}</td>
                        <td>
                          <form method="POST" action="?/deleteRate" use:enhance>
                            <input type="hidden" name="id" value={rate.id} />
                            <Button
                              type="submit"
                              variant="secondary"
                              size="sm"
                              data-testid="delete-rate-{rate.id}"
                            >
                              {t(locale, "billing.taxCategories.action.delete")}
                            </Button>
                          </form>
                        </td>
                      </tr>
                    {/each}
                  </tbody>
                </table>
              {/if}

              <!-- Add rate version form -->
              <form
                class="page__rate-form"
                method="POST"
                action="?/createRate"
                use:enhance={() => {
                  creatingRate = true;
                  return async ({ update }) => {
                    await update();
                    creatingRate = false;
                  };
                }}
              >
                <input type="hidden" name="taxCategoryId" value={category.id} />
                <fieldset class="page__fieldset page__fieldset--compact">
                  <legend class="page__fieldset-legend-sr">{t(locale, "billing.taxRates.form.legend")} — {category.name}</legend>
                  <Input
                    label={t(locale, "billing.taxRates.field.jurisdiction")}
                    name="jurisdiction"
                    placeholder="CA-QC"
                    data-testid="rate-jurisdiction-{category.id}"
                  />
                  <Input
                    label={t(locale, "billing.taxRates.field.label")}
                    name="label"
                    placeholder="GST"
                    data-testid="rate-label-{category.id}"
                  />
                  <Input
                    label={t(locale, "billing.taxRates.field.rateBps")}
                    name="ratePercent"
                    type="number"
                    min="0"
                    step="0.001"
                    placeholder="9.975"
                    data-testid="rate-percent-{category.id}"
                  />
                  <Input
                    label={t(locale, "billing.taxRates.field.effectiveFrom")}
                    name="effectiveFrom"
                    type="date"
                    data-testid="rate-effective-from-{category.id}"
                  />
                </fieldset>
                <div class="page__compound-row">
                  <label class="page__compound-label">
                    <input
                      type="checkbox"
                      name="compound"
                      data-testid="rate-compound-{category.id}"
                    />
                    {t(locale, "billing.taxRates.field.compound")}
                  </label>
                </div>
                <div class="page__form-actions">
                  <Button
                    type="submit"
                    variant="secondary"
                    size="sm"
                    disabled={creatingRate}
                    data-testid="rate-submit-{category.id}"
                  >
                    {creatingRate
                      ? t(locale, "billing.taxRates.action.creating")
                      : t(locale, "billing.taxRates.action.create")}
                  </Button>
                </div>
              </form>
            </div>
          </Card>
        </li>
      {/each}
    </ul>
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
    flex-shrink: 0;
  }

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
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 1rem;
  }

  .page__fieldset--compact {
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  }

  .page__fieldset-legend-sr {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
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
    gap: 0.75rem;
    margin-bottom: 1rem;
  }

  .page__item-title {
    margin: 0;
    font-size: 1rem;
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .page__item-code {
    font-size: 0.875rem;
    color: var(--st-semantic-text-muted, #64748b);
    background: var(--st-semantic-surface-subtle, #f8fafc);
    padding: 0 0.25rem;
    border-radius: var(--st-component-control-radius, 0.375rem);
  }

  .page__item-sub {
    margin: 0.25rem 0 0 0;
    color: var(--st-semantic-text-muted, #64748b);
    font-size: 0.875rem;
  }

  .page__rates {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .page__rates-title {
    margin: 0;
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--st-semantic-text-muted, #64748b);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .page__rates-empty {
    margin: 0;
    color: var(--st-semantic-text-muted, #64748b);
    font-size: 0.875rem;
  }

  .page__rates-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.875rem;
  }

  .page__rates-table th,
  .page__rates-table td {
    text-align: left;
    padding: 0.5rem 0.75rem;
    border-bottom: 1px solid var(--st-semantic-border-subtle, #e2e8f0);
  }

  .page__col-num {
    text-align: right;
  }

  .page__rate-form {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    border-top: 1px solid var(--st-semantic-border-subtle, #e2e8f0);
    padding-top: 1rem;
    margin-top: 0.75rem;
  }

  .page__compound-row {
    display: flex;
    align-items: center;
  }

  .page__compound-label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
    cursor: pointer;
  }
</style>
