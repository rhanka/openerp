<script lang="ts">
  import { enhance } from "$app/forms";
  import { Alert, Button, Card, Container, EmptyState, Flex, Input, Row, Select, Stack, Tag } from "@sentropic/design-system-svelte";

  import type { SavedView } from "@sentropic/openerp-domain/reporting";

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

  const RESOURCE_TYPES = [
    "crm.opportunity",
    "crm.company",
    "billing.invoice",
    "project.project"
  ] as const;

  function resourceTypeLabel(rt: SavedView["resourceType"]): string {
    const labels: Record<string, string> = {
      "crm.opportunity": t(locale, "reporting.savedViews.resourceType.crm_opportunity"),
      "crm.company": t(locale, "reporting.savedViews.resourceType.crm_company"),
      "billing.invoice": t(locale, "reporting.savedViews.resourceType.billing_invoice"),
      "project.project": t(locale, "reporting.savedViews.resourceType.project_project")
    };
    return labels[rt] ?? rt;
  }
</script>

<Container size="xl" as="section">
<Stack gap={6}>
  <Row justify="between" align="start">
    <div>
      <h1>{t(locale, "reporting.savedViews.page.title")}</h1>
      <p class="page__lede">
        {t(locale, "reporting.savedViews.page.lede")}
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
        <legend>{t(locale, "reporting.savedViews.form.legend")}</legend>
        <Input
          label={t(locale, "reporting.savedViews.field.name")}
          name="name"
          required
          minlength={1}
        />
        <Select
          label={t(locale, "reporting.savedViews.field.resourceType")}
          name="resourceType"
          required
        >
          <option value="">{t(locale, "reporting.savedViews.field.resourceTypePlaceholder")}</option>
          {#each RESOURCE_TYPES as rt}
            <option value={rt}>{resourceTypeLabel(rt)}</option>
          {/each}
        </Select>
        <div class="page__checkbox-group">
          <label class="page__checkbox-label">
            <input type="checkbox" name="isShared" class="page__checkbox" />
            {t(locale, "reporting.savedViews.field.isShared")}
          </label>
        </div>
      </fieldset>
      <div class="page__form-actions">
        <Button type="submit" variant="primary" disabled={creating}>
          {creating
            ? t(locale, "reporting.savedViews.action.creating")
            : t(locale, "reporting.savedViews.action.create")}
        </Button>
      </div>
    </form>
  </Card>

  {#if data.savedViews.length === 0}
    <EmptyState
      title={t(locale, "reporting.savedViews.empty.title")}
      message={t(locale, "reporting.savedViews.empty.message")}
    />
  {:else}
    <ul class="page__list" data-testid="reporting-saved-views-list">
      {#each data.savedViews as sv (sv.id)}
        <li class="page__item">
          <Card>
            <header class="page__item-header">
              <div>
                <h2>{sv.name}</h2>
                <p class="page__item-sub">{resourceTypeLabel(sv.resourceType)}</p>
              </div>
              {#if sv.isShared}
                <Tag tone="success">{t(locale, "reporting.savedViews.tag.shared")}</Tag>
              {:else}
                <Tag tone="neutral">{t(locale, "reporting.savedViews.tag.private")}</Tag>
              {/if}
            </header>
            <div class="page__item-actions">
              <form
                method="POST"
                action="?/delete"
                use:enhance
                onsubmit={(e) => { if (!confirm(t(locale, "reporting.savedViews.action.deleteConfirm"))) e.preventDefault(); }}
              >
                <input type="hidden" name="id" value={sv.id} />
                <Button type="submit" variant="secondary" size="sm" data-testid="sv-delete-btn">
                  {t(locale, "reporting.savedViews.action.delete")}
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
