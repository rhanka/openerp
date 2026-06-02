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

  import type { WorkflowDefinition, WorkflowRun } from "@sentropic/openerp-domain/workflow";

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

  function triggerLabel(eventType: string): string {
    const entry = data.catalog.triggers.find((t) => t.eventType === eventType);
    if (!entry) return eventType;
    const key = entry.labelKey as Parameters<typeof t>[1];
    return t(locale, key);
  }

  function actionLabel(actionType: string): string {
    const entry = data.catalog.actions.find((a) => a.actionType === actionType);
    if (!entry) return actionType;
    const key = entry.labelKey as Parameters<typeof t>[1];
    return t(locale, key);
  }

  function runStatus(run: WorkflowRun): string {
    const key = `workflow.status.${run.status}` as Parameters<typeof t>[1];
    return t(locale, key);
  }

  function triggeredByLabel(run: WorkflowRun): string {
    const key = `workflow.triggeredBy.${run.triggeredBy}` as Parameters<typeof t>[1];
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
</script>

<section class="page">
  <header class="page__header">
    <div>
      <h1>{t(locale, "workflow.page.title")}</h1>
      <p class="page__lede">
        {t(locale, "workflow.page.lede")}
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
        <legend>{t(locale, "workflow.form.legend")}</legend>
        <Input
          label={t(locale, "workflow.field.name")}
          name="name"
          required
          minlength={1}
        />
        <div class="page__field-group">
          <label class="page__label" for="wf-trigger-type">
            {t(locale, "workflow.field.triggerType")}
          </label>
          <select id="wf-trigger-type" name="triggerType" class="page__select" required data-testid="trigger-select">
            <option value="">— {t(locale, "workflow.field.triggerType")} —</option>
            {#each data.catalog.triggers as trigger}
              <option value={trigger.eventType}>{triggerLabel(trigger.eventType)}</option>
            {/each}
          </select>
        </div>
        <div class="page__field-group">
          <label class="page__label" for="wf-action-type">
            {t(locale, "workflow.field.actionType")}
          </label>
          <select id="wf-action-type" name="actionType" class="page__select" required data-testid="action-select">
            <option value="">— {t(locale, "workflow.field.actionType")} —</option>
            {#each data.catalog.actions as action}
              <option value={action.actionType}>{actionLabel(action.actionType)}</option>
            {/each}
          </select>
        </div>
        <Input
          label={t(locale, "workflow.field.actionConfig.subjectKey")}
          name="actionConfig_subjectKey"
          placeholder="e.g. notification.workflow.subject"
        />
        <Input
          label={t(locale, "workflow.field.actionConfig.bodyKey")}
          name="actionConfig_bodyKey"
          placeholder="e.g. notification.workflow.body"
        />
        <Input
          label={t(locale, "workflow.field.actionConfig.recipientUserId")}
          name="actionConfig_recipientUserId"
          placeholder="user-id (optional)"
        />
        <div class="page__checkbox-group">
          <label class="page__checkbox-label">
            <input type="checkbox" name="isActive" class="page__checkbox" checked />
            {t(locale, "workflow.field.isActive")}
          </label>
        </div>
        <div class="page__checkbox-group">
          <label class="page__checkbox-label">
            <input type="checkbox" name="isShared" class="page__checkbox" />
            {t(locale, "workflow.field.isShared")}
          </label>
        </div>
      </fieldset>
      <div class="page__form-actions">
        <Button type="submit" variant="primary" disabled={creating}>
          {creating
            ? t(locale, "workflow.action.creating")
            : t(locale, "workflow.action.create")}
        </Button>
      </div>
    </form>
  </Card>

  {#if data.workflows.length === 0}
    <EmptyState
      title={t(locale, "workflow.empty.title")}
      message={t(locale, "workflow.empty.message")}
    />
  {:else}
    <ul class="page__list" data-testid="reporting-workflows-list">
      {#each data.workflows as workflow (workflow.id)}
        <li class="page__item">
          <Card>
            <header class="page__item-header">
              <div>
                <h2>{workflow.name}</h2>
                <p class="page__item-sub">
                  {triggerLabel(workflow.triggerType)} &rarr; {actionLabel(workflow.actionType)}
                </p>
              </div>
              <div class="page__item-tags">
                {#if workflow.isActive}
                  <Tag tone="success">{t(locale, "workflow.tag.active")}</Tag>
                {:else}
                  <Tag tone="neutral">{t(locale, "workflow.tag.inactive")}</Tag>
                {/if}
                {#if workflow.isShared}
                  <Tag tone="info">{t(locale, "workflow.tag.shared")}</Tag>
                {/if}
              </div>
            </header>

            <div class="page__item-actions">
              <form
                method="POST"
                action="?/runNow"
                use:enhance
              >
                <input type="hidden" name="id" value={workflow.id} />
                <Button type="submit" variant="secondary" size="sm">
                  {t(locale, "workflow.action.run")}
                </Button>
              </form>
              <form
                method="POST"
                action="?/delete"
                use:enhance
                onsubmit={(e) => { if (!confirm(t(locale, "workflow.action.deleteConfirm"))) e.preventDefault(); }}
              >
                <input type="hidden" name="id" value={workflow.id} />
                <Button type="submit" variant="secondary" size="sm">
                  {t(locale, "workflow.action.delete")}
                </Button>
              </form>
            </div>

            {#if data.runsByWorkflow[workflow.id]?.length}
              <details class="page__runs">
                <summary class="page__runs-summary">
                  {t(locale, "workflow.runs.title")}
                  ({data.runsByWorkflow[workflow.id]!.length})
                </summary>
                <ul class="page__runs-list">
                  {#each data.runsByWorkflow[workflow.id]! as run (run.id)}
                    <li class="page__run-item">
                      <Tag tone={run.status === "completed" ? "success" : run.status === "failed" ? "warning" : "neutral"}>
                        {runStatus(run)}
                      </Tag>
                      <span class="page__run-meta">
                        {triggeredByLabel(run)} &mdash; {formatDate(run.createdAt)}
                        {#if run.createdResourceType}
                          &mdash; {run.createdResourceType}: {run.createdResourceId}
                        {/if}
                      </span>
                    </li>
                  {/each}
                </ul>
              </details>
            {:else}
              <p class="page__runs-empty">{t(locale, "workflow.runs.empty")}</p>
            {/if}
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
    flex-wrap: wrap;
  }

  .page__lede {
    margin: 0.5rem 0 0 0;
    color: var(--st-semantic-text-muted);
  }

  .page__actions {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    flex-wrap: wrap;
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
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .page__fieldset legend {
    font-weight: 600;
    margin-bottom: 0.5rem;
    color: var(--st-semantic-text-primary);
  }

  .page__field-group {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .page__label {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--st-semantic-text-primary);
  }

  .page__select {
    padding: 0.5rem;
    border: 1px solid var(--st-semantic-border-default);
    border-radius: 0.25rem;
    background: var(--st-semantic-background-default);
    color: var(--st-semantic-text-primary);
    font-size: 0.875rem;
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
