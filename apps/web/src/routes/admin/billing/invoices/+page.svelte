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

  import type { Invoice } from "@sentropic/openerp-domain/billing";

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

  let converting = $state(false);

  function statusLabel(status: Invoice["status"]): string {
    return t(locale, `billing.invoices.status.${status}`);
  }

  function statusTone(status: Invoice["status"]): "success" | "warning" | "neutral" {
    if (status === "paid") return "success";
    if (status === "issued") return "success";
    if (status === "void" || status === "written_off") return "warning";
    return "neutral";
  }

  function formatMoney(minor: number, scale: number, currency: string): string {
    const amount = minor / Math.pow(10, scale);
    return `${amount.toFixed(scale)} ${currency}`;
  }
</script>

<section class="page">
  <header class="page__header">
    <div>
      <h1>{t(locale, "billing.invoices.page.title")}</h1>
      <p class="page__lede">
        {t(locale, "billing.invoices.page.lede")}
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
      {"invoiceNumber" in form ? form.invoiceNumber : ("id" in form ? form.id : "")}
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
      action="?/fromProposal"
      use:enhance={() => {
        converting = true;
        return async ({ update }) => {
          await update();
          converting = false;
        };
      }}
    >
      <fieldset class="page__fieldset">
        <legend>{t(locale, "billing.invoices.fromProposal.legend")}</legend>
        <Input
          label={t(locale, "billing.invoices.fromProposal.proposalId.label")}
          name="invoiceProposalId"
          required
        />
      </fieldset>
      <div class="page__form-actions">
        <Button type="submit" variant="primary" disabled={converting}>
          {converting
            ? t(locale, "billing.invoices.action.converting")
            : t(locale, "billing.invoices.action.fromProposal")}
        </Button>
      </div>
    </form>
  </Card>

  {#if data.invoices.length === 0}
    <EmptyState
      title={t(locale, "billing.invoices.empty.title")}
      message={t(locale, "billing.invoices.empty.message")}
    />
  {:else}
    <ul class="page__list" data-testid="billing-invoices-list">
      {#each data.invoices as invoice (invoice.id)}
        <li class="page__item" data-status={invoice.status}>
          <Card>
            <header class="page__item-header">
              <div>
                <h2>
                  <a class="page__item-link" href="/admin/billing/invoices/{invoice.id}">{invoice.invoiceNumber}</a>
                </h2>
                <p class="page__item-sub">{formatMoney(invoice.total.amountMinor, invoice.total.scale, invoice.total.currency)}</p>
              </div>
              <Tag tone={statusTone(invoice.status)}>{statusLabel(invoice.status)}</Tag>
            </header>
            <div class="page__item-actions">
              {#if invoice.status === "draft"}
                <form method="POST" action="?/issue" use:enhance>
                  <input type="hidden" name="id" value={invoice.id} />
                  <Button type="submit" variant="secondary" size="sm">
                    {t(locale, "billing.invoices.action.issue")}
                  </Button>
                </form>
                <form method="POST" action="?/void" use:enhance>
                  <input type="hidden" name="id" value={invoice.id} />
                  <Button type="submit" variant="secondary" size="sm">
                    {t(locale, "billing.invoices.action.void")}
                  </Button>
                </form>
                <form
                  method="POST"
                  action="?/delete"
                  use:enhance
                  onsubmit={(e) => { if (!confirm(t(locale, "billing.invoices.action.deleteConfirm"))) e.preventDefault(); }}
                >
                  <input type="hidden" name="id" value={invoice.id} />
                  <Button type="submit" variant="secondary" size="sm" data-testid="invoice-delete-btn">
                    {t(locale, "billing.invoices.action.delete")}
                  </Button>
                </form>
              {:else if invoice.status === "issued"}
                <form method="POST" action="?/pay" use:enhance>
                  <input type="hidden" name="id" value={invoice.id} />
                  <Button type="submit" variant="secondary" size="sm">
                    {t(locale, "billing.invoices.action.pay")}
                  </Button>
                </form>
                <form method="POST" action="?/void" use:enhance>
                  <input type="hidden" name="id" value={invoice.id} />
                  <Button type="submit" variant="secondary" size="sm">
                    {t(locale, "billing.invoices.action.void")}
                  </Button>
                </form>
              {/if}
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
