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

  import type { Contact } from "@sentropic/openerp-domain/crm";

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

  function statusLabel(status: Contact["status"]): string {
    return status === "active"
      ? t(locale, "crm.contacts.status.active")
      : t(locale, "crm.contacts.status.inactive");
  }

  function statusTone(status: Contact["status"]): "success" | "neutral" {
    return status === "active" ? "success" : "neutral";
  }
</script>

<section class="page">
  <header class="page__header">
    <div>
      <h1>{t(locale, "crm.contacts.page.title")}</h1>
      <p class="page__lede">
        {t(locale, "crm.contacts.page.lede")}
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
        <legend>{t(locale, "crm.contacts.form.legend")}</legend>
        <Input
          label={t(locale, "crm.contacts.field.displayName")}
          name="displayName"
          required
          minlength={2}
          autocomplete="name"
        />
        <Input
          label={t(locale, "crm.contacts.field.firstName")}
          name="firstName"
          autocomplete="given-name"
        />
        <Input
          label={t(locale, "crm.contacts.field.lastName")}
          name="lastName"
          autocomplete="family-name"
        />
        <Input
          label={t(locale, "crm.contacts.field.title")}
          name="title"
          autocomplete="organization-title"
        />
        <Input
          label={t(locale, "crm.contacts.field.email")}
          name="email"
          inputmode="email"
        />
        <Input
          label={t(locale, "crm.contacts.field.phone")}
          name="phone"
          inputmode="tel"
        />
      </fieldset>
      <div class="page__form-actions">
        <Button type="submit" variant="primary" disabled={creating}>
          {creating
            ? t(locale, "crm.contacts.action.creating")
            : t(locale, "crm.contacts.action.create")}
        </Button>
      </div>
    </form>
  </Card>

  {#if data.contacts.length === 0}
    <EmptyState
      title={t(locale, "crm.contacts.empty.title")}
      message={t(locale, "crm.contacts.empty.message")}
    />
  {:else}
    <ul class="page__list" data-testid="crm-contacts-list">
      {#each data.contacts as contact (contact.id)}
        <li class="page__item" data-status={contact.status}>
          <Card>
            <header class="page__item-header">
              <div>
                <h2>
                  <a class="page__item-link" href="/admin/crm/contacts/{contact.id}">{contact.displayName}</a>
                </h2>
                {#if contact.title}
                  <p class="page__item-sub">{contact.title}</p>
                {/if}
              </div>
              <Tag tone={statusTone(contact.status)}>{statusLabel(contact.status)}</Tag>
            </header>
            <dl class="page__item-grid">
              {#if contact.email}
                <div>
                  <dt>{t(locale, "crm.contacts.field.email")}</dt>
                  <dd>{contact.email}</dd>
                </div>
              {/if}
              {#if contact.phone}
                <div>
                  <dt>{t(locale, "crm.contacts.field.phone")}</dt>
                  <dd>{contact.phone}</dd>
                </div>
              {/if}
            </dl>
            <form
              method="POST"
              action={contact.status === "active" ? "?/deactivate" : "?/reactivate"}
              use:enhance
              class="page__item-actions"
            >
              <input type="hidden" name="id" value={contact.id} />
              <Button type="submit" variant="secondary" size="sm">
                {contact.status === "active"
                  ? t(locale, "crm.contacts.action.deactivate")
                  : t(locale, "crm.contacts.action.reactivate")}
              </Button>
            </form>
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
    justify-content: flex-end;
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
