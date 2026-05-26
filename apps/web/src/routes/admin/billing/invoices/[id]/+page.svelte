<script lang="ts">
  import {
    Button,
    Card,
    EmptyState,
    Tag
  } from "@sentropic/design-system-svelte";

  import type { InvoiceWithLines } from "@sentropic/openerp-domain/billing";

  import { t, type LocaleCode } from "$lib/i18n";

  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();

  const locale: LocaleCode = $derived(data.locale);
  const invoice: InvoiceWithLines = $derived(data.invoice);

  function statusLabel(status: InvoiceWithLines["status"]): string {
    return t(locale, `billing.invoices.status.${status}`);
  }

  function statusTone(status: InvoiceWithLines["status"]): "success" | "warning" | "neutral" {
    if (status === "paid" || status === "issued") return "success";
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
      <Button variant="ghost" size="sm" onclick={() => history.back()}>
        {t(locale, "billing.invoices.detail.action.back")}
      </Button>
      <h1>{invoice.invoiceNumber}</h1>
      <p class="page__meta">
        {t(locale, "billing.invoices.field.status")}:
        <Tag tone={statusTone(invoice.status)}>{statusLabel(invoice.status)}</Tag>
      </p>
      <p class="page__meta">
        {t(locale, "billing.invoices.field.total")}:
        <strong>{formatMoney(invoice.total.amountMinor, invoice.total.scale, invoice.total.currency)}</strong>
      </p>
      {#if invoice.issueDate}
        <p class="page__meta">
          {t(locale, "billing.invoices.field.issueDate")}: {invoice.issueDate}
        </p>
      {/if}
      {#if invoice.dueDate}
        <p class="page__meta">
          {t(locale, "billing.invoices.field.dueDate")}: {invoice.dueDate}
        </p>
      {/if}
      {#if invoice.invoiceProposalId}
        <p class="page__meta">
          {t(locale, "billing.invoices.field.proposalId")}: <code>{invoice.invoiceProposalId}</code>
        </p>
      {/if}
    </div>
  </header>

  <Card>
    <h2>{t(locale, "billing.invoices.detail.lines.title")}</h2>
    {#if invoice.lines.length === 0}
      <EmptyState
        title={t(locale, "billing.invoices.detail.empty.title")}
        message={t(locale, "billing.invoices.detail.empty.message")}
      />
    {:else}
      <table class="page__lines" data-testid="invoice-lines-table">
        <thead>
          <tr>
            <th>{t(locale, "billing.invoices.lines.field.description")}</th>
            <th class="page__col-num">{t(locale, "billing.invoices.lines.field.quantity")}</th>
            <th class="page__col-num">{t(locale, "billing.invoices.lines.field.unitPrice")}</th>
            <th class="page__col-num">{t(locale, "billing.invoices.lines.field.amount")}</th>
          </tr>
        </thead>
        <tbody>
          {#each invoice.lines as line (line.id)}
            <tr>
              <td>{line.description ?? "—"}</td>
              <td class="page__col-num">{line.quantity}</td>
              <td class="page__col-num">{formatMoney(line.unitPrice.amountMinor, line.unitPrice.scale, line.unitPrice.currency)}</td>
              <td class="page__col-num">{formatMoney(line.amount.amountMinor, line.amount.scale, line.amount.currency)}</td>
            </tr>
          {/each}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="3"><strong>{t(locale, "billing.invoices.field.total")}</strong></td>
            <td class="page__col-num">
              <strong>{formatMoney(invoice.total.amountMinor, invoice.total.scale, invoice.total.currency)}</strong>
            </td>
          </tr>
        </tfoot>
      </table>
    {/if}
  </Card>
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
    flex-direction: column;
    gap: var(--sent-space-sm);
  }

  .page__meta {
    margin: var(--sent-space-2xs) 0;
    color: var(--sent-color-text-muted);
    font-size: var(--sent-font-size-sm);
  }

  .page__lines {
    width: 100%;
    border-collapse: collapse;
    font-size: var(--sent-font-size-sm);
  }

  .page__lines th,
  .page__lines td {
    text-align: left;
    padding: var(--sent-space-xs) var(--sent-space-sm);
    border-bottom: 1px solid var(--sent-color-border-subtle);
  }

  .page__col-num {
    text-align: right;
  }

  .page__lines tfoot tr {
    border-top: 2px solid var(--sent-color-border-subtle);
  }
</style>
