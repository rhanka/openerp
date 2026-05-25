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

  import type { Company } from "@sentropic/openerp-domain/crm";

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

  function statusLabel(status: Company["status"]): string {
    return status === "active"
      ? t(locale, "crm.companies.status.active")
      : t(locale, "crm.companies.status.archived");
  }

  function statusTone(status: Company["status"]): "success" | "neutral" {
    return status === "active" ? "success" : "neutral";
  }
</script>

<section class="page">
  <header class="page__header">
    <div>
      <h1>{t(locale, "crm.companies.page.title")}</h1>
      <p class="page__lede">
        {t(locale, "crm.companies.page.lede")}
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
      {form.displayName ?? form.id}
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
        <legend>{t(locale, "crm.companies.form.legend")}</legend>
        <Input
          label={t(locale, "crm.companies.field.displayName")}
          name="displayName"
          required
          minlength={2}
          autocomplete="organization"
        />
        <Input
          label={t(locale, "crm.companies.field.legalName")}
          name="legalName"
          autocomplete="organization"
        />
        <Input
          label={t(locale, "crm.companies.field.website")}
          name="website"
          inputmode="url"
        />
        <Input
          label={t(locale, "crm.companies.field.email")}
          name="email"
          inputmode="email"
        />
        <Input
          label={t(locale, "crm.companies.field.phone")}
          name="phone"
          inputmode="tel"
        />
      </fieldset>
      <div class="page__form-actions">
        <Button type="submit" variant="primary" disabled={creating}>
          {creating
            ? t(locale, "crm.companies.action.creating")
            : t(locale, "crm.companies.action.create")}
        </Button>
      </div>
    </form>
  </Card>

  {#if data.companies.length === 0}
    <EmptyState
      title={t(locale, "crm.companies.empty.title")}
      message={t(locale, "crm.companies.empty.message")}
    />
  {:else}
    <ul class="page__list" data-testid="crm-companies-list">
      {#each data.companies as company (company.id)}
        <li class="page__item" data-status={company.status}>
          <Card>
            <header class="page__item-header">
              <div>
                <h2>
                  <a class="page__item-link" href="/admin/crm/companies/{company.id}">{company.displayName}</a>
                </h2>
                {#if company.legalName}
                  <p class="page__item-sub">{company.legalName}</p>
                {/if}
              </div>
              <Tag tone={statusTone(company.status)}>{statusLabel(company.status)}</Tag>
            </header>
            <dl class="page__item-grid">
              {#if company.website}
                <div>
                  <dt>{t(locale, "crm.companies.field.website")}</dt>
                  <dd>{company.website}</dd>
                </div>
              {/if}
              {#if company.email}
                <div>
                  <dt>{t(locale, "crm.companies.field.email")}</dt>
                  <dd>{company.email}</dd>
                </div>
              {/if}
              {#if company.phone}
                <div>
                  <dt>{t(locale, "crm.companies.field.phone")}</dt>
                  <dd>{company.phone}</dd>
                </div>
              {/if}
            </dl>
            <div class="page__item-actions">
              <form
                method="POST"
                action={company.status === "active" ? "?/archive" : "?/reactivate"}
                use:enhance
              >
                <input type="hidden" name="id" value={company.id} />
                <Button type="submit" variant="secondary" size="sm">
                  {company.status === "active"
                    ? t(locale, "crm.companies.action.archive")
                    : t(locale, "crm.companies.action.reactivate")}
                </Button>
              </form>
              <form
                method="POST"
                action="?/delete"
                use:enhance
                onsubmit={(e) => { if (!confirm(t(locale, "crm.companies.action.deleteConfirm"))) e.preventDefault(); }}
              >
                <input type="hidden" name="id" value={company.id} />
                <Button type="submit" variant="secondary" size="sm" data-testid="crm-delete-btn">
                  {t(locale, "crm.companies.action.delete")}
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
  }

  .page__form {
    display: flex;
    flex-direction: column;
    gap: var(--sent-space-md);
  }

  .page__fieldset {
    border: none;
    padding: 0;
    margin: 0;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: var(--sent-space-md);
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
    gap: var(--sent-space-md);
  }

  .page__item-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: var(--sent-space-sm);
  }

  .page__item-sub {
    margin: var(--sent-space-2xs) 0 0 0;
    color: var(--sent-color-text-muted);
    font-size: var(--sent-font-size-sm);
  }

  .page__item-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: var(--sent-space-sm);
    margin: var(--sent-space-md) 0;
  }

  .page__item-grid dt {
    color: var(--sent-color-text-muted);
    font-size: var(--sent-font-size-xs);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .page__item-grid dd {
    margin: 0;
  }

  .page__item-actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: var(--sent-space-xs);
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
