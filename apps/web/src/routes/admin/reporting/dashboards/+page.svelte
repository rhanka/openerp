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

  import type { Dashboard } from "@sentropic/openerp-domain/reporting";

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
</script>

<section class="page">
  <header class="page__header">
    <div>
      <h1>{t(locale, "reporting.dashboards.page.title")}</h1>
      <p class="page__lede">
        {t(locale, "reporting.dashboards.page.lede")}
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
        <legend>{t(locale, "reporting.dashboards.form.legend")}</legend>
        <Input
          label={t(locale, "reporting.dashboards.field.name")}
          name="name"
          required
          minlength={1}
        />
        <Input
          label={t(locale, "reporting.dashboards.field.description")}
          name="description"
        />
        <div class="page__checkbox-group">
          <label class="page__checkbox-label">
            <input type="checkbox" name="isShared" class="page__checkbox" />
            {t(locale, "reporting.dashboards.field.isShared")}
          </label>
        </div>
      </fieldset>
      <div class="page__form-actions">
        <Button type="submit" variant="primary" disabled={creating}>
          {creating
            ? t(locale, "reporting.dashboards.action.creating")
            : t(locale, "reporting.dashboards.action.create")}
        </Button>
      </div>
    </form>
  </Card>

  {#if data.dashboards.length === 0}
    <EmptyState
      title={t(locale, "reporting.dashboards.empty.title")}
      message={t(locale, "reporting.dashboards.empty.message")}
    />
  {:else}
    <ul class="page__list" data-testid="reporting-dashboards-list">
      {#each data.dashboards as dash (dash.id)}
        <li class="page__item">
          <Card>
            <header class="page__item-header">
              <div>
                <h2>
                  <a href="/admin/reporting/dashboards/{dash.id}">{dash.name}</a>
                </h2>
                {#if dash.description}
                  <p class="page__item-sub">{dash.description}</p>
                {/if}
              </div>
              {#if dash.isShared}
                <Tag tone="success">{t(locale, "reporting.dashboards.tag.shared")}</Tag>
              {:else}
                <Tag tone="neutral">{t(locale, "reporting.dashboards.tag.private")}</Tag>
              {/if}
            </header>
            <div class="page__item-actions">
              <form
                method="POST"
                action="?/delete"
                use:enhance
                onsubmit={(e) => { if (!confirm(t(locale, "reporting.dashboards.action.deleteConfirm"))) e.preventDefault(); }}
              >
                <input type="hidden" name="id" value={dash.id} />
                <Button type="submit" variant="secondary" size="sm" data-testid="dash-delete-btn">
                  {t(locale, "reporting.dashboards.action.delete")}
                </Button>
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
</style>
