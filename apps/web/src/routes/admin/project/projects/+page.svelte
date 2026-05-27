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

  import type { Project } from "@sentropic/openerp-domain/project";

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

  function statusLabel(status: Project["status"]): string {
    return t(locale, `project.projects.status.${status}`);
  }

  function statusTone(status: Project["status"]): "success" | "warning" | "neutral" {
    if (status === "active") return "success";
    if (status === "on_hold") return "warning";
    return "neutral";
  }
</script>

<section class="page">
  <header class="page__header">
    <div>
      <h1>{t(locale, "project.projects.page.title")}</h1>
      <p class="page__lede">
        {t(locale, "project.projects.page.lede")}
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
      {("name" in form ? form.name : null) ?? ("id" in form ? form.id : "")}
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
        <legend>{t(locale, "project.projects.form.legend")}</legend>
        <Input
          label={t(locale, "project.projects.field.name")}
          name="name"
          required
          minlength={2}
        />
        <Input
          label={t(locale, "project.projects.field.code")}
          name="code"
        />
        <Input
          label={t(locale, "project.projects.field.description")}
          name="description"
        />
      </fieldset>
      <div class="page__form-actions">
        <Button type="submit" variant="primary" disabled={creating}>
          {creating
            ? t(locale, "project.projects.action.creating")
            : t(locale, "project.projects.action.create")}
        </Button>
      </div>
    </form>
  </Card>

  {#if data.projects.length === 0}
    <EmptyState
      title={t(locale, "project.projects.empty.title")}
      message={t(locale, "project.projects.empty.message")}
    />
  {:else}
    <ul class="page__list" data-testid="project-projects-list">
      {#each data.projects as project (project.id)}
        <li class="page__item" data-status={project.status}>
          <Card>
            <header class="page__item-header">
              <div>
                <h2>
                  <a class="page__item-link" href="/admin/project/projects/{project.id}">{project.name}</a>
                </h2>
                {#if project.code}
                  <p class="page__item-sub">{project.code}</p>
                {/if}
              </div>
              <Tag tone={statusTone(project.status)}>{statusLabel(project.status)}</Tag>
            </header>
            {#if project.description}
              <p class="page__item-desc">{project.description}</p>
            {/if}
            <div class="page__item-actions">
              <form
                method="POST"
                action={project.status === "active" || project.status === "draft" ? "?/archive" : "?/reactivate"}
                use:enhance
              >
                <input type="hidden" name="id" value={project.id} />
                <Button type="submit" variant="secondary" size="sm">
                  {project.status === "active" || project.status === "draft"
                    ? t(locale, "project.projects.action.archive")
                    : t(locale, "project.projects.action.reactivate")}
                </Button>
              </form>
              <form
                method="POST"
                action="?/delete"
                use:enhance
                onsubmit={(e) => { if (!confirm(t(locale, "project.projects.action.deleteConfirm"))) e.preventDefault(); }}
              >
                <input type="hidden" name="id" value={project.id} />
                <Button type="submit" variant="secondary" size="sm" data-testid="project-delete-btn">
                  {t(locale, "project.projects.action.delete")}
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

  .page__form-actions {
    display: flex;
    justify-content: flex-end;
  }

  .page__list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
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
    color: var(--st-semantic-text-muted, #64748b);
    font-size: 0.875rem;
  }

  .page__item-desc {
    margin: 0.75rem 0;
    color: var(--st-semantic-text-muted, #64748b);
    font-size: 0.875rem;
  }

  .page__item-actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 0.5rem;
  }

  .page__item-link {
    color: inherit;
    text-decoration: none;
  }

  .page__item-link:hover,
  .page__item-link:focus {
    text-decoration: underline;
  }
</style>
