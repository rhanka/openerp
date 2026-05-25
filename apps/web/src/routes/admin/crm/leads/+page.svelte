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

  import type { Lead, LeadStatus } from "@sentropic/openerp-domain/crm";

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

  function statusLabel(status: LeadStatus): string {
    return t(locale, `crm.leads.status.${status}`);
  }
  function statusTone(status: LeadStatus): "success" | "warning" | "info" | "neutral" {
    if (status === "converted") return "success";
    if (status === "disqualified") return "warning";
    if (status === "working") return "info";
    return "neutral";
  }
  function formatTimestamp(iso: string): string {
    return new Date(iso).toLocaleString(locale === "fr" ? "fr-CA" : "en-CA");
  }
</script>

<section class="page">
  <header class="page__header">
    <div>
      <h1>{t(locale, "crm.leads.page.title")}</h1>
      <p class="page__lede">
        {t(locale, "crm.leads.page.lede")}
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
        <legend>{t(locale, "crm.leads.form.legend")}</legend>
        <Input label={t(locale, "crm.leads.field.displayName")} name="displayName" required minlength={2} />
        <Input label={t(locale, "crm.leads.field.source")} name="source" />
        <Input label={t(locale, "crm.leads.field.companyName")} name="companyName" autocomplete="organization" />
        <Input label={t(locale, "crm.leads.field.contactName")} name="contactName" autocomplete="name" />
        <Input label={t(locale, "crm.leads.field.email")} name="email" inputmode="email" />
        <Input label={t(locale, "crm.leads.field.phone")} name="phone" inputmode="tel" />
      </fieldset>
      <div class="page__form-actions">
        <Button type="submit" variant="primary" disabled={creating}>
          {creating
            ? t(locale, "crm.leads.action.creating")
            : t(locale, "crm.leads.action.create")}
        </Button>
      </div>
    </form>
  </Card>

  {#if data.leads.length === 0}
    <EmptyState
      title={t(locale, "crm.leads.empty.title")}
      message={t(locale, "crm.leads.empty.message")}
    />
  {:else}
    <ul class="page__list" data-testid="crm-leads-list">
      {#each data.leads as lead (lead.id)}
        <li class="page__item" data-status={lead.status}>
          <Card>
            <header class="page__item-header">
              <div>
                <h2>
                  <a class="page__item-link" href="/admin/crm/leads/{lead.id}">{lead.displayName}</a>
                </h2>
                <p class="page__item-sub">
                  {lead.companyName ?? "—"} · {lead.email ?? lead.phone ?? "—"} · {formatTimestamp(lead.createdAt)}
                </p>
              </div>
              <Tag tone={statusTone(lead.status)}>{statusLabel(lead.status)}</Tag>
            </header>
            {#if lead.status === "new" || lead.status === "working"}
              <div class="page__item-actions">
                <form method="POST" action="?/convert" use:enhance>
                  <input type="hidden" name="id" value={lead.id} />
                  <Button type="submit" variant="primary" size="sm">
                    {t(locale, "crm.leads.action.convert")}
                  </Button>
                </form>
                <form method="POST" action="?/disqualify" use:enhance>
                  <input type="hidden" name="id" value={lead.id} />
                  <Button type="submit" variant="secondary" size="sm">
                    {t(locale, "crm.leads.action.disqualify")}
                  </Button>
                </form>
              </div>
            {/if}
            {#if lead.status === "converted" && lead.convertedOpportunityId}
              <p class="page__item-sub">
                → <a href="/admin/crm/opportunities/{lead.convertedOpportunityId}">
                    /admin/crm/opportunities/{lead.convertedOpportunityId}
                  </a>
              </p>
            {/if}
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
    grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
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
  .page__item-actions {
    display: flex;
    gap: var(--sent-space-sm);
    margin-top: var(--sent-space-md);
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
