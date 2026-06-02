<script lang="ts">
  import { enhance } from "$app/forms";
  import {
    Alert,
    Button,
    Card,
    EmptyState,
    Input,
    Select,
    Tag
  } from "@sentropic/design-system-svelte";

  import type { ReportDefinition, ReportRun } from "@sentropic/openerp-domain/reporting";

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
  let runningId = $state<string | null>(null);

  // Latest run result from action data or server load
  const latestRun: ReportRun | null = $derived(
    form && "run" in form && form.run
      ? (form as unknown as { run: ReportRun }).run
      : data.latestRun
  );

  function reportTypeLabel(rt: string): string {
    const key = `reporting.reportTypes.${rt.replace(".", "_")}.label` as Parameters<typeof t>[1];
    return t(locale, key);
  }

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
      <h1>{t(locale, "reporting.reportDefinitions.page.title")}</h1>
      <p class="page__lede">
        {t(locale, "reporting.reportDefinitions.page.lede")}
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
      {(data as unknown as { message?: string }).message ?? t(locale, "approval.backendError.fallback")}
    </Alert>
  {/if}

  {#if form && "ok" in form && form.ok && !("run" in form)}
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
        <legend>{t(locale, "reporting.reportDefinitions.form.legend")}</legend>
        <Input
          label={t(locale, "reporting.reportDefinitions.field.name")}
          name="name"
          required
          minlength={1}
        />
        <Select
          label={t(locale, "reporting.reportDefinitions.field.reportType")}
          name="reportType"
          required
        >
          <option value="">{t(locale, "reporting.reportDefinitions.field.reportTypePlaceholder")}</option>
          {#each data.reportTypes as rt}
            <option value={rt.reportType}>{reportTypeLabel(rt.reportType)}</option>
          {/each}
          {#if data.source === "demo"}
            <option value="crm.pipeline_funnel">{t(locale, "reporting.reportTypes.crm_pipeline_funnel.label")}</option>
          {/if}
        </Select>
        <div class="page__checkbox-group">
          <label class="page__checkbox-label">
            <input type="checkbox" name="isShared" class="page__checkbox" />
            {t(locale, "reporting.reportDefinitions.field.isShared")}
          </label>
        </div>
      </fieldset>
      <div class="page__form-actions">
        <Button type="submit" variant="primary" disabled={creating}>
          {creating
            ? t(locale, "reporting.reportDefinitions.action.creating")
            : t(locale, "reporting.reportDefinitions.action.create")}
        </Button>
      </div>
    </form>
  </Card>

  {#if data.reportDefinitions.length === 0}
    <EmptyState
      title={t(locale, "reporting.reportDefinitions.empty.title")}
      message={t(locale, "reporting.reportDefinitions.empty.message")}
    />
  {:else}
    <ul class="page__list" data-testid="reporting-report-definitions-list">
      {#each data.reportDefinitions as rd (rd.id)}
        <li class="page__item">
          <Card>
            <header class="page__item-header">
              <div>
                <h2>{rd.name}</h2>
                <p class="page__item-sub">{reportTypeLabel(rd.reportType)}</p>
              </div>
              {#if rd.isShared}
                <Tag tone="success">{t(locale, "reporting.reportDefinitions.tag.shared")}</Tag>
              {:else}
                <Tag tone="neutral">{t(locale, "reporting.reportDefinitions.tag.private")}</Tag>
              {/if}
            </header>
            <div class="page__item-actions">
              <form
                method="POST"
                action="?/run"
                use:enhance={() => {
                  runningId = rd.id;
                  return async ({ update }) => {
                    await update();
                    runningId = null;
                  };
                }}
              >
                <input type="hidden" name="id" value={rd.id} />
                <Button
                  type="submit"
                  variant="secondary"
                  size="sm"
                  disabled={runningId === rd.id}
                  data-testid="rd-run-btn"
                >
                  {runningId === rd.id
                    ? t(locale, "reporting.reportDefinitions.action.running")
                    : t(locale, "reporting.reportDefinitions.action.run")}
                </Button>
              </form>
              <form
                method="POST"
                action="?/delete"
                use:enhance
                onsubmit={(e) => { if (!confirm(t(locale, "reporting.reportDefinitions.action.deleteConfirm"))) e.preventDefault(); }}
              >
                <input type="hidden" name="id" value={rd.id} />
                <Button type="submit" variant="secondary" size="sm" data-testid="rd-delete-btn">
                  {t(locale, "reporting.reportDefinitions.action.delete")}
                </Button>
              </form>
            </div>
          </Card>
        </li>
      {/each}
    </ul>
  {/if}

  {#if latestRun && latestRun.status === "completed" && latestRun.resultColumns.length > 0}
    <Card>
      <header class="page__results-header">
        <h2>{t(locale, "reporting.reportRuns.results.title")}</h2>
        <span class="page__results-count">
          {latestRun.rowCount} {t(locale, "reporting.reportRuns.results.rows")}
        </span>
      </header>
      <div class="page__table-wrap" data-testid="report-results-table">
        <table class="page__table" aria-label={t(locale, "reporting.reportRuns.results.title")}>
          <thead>
            <tr>
              {#each latestRun.resultColumns as col}
                <th scope="col">{columnLabel(col.labelKey)}</th>
              {/each}
            </tr>
          </thead>
          <tbody>
            {#each latestRun.resultRows as row}
              <tr>
                {#each latestRun.resultColumns as col}
                  <td>{formatCellValue(row[col.key], col.dataType, row)}</td>
                {/each}
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </Card>
  {:else if latestRun && latestRun.status === "failed"}
    <Alert tone="warning" title={t(locale, "reporting.reportRuns.results.failed")}>
      {latestRun.errorDetail ?? ""}
    </Alert>
  {:else if latestRun && latestRun.status === "completed" && latestRun.rowCount === 0}
    <Card>
      <EmptyState
        title={t(locale, "reporting.reportRuns.results.empty")}
        message=""
      />
    </Card>
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
    color: var(--st-semantic-text-default);
    cursor: pointer;
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
    grid-template-columns: repeat(auto-fill, minmax(min(320px, 100%), 1fr));
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

  .page__item-actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 0.5rem;
    margin-top: 1rem;
  }

  .page__results-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .page__results-count {
    font-size: 0.875rem;
    color: var(--st-semantic-text-muted);
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
