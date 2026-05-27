<script lang="ts">
  import { enhance } from "$app/forms";
  import {
    Alert,
    Button,
    Card,
    EmptyState,
    Tag
  } from "@sentropic/design-system-svelte";

  import type { InvoiceWithLines, JournalEntryWithLines, Payment } from "@sentropic/openerp-domain/billing";

  import { t, type LocaleCode } from "$lib/i18n";
  import StatusStepper, { type StepperStep } from "$lib/components/StatusStepper.svelte";

  import type { PageData, ActionData } from "./$types";

  let { data, form }: { data: PageData; form: ActionData } = $props();

  const locale: LocaleCode = $derived(data.locale);
  const invoice: InvoiceWithLines = $derived(data.invoice);
  const payments: Payment[] = $derived(data.payments ?? []);
  const journalEntry: JournalEntryWithLines | null = $derived(data.journalEntry ?? null);
  const sourceTone: "success" | "warning" | "neutral" = $derived(
    (data.source as string) === "api" ? "success" : (data.source as string) === "error" ? "warning" : "neutral"
  );
  const sourceLabel: string = $derived(
    (data.source as string) === "api"
      ? t(locale, "approval.source.api")
      : (data.source as string) === "error"
        ? t(locale, "approval.source.error")
        : t(locale, "approval.source.demo")
  );

  let computingTaxes = $state(false);
  let postingToJournal = $state(false);

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

  const totalPaid = $derived(
    payments.reduce((acc, p) => acc + p.amount.amountMinor, 0)
  );
  const balanceDue = $derived(
    Math.max(0, invoice.total.amountMinor - totalPaid)
  );

  // Invoice lifecycle stepper: Draft → Issued → [Partially paid →] Paid
  // void / written_off are terminal off-path states shown as a badge.
  const invoiceStepperSteps: StepperStep[] = $derived.by(() => {
    const status = invoice.status;
    const isTerminal = status === "void" || status === "written_off";

    // Base sequence depends on whether partially_paid is relevant
    const hasPartial = status === "partially_paid";
    const keys: Array<"draft" | "issued" | "partially_paid" | "paid"> = hasPartial
      ? ["draft", "issued", "partially_paid", "paid"]
      : ["draft", "issued", "paid"];

    return keys.map((key) => {
      let stepState: StepperStep["state"];
      if (isTerminal) {
        // treat all steps as done (the terminal badge covers the end state)
        stepState = "done";
      } else if (key === status) {
        stepState = "current";
      } else {
        const order: Record<string, number> = {
          draft: 0,
          issued: 1,
          partially_paid: 2,
          paid: hasPartial ? 3 : 2
        };
        stepState = order[key] < order[status] ? "done" : "upcoming";
      }
      return {
        key,
        label: t(locale, `billing.invoices.step.${key}`),
        state: stepState
      };
    });
  });

  const invoiceTerminalLabel: string | null = $derived(
    invoice.status === "void"
      ? t(locale, "billing.invoices.status.void")
      : invoice.status === "written_off"
        ? t(locale, "billing.invoices.status.written_off")
        : null
  );
</script>

<section class="page">
  <header class="page__header">
    <div>
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
      {#if journalEntry}
        <p class="page__meta" data-testid="journal-entry-ref">
          {t(locale, "billing.journal.posted.reference")}:
          <code>{journalEntry.reference ?? journalEntry.id}</code>
          <Tag tone="success">{t(locale, "billing.journal.status.posted")}</Tag>
        </p>
      {/if}
    </div>
    <div class="page__actions">
      <span data-source={data.source} data-testid="data-source-badge">
        <Tag tone={sourceTone}>{sourceLabel}</Tag>
      </span>
      <a class="page__back" href="/admin/billing/invoices">
        ← {t(locale, "billing.invoices.detail.action.back")}
      </a>
      {#if invoice.status === "issued" && !journalEntry}
        <form
          method="POST"
          action="?/postToJournal"
          use:enhance={() => {
            postingToJournal = true;
            return async ({ update }) => {
              await update({ reset: false });
              postingToJournal = false;
            };
          }}
        >
          <Button type="submit" variant="secondary" size="sm" disabled={postingToJournal} data-testid="post-to-journal-btn">
            {postingToJournal
              ? t(locale, "billing.journal.action.posting")
              : t(locale, "billing.journal.action.postToJournal")}
          </Button>
        </form>
      {/if}
    </div>
  </header>

  {#if form && "ok" in form && form.ok}
    <Alert tone="success" title={t(locale, "approval.success.title")}>
      {"action" in form ? String(form.action) : ""}
    </Alert>
  {/if}

  {#if form && "code" in form && !("ok" in form)}
    <Alert tone="warning" title={t(locale, "approval.actionError.title")}>
      {form.code}
    </Alert>
  {/if}

  <StatusStepper
    steps={invoiceStepperSteps}
    terminalLabel={invoiceTerminalLabel}
    terminalTone="warning"
    testId="invoice-lifecycle-stepper"
  />

  <!-- Tax breakdown card -->
  <Card>
    <div class="page__taxes-header">
      <h2>{t(locale, "billing.invoices.taxes.title")}</h2>
      {#if invoice.taxCategoryId}
        <form
          method="POST"
          action="?/computeTaxes"
          use:enhance={() => {
            computingTaxes = true;
            return async ({ update }) => {
              await update({ reset: false });
              computingTaxes = false;
            };
          }}
        >
          <Button type="submit" variant="secondary" size="sm" disabled={computingTaxes} data-testid="compute-taxes-btn">
            {computingTaxes
              ? t(locale, "billing.invoices.action.computingTaxes")
              : t(locale, "billing.invoices.action.computeTaxes")}
          </Button>
        </form>
      {/if}
    </div>

    {#if invoice.taxBreakdown && invoice.taxBreakdown.length > 0}
      <table class="page__lines" data-testid="tax-breakdown-table">
        <thead>
          <tr>
            <th>{t(locale, "billing.invoices.taxes.jurisdiction")}</th>
            <th>{t(locale, "billing.invoices.taxes.label")}</th>
            <th class="page__col-num">{t(locale, "billing.invoices.taxes.amount")}</th>
          </tr>
        </thead>
        <tbody>
          {#each invoice.taxBreakdown as line}
            <tr>
              <td>{line.jurisdiction}</td>
              <td>{line.label}</td>
              <td class="page__col-num">{formatMoney(line.amount.amountMinor, line.amount.scale, line.amount.currency)}</td>
            </tr>
          {/each}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="2"><strong>{t(locale, "billing.invoices.taxes.total")}</strong></td>
            <td class="page__col-num" data-testid="tax-total">
              <strong>{formatMoney(invoice.taxTotal.amountMinor, invoice.taxTotal.scale, invoice.taxTotal.currency)}</strong>
            </td>
          </tr>
        </tfoot>
      </table>
    {:else}
      <p class="page__taxes-empty" data-testid="tax-breakdown-empty">{t(locale, "billing.invoices.taxes.empty")}</p>
    {/if}
  </Card>

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

  <Card>
    <h2 data-testid="payments-section-title">{t(locale, "billing.payments.section.title")}</h2>

    {#if payments.length === 0}
      <EmptyState
        title={t(locale, "billing.payments.empty.title")}
        message={t(locale, "billing.payments.empty.message")}
      />
    {:else}
      <table class="page__lines" data-testid="payments-table">
        <thead>
          <tr>
            <th>{t(locale, "billing.payments.field.paymentDate")}</th>
            <th>{t(locale, "billing.payments.field.method")}</th>
            <th>{t(locale, "billing.payments.field.reference")}</th>
            <th class="page__col-num">{t(locale, "billing.payments.field.amount")}</th>
          </tr>
        </thead>
        <tbody>
          {#each payments as payment (payment.id)}
            <tr>
              <td>{payment.paymentDate}</td>
              <td>{t(locale, `billing.payments.method.${payment.method}`)}</td>
              <td>{payment.reference ?? "—"}</td>
              <td class="page__col-num">{formatMoney(payment.amount.amountMinor, payment.amount.scale, payment.amount.currency)}</td>
            </tr>
          {/each}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="3"><strong>{t(locale, "billing.payments.balanceDue")}</strong></td>
            <td class="page__col-num" data-testid="balance-due">
              <strong>{formatMoney(balanceDue, invoice.total.scale, invoice.total.currency)}</strong>
            </td>
          </tr>
        </tfoot>
      </table>
    {/if}
  </Card>
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

  .page__actions {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex-shrink: 0;
  }

  .page__back {
    color: var(--st-semantic-text-muted);
    font-size: 0.875rem;
    text-decoration: none;
  }

  .page__back:hover,
  .page__back:focus {
    text-decoration: underline;
  }

  .page__meta {
    margin: 0.25rem 0;
    color: var(--st-semantic-text-muted);
    font-size: 0.875rem;
  }

  .page__lines {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.875rem;
  }

  .page__lines th,
  .page__lines td {
    text-align: left;
    padding: 0.5rem 0.75rem;
    border-bottom: 1px solid var(--st-semantic-border-subtle);
  }

  .page__col-num {
    text-align: right;
  }

  .page__lines tfoot tr {
    border-top: 2px solid var(--st-semantic-border-subtle);
  }

  .page__taxes-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 1rem;
  }

  .page__taxes-header h2 {
    margin: 0;
  }

  .page__taxes-empty {
    margin: 0;
    color: var(--st-semantic-text-muted);
    font-size: 0.875rem;
  }
</style>
