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

  let addingWidget = $state(false);

  function columnLabel(labelKey: string): string {
    return t(locale, labelKey as Parameters<typeof t>[1]);
  }

  function formatCellValue(value: unknown, dataType: string, row?: Record<string, unknown>): string {
    if (value === null || value === undefined) return "-";
    if (dataType === "money") {
      const minor = Number(value);
      if (!isNaN(minor)) {
        const amount = minor / 100;
        const currency = row && typeof row["currency"] === "string" ? row["currency"] : null;
        if (currency) {
          try {
            return new Intl.NumberFormat(locale, { style: "currency", currency }).format(amount);
          } catch {
            // fall through to default
          }
        }
        return amount.toFixed(2);
      }
    }
    return String(value);
  }
</script>

<section class="page">
  <header class="page__header">
    <div>
      <h1>{data.render?.dashboard.name ?? t(locale, "reporting.dashboards.page.title")}</h1>
      {#if data.render?.dashboard.description}
        <p class="page__lede">{data.render.dashboard.description}</p>
      {/if}
    </div>
    <div class="page__actions">
      <span data-source={data.source} data-testid="data-source-badge">
        <Tag tone={sourceTone}>{sourceLabel}</Tag>
      </span>
    </div>
  </header>

  {#if data.source === "error"}
    <Alert tone="warning" title={t(locale, "approval.backendError.title")}>
      {(data as unknown as { message?: string }).message ?? t(locale, "approval.backendError.fallback")}
    </Alert>
  {/if}

  {#if form && "ok" in form && form.ok}
    <Alert tone="success" title={t(locale, "approval.success.title")}>
      {(form as unknown as { widgetId?: string }).widgetId}
    </Alert>
  {/if}

  {#if form && "code" in form}
    <Alert tone="warning" title={t(locale, "approval.actionError.title")}>
      {(form as unknown as { code?: string }).code}
    </Alert>
  {/if}

  {#if data.render && data.render.widgets.length > 0}
    <ul class="page__widgets" data-testid="dashboard-widgets-list">
      {#each data.render.widgets as renderedWidget (renderedWidget.widget.id)}
        <li class="page__widget">
          <Card>
            <header class="page__widget-header">
              <h2 class="page__widget-title">
                {renderedWidget.widget.title ?? renderedWidget.reportType}
              </h2>
              <div class="page__widget-meta">
                {#if renderedWidget.error}
                  <Tag tone="warning">{t(locale, "reporting.dashboards.widget.error")}</Tag>
                {:else}
                  <span class="page__widget-rows">
                    {renderedWidget.rowCount} {t(locale, "reporting.reportRuns.results.rows")}
                  </span>
                {/if}
              </div>
            </header>

            {#if renderedWidget.error}
              <p class="page__widget-error">{renderedWidget.error}</p>
            {:else if renderedWidget.columns.length > 0}
              <div class="page__table-wrap" data-testid="widget-results-table">
                <table class="page__table" aria-label={renderedWidget.widget.title ?? renderedWidget.reportType}>
                  <thead>
                    <tr>
                      {#each renderedWidget.columns as col}
                        <th scope="col">{columnLabel(col.labelKey)}</th>
                      {/each}
                    </tr>
                  </thead>
                  <tbody>
                    {#each renderedWidget.rows as row}
                      <tr>
                        {#each renderedWidget.columns as col}
                          <td>{formatCellValue(row[col.key], col.dataType, row)}</td>
                        {/each}
                      </tr>
                    {/each}
                  </tbody>
                </table>
              </div>
            {/if}

            <div class="page__widget-actions">
              <form
                method="POST"
                action="?/removeWidget"
                use:enhance
              >
                <input type="hidden" name="widgetId" value={renderedWidget.widget.id} />
                <Button type="submit" variant="secondary" size="sm" data-testid="widget-remove-btn">
                  {t(locale, "reporting.dashboards.action.removeWidget")}
                </Button>
              </form>
            </div>
          </Card>
        </li>
      {/each}
    </ul>
  {:else if data.render}
    <EmptyState
      title={t(locale, "reporting.dashboards.empty.title")}
      message={t(locale, "reporting.dashboards.empty.message")}
    />
  {/if}

  <Card>
    <form
      class="page__form"
      method="POST"
      action="?/addWidget"
      use:enhance={() => {
        addingWidget = true;
        return async ({ update }) => {
          await update();
          addingWidget = false;
        };
      }}
    >
      <fieldset class="page__fieldset">
        <legend>{t(locale, "reporting.dashboardWidgets.form.legend")}</legend>
        <div class="page__select-group">
          <label class="page__select-label" for="widget-rd">
            {t(locale, "reporting.dashboardWidgets.field.reportDefinition")}
          </label>
          <select class="page__select" id="widget-rd" name="reportDefinitionId" required>
            <option value="">{t(locale, "reporting.reportDefinitions.field.reportTypePlaceholder")}</option>
            {#each data.reportDefinitions as rd}
              <option value={rd.id}>{rd.name}</option>
            {/each}
            {#if data.source === "demo"}
              <option value="demo-rd-1">Pipeline funnel (demo)</option>
            {/if}
          </select>
        </div>
        <Input
          label={t(locale, "reporting.dashboardWidgets.field.title")}
          name="title"
        />
        <Input
          label={t(locale, "reporting.dashboardWidgets.field.position")}
          name="position"
          type="number"
          value="0"
        />
      </fieldset>
      <div class="page__form-actions">
        <Button type="submit" variant="primary" disabled={addingWidget}>
          {addingWidget
            ? t(locale, "reporting.dashboards.action.addingWidget")
            : t(locale, "reporting.dashboards.action.addWidget")}
        </Button>
      </div>
    </form>
  </Card>
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

  .page__widgets {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .page__widget-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .page__widget-title {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
  }

  .page__widget-rows {
    font-size: 0.875rem;
    color: var(--st-semantic-text-muted);
  }

  .page__widget-error {
    color: var(--st-semantic-feedback-error);
    font-size: 0.875rem;
  }

  .page__widget-actions {
    display: flex;
    justify-content: flex-end;
    margin-top: 1rem;
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
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 1rem;
  }

  .page__select-group {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
  }

  .page__select-label {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--st-semantic-text-default);
  }

  .page__select {
    box-sizing: border-box;
    width: 100%;
    padding: 0.5rem 0.75rem;
    border: 1px solid var(--st-semantic-border-default);
    border-radius: var(--st-radius-sm, 4px);
    background: var(--st-semantic-surface-default);
    color: var(--st-semantic-text-default);
    font-size: 0.875rem;
  }

  .page__form-actions {
    display: flex;
    justify-content: flex-end;
  }

  .page__table-wrap {
    overflow-x: auto;
  }

  .page__table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.875rem;
  }

  .page__table th,
  .page__table td {
    padding: 0.5rem 0.75rem;
    text-align: left;
    border-bottom: 1px solid var(--st-semantic-border-default);
  }

  .page__table th {
    font-weight: 600;
    color: var(--st-semantic-text-muted);
    background: var(--st-semantic-surface-subtle, var(--st-semantic-surface-default));
  }

  .page__table tr:last-child td {
    border-bottom: none;
  }
</style>
