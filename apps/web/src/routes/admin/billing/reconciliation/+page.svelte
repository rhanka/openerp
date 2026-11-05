<script lang="ts">
  import { enhance } from "$app/forms";
  import { invalidateAll } from "$app/navigation";
  import { tick } from "svelte";
  import {
    Alert,
    Button,
    Card,
    Container,
    EmptyState,
    Flex,
    Link,
    Modal,
    Row,
    Stack,
    Tag
  } from "@sentropic/design-system-svelte";

  import { t, type LocaleCode } from "$lib/i18n";

  import type { ActionData, PageData, SubmitFunction } from "./$types";

  let { data, form }: { data: PageData; form: ActionData } = $props();

  type ModalAction = "ignore" | "reject";
  type PendingModal = {
    action: ModalAction;
    id: string;
    transactionId: string;
  };

  const locale: LocaleCode = $derived(data.locale);
  const sourceTone: "success" | "warning" | "neutral" = $derived(
    data.source === "api" ? "success" : data.source === "error" ? "warning" : "neutral"
  );
  const sourceLabel: string = $derived(
    data.source === "api"
      ? t(locale, "banking.source.api")
      : data.source === "error"
        ? t(locale, "banking.source.error")
        : t(locale, "banking.source.demo")
  );
  const proposalsByTransaction = $derived(
    new Map(data.suggestions.map((suggestion) => [suggestion.link.bankTransactionId, suggestion]))
  );
  const refreshedWithoutProposal = $derived(
    data.status === "unmatched"
      && data.transactions.length > 0
      && data.suggestions.length === 0
      && !!form
      && "ok" in form
      && form.ok
      && form.action === "refresh"
  );

  let expandedTransactionId = $state<string | null>(null);
  let pendingModal = $state<PendingModal | null>(null);
  let busyKey = $state<string | null>(null);
  let pageHeading: HTMLHeadingElement | undefined = $state();

  function replaceToken(template: string, token: string, value: string): string {
    return template.replace(`{${token}}`, value);
  }

  function formatDate(value: string): string {
    return new Intl.DateTimeFormat(locale === "fr" ? "fr-CA" : "en-CA", {
      dateStyle: "medium",
      timeZone: "UTC"
    }).format(new Date(value));
  }

  function formatAmount(amount: { amountMinor: number; currency: string; scale: number }): string {
    const divisor = 10 ** amount.scale;
    const formatted = new Intl.NumberFormat(locale === "fr" ? "fr-CA" : "en-CA", {
      minimumFractionDigits: amount.scale,
      maximumFractionDigits: amount.scale,
      signDisplay: "always"
    }).format(amount.amountMinor / divisor);
    return `${formatted} ${amount.currency}`;
  }

  function statusTone(status: string): "success" | "warning" | "neutral" {
    if (status === "matched" || status === "confirmed") return "success";
    if (status === "rejected") return "warning";
    return "neutral";
  }

  function statusLabel(status: string): string {
    return t(locale, `banking.status.${status}`);
  }

  function statusHref(status: "unmatched" | "matched" | "ignored"): string {
    return `/admin/billing/reconciliation?status=${status}`;
  }

  function offsetHref(offset: number): string {
    return `/admin/billing/reconciliation?status=${data.status}&offset=${offset}`;
  }

  function evidenceItems(reasons: string[]): string[] {
    const evidence: string[] = [];
    if (reasons.includes("amount+currency exact")) {
      evidence.push(t(locale, "banking.evidence.amountExact"));
    }
    const dateReason = reasons.find((reason) => /^date within \d+d$/.test(reason));
    if (reasons.includes("same date")) {
      evidence.push(t(locale, "banking.evidence.sameDate"));
    } else if (dateReason) {
      const days = dateReason.match(/\d+/)?.[0] ?? "";
      evidence.push(replaceToken(t(locale, "banking.evidence.dateGap"), "days", days));
    } else {
      evidence.push(t(locale, "banking.evidence.noDate"));
    }
    evidence.push(
      reasons.includes("reference/description overlap")
        ? t(locale, "banking.evidence.referenceMatch")
        : t(locale, "banking.evidence.referenceNoMatch")
    );
    return evidence;
  }

  function isBusy(action: string, id: string): boolean {
    return busyKey === `${action}:${id}`;
  }

  async function restoreFocus(transactionId: string): Promise<void> {
    await tick();
    const retainedTarget = document.querySelector<HTMLElement>(
      `[data-worklist-row="${CSS.escape(transactionId)}"] [data-row-focus]`
    );
    const nextTarget = document.querySelector<HTMLElement>("[data-worklist-row] [data-row-focus]");
    (retainedTarget ?? nextTarget ?? pageHeading)?.focus();
  }

  const enhanceReconciliation: SubmitFunction = ({ formData, submitter }) => {
    const mutationForm = submitter?.closest("form");
    const action = mutationForm?.dataset.action ?? "refresh";
    const id = mutationForm?.dataset.id ?? "page";
    const transactionId = String(formData.get("transactionId") ?? "");
    busyKey = `${action}:${id}`;

    return async ({ result, update }) => {
      await update();
      busyKey = null;
      if (result.type === "success") {
        pendingModal = null;
        await invalidateAll();
        if (transactionId) await restoreFocus(transactionId);
        else await tick();
      }
    };
  };

  function actionErrorKey(code: unknown): string {
    const normalized = String(code);
    if (["INVALID_JSON", "INVALID_INPUT", "NOT_FOUND", "CONFLICT", "DEMO_MODE_NO_API"].includes(normalized)) {
      return `banking.error.${normalized}`;
    }
    return "banking.error.API_ERROR";
  }

  function successKey(action: unknown): string {
    const normalized = String(action);
    if (["refresh", "confirm", "reject", "ignore", "unignore", "unmatch"].includes(normalized)) {
      return `banking.success.${normalized}`;
    }
    return "banking.success.refresh";
  }

  function modalTitle(): string {
    return pendingModal?.action === "reject"
      ? t(locale, "banking.reject.title")
      : t(locale, "banking.ignore.title");
  }

  function modalDescription(): string {
    return pendingModal?.action === "reject"
      ? t(locale, "banking.reject.description")
      : t(locale, "banking.ignore.description");
  }

  async function reloadWorklist(): Promise<void> {
    await invalidateAll();
  }
</script>

<Container size="xl" as="section">
  <Stack gap={6}>
    <Row justify="between" align="start" wrap={true}>
      <div>
        <h1 bind:this={pageHeading} tabindex="-1">{t(locale, "banking.page.title")}</h1>
        <p class="page__lede">{t(locale, "banking.page.lede")}</p>
      </div>
      <Flex gap={2} align="center" wrap={true}>
        <span data-source={data.source} data-testid="data-source-badge">
          <Tag tone={sourceTone}>{sourceLabel}</Tag>
        </span>
        <form method="POST" action="?/refresh" data-action="refresh" data-id="page" use:enhance={enhanceReconciliation}>
          <Button type="submit" variant="secondary" disabled={isBusy("refresh", "page")} data-testid="reconciliation-refresh">
            {isBusy("refresh", "page")
              ? t(locale, "banking.action.recalculating")
              : t(locale, "banking.action.refresh")}
          </Button>
        </form>
      </Flex>
    </Row>

    <nav class="reconciliation__views" aria-label={t(locale, "banking.page.title")}>
      {#each ["unmatched", "matched", "ignored"] as status}
        {@const typedStatus = status as "unmatched" | "matched" | "ignored"}
        <span class:reconciliation__view--active={data.status === typedStatus}>
          <Link
            href={statusHref(typedStatus)}
            variant="standalone"
            aria-current={data.status === typedStatus ? "page" : undefined}
          >
            {t(locale, `banking.views.${typedStatus}`)}
          </Link>
        </span>
      {/each}
    </nav>

    {#if data.source === "error"}
      <Alert tone="warning" title={t(locale, "banking.source.error")}>
        {t(locale, "banking.error.API_ERROR.message")}
      </Alert>
    {/if}

    {#if form && "code" in form}
      {@const errorKey = actionErrorKey(form.code)}
      {#snippet conflictActions()}
        <Button type="button" variant="secondary" onclick={reloadWorklist}>
          {t(locale, "banking.action.reload")}
        </Button>
      {/snippet}
      <Alert
        tone={form.code === "CONFLICT" ? "warning" : "error"}
        title={t(locale, `${errorKey}.title`)}
        actions={form.code === "CONFLICT" ? conflictActions : undefined}
        data-testid="reconciliation-action-error"
      >
        {t(locale, `${errorKey}.message`)}
      </Alert>
    {/if}

    {#if form && "ok" in form && form.ok}
      {@const key = successKey(form.action)}
      <Alert tone="success" title={t(locale, `${key}.title`)} data-testid="reconciliation-action-success">
        {t(locale, `${key}.message`)}
      </Alert>
    {/if}

    {#if data.source !== "error" && data.transactions.length === 0}
      {#if !data.hasAnyTransactions}
        <EmptyState title={t(locale, "banking.empty.noImports.title")} message={t(locale, "banking.empty.noImports.message")} />
      {:else if data.status === "unmatched" && data.hasHandledTransactions}
        <EmptyState
          title={t(locale, "banking.empty.everythingHandled.title")}
          message={t(locale, "banking.empty.everythingHandled.message")}
        />
      {:else}
        <EmptyState title={t(locale, "banking.empty.view.title")} message={t(locale, "banking.empty.view.message")} />
      {/if}
    {:else if data.transactions.length > 0}
      {#if data.status === "unmatched" && data.suggestions.length === 0}
        <EmptyState
          title={t(locale, refreshedWithoutProposal ? "banking.empty.noProposalAfterRefresh.title" : "banking.empty.noProposalYet.title")}
          message={t(locale, refreshedWithoutProposal ? "banking.empty.noProposalAfterRefresh.message" : "banking.empty.noProposalYet.message")}
        />
      {/if}
      <ul class="reconciliation__list" data-testid="reconciliation-worklist">
        {#each data.transactions as transaction (transaction.id)}
          {@const proposal = proposalsByTransaction.get(transaction.id)}
          {@const isExpanded = expandedTransactionId === transaction.id}
          <li class="reconciliation__item" data-worklist-row={transaction.id}>
            <Card>
              <div class="reconciliation__row">
                <div class="reconciliation__line">
                  <time datetime={transaction.postedAt}>{formatDate(transaction.postedAt)}</time>
                  <p class="reconciliation__description">{transaction.rawDescription}</p>
                </div>
                <div class="reconciliation__summary">
                  <strong class="reconciliation__amount">{formatAmount(transaction.amount)}</strong>
                  <Tag tone={statusTone(transaction.reconciliationStatus)}>{statusLabel(transaction.reconciliationStatus)}</Tag>
                  {#if proposal}
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      aria-expanded={isExpanded}
                      aria-controls={`proposal-${transaction.id}`}
                      aria-label={replaceToken(
                        t(locale, isExpanded ? "banking.aria.collapse" : "banking.aria.expand"),
                        "description",
                        transaction.rawDescription
                      )}
                      data-row-focus
                      onclick={() => (expandedTransactionId = isExpanded ? null : transaction.id)}
                    >
                      {t(locale, isExpanded ? "banking.action.close" : "banking.action.open")}
                    </Button>
                  {:else if data.status === "unmatched"}
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      data-row-focus
                      onclick={() => (pendingModal = { action: "ignore", id: transaction.id, transactionId: transaction.id })}
                    >
                      {t(locale, "banking.action.ignore")}
                    </Button>
                  {:else if data.status === "ignored"}
                    <form method="POST" action="?/unignore" data-action="unignore" data-id={transaction.id} use:enhance={enhanceReconciliation}>
                      <input type="hidden" name="transactionId" value={transaction.id} />
                      <Button type="submit" variant="secondary" size="sm" disabled={isBusy("unignore", transaction.id)} data-row-focus>
                        {t(locale, "banking.action.unignore")}
                      </Button>
                    </form>
                  {/if}
                </div>
              </div>

              {#if proposal && isExpanded}
                <section
                  class="reconciliation__proposal"
                  id={`proposal-${transaction.id}`}
                  aria-label={replaceToken(t(locale, "banking.aria.proposalGroup"), "description", transaction.rawDescription)}
                >
                  <div class="reconciliation__proposal-heading">
                    <h2>{t(locale, "banking.proposal.stored")}</h2>
                    <Tag tone={statusTone(proposal.link.status)}>{statusLabel(proposal.link.status)}</Tag>
                  </div>
                  <div class="reconciliation__comparison">
                    <section class="reconciliation__comparison-card" aria-labelledby={`bank-line-${transaction.id}`}>
                      <h3 id={`bank-line-${transaction.id}`}>{t(locale, "banking.proposal.bankLine")}</h3>
                      <dl>
                        <div><dt>{t(locale, "banking.field.date")}</dt><dd>{formatDate(transaction.postedAt)}</dd></div>
                        <div><dt>{t(locale, "banking.field.description")}</dt><dd>{transaction.rawDescription}</dd></div>
                        <div><dt>{t(locale, "banking.field.amount")}</dt><dd>{formatAmount(transaction.amount)}</dd></div>
                      </dl>
                    </section>
                    <section class="reconciliation__comparison-card" aria-labelledby={`payment-${transaction.id}`}>
                      <h3 id={`payment-${transaction.id}`}>{t(locale, "banking.proposal.payment")}</h3>
                      <dl>
                        <div><dt>{t(locale, "banking.field.date")}</dt><dd>{formatDate(proposal.payment.paymentDate)}</dd></div>
                        <div><dt>{t(locale, "banking.field.reference")}</dt><dd>{proposal.payment.reference ?? t(locale, "banking.field.referenceNone")}</dd></div>
                        <div><dt>{t(locale, "banking.field.amount")}</dt><dd>{formatAmount(proposal.payment.amount)}</dd></div>
                      </dl>
                    </section>
                  </div>
                  <section class="reconciliation__evidence" aria-labelledby={`evidence-${transaction.id}`}>
                    <h3 id={`evidence-${transaction.id}`}>{t(locale, "banking.proposal.evidence")}</h3>
                    <ul>
                      {#each evidenceItems(proposal.link.reasons) as evidence}
                        <li>{evidence}</li>
                      {/each}
                    </ul>
                  </section>
                  {#if data.status === "unmatched"}
                    <div class="reconciliation__decision">
                      <p>{t(locale, "banking.attestation")}</p>
                      <Flex gap={2} wrap={true}>
                        <form method="POST" action="?/confirm" data-action="confirm" data-id={proposal.link.id} use:enhance={enhanceReconciliation}>
                          <input type="hidden" name="linkId" value={proposal.link.id} />
                          <input type="hidden" name="transactionId" value={transaction.id} />
                          <Button type="submit" variant="primary" disabled={isBusy("confirm", proposal.link.id)}>
                            {t(locale, "banking.action.confirm")}
                          </Button>
                        </form>
                        <Button
                          type="button"
                          variant="secondary"
                          onclick={() => (pendingModal = { action: "reject", id: proposal.link.id, transactionId: transaction.id })}
                        >
                          {t(locale, "banking.action.reject")}
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          onclick={() => (pendingModal = { action: "ignore", id: transaction.id, transactionId: transaction.id })}
                        >
                          {t(locale, "banking.action.ignore")}
                        </Button>
                      </Flex>
                    </div>
                  {:else if data.status === "matched"}
                    <form method="POST" action="?/unmatch" data-action="unmatch" data-id={proposal.link.id} use:enhance={enhanceReconciliation}>
                      <input type="hidden" name="linkId" value={proposal.link.id} />
                      <input type="hidden" name="transactionId" value={transaction.id} />
                      <Button type="submit" variant="secondary" disabled={isBusy("unmatch", proposal.link.id)}>
                        {isBusy("unmatch", proposal.link.id)
                          ? t(locale, "banking.action.unmatching")
                          : t(locale, "banking.action.unmatch")}
                      </Button>
                    </form>
                  {/if}
                </section>
              {/if}
            </Card>
          </li>
        {/each}
      </ul>

      {#if data.offset > 0 || data.transactions.length === data.limit}
        <nav class="reconciliation__pagination" aria-label={t(locale, "banking.page.title")}>
          {#if data.offset > 0}
            <Link href={offsetHref(Math.max(0, data.offset - data.limit))} variant="standalone">{t(locale, "banking.action.previous")}</Link>
          {/if}
          {#if data.transactions.length === data.limit}
            <Link href={offsetHref(data.offset + data.limit)} variant="standalone">{t(locale, "banking.action.next")}</Link>
          {/if}
        </nav>
      {/if}
    {/if}
  </Stack>
</Container>

{#if pendingModal}
  <Modal open={true} title={modalTitle()} description={modalDescription()} closeLabel={t(locale, "banking.action.cancel")} onclose={() => (pendingModal = null)}>
    <form
      method="POST"
      action={pendingModal.action === "reject" ? "?/reject" : "?/ignore"}
      data-action={pendingModal.action}
      data-id={pendingModal.id}
      use:enhance={enhanceReconciliation}
    >
      {#if pendingModal.action === "reject"}
        <input type="hidden" name="linkId" value={pendingModal.id} />
      {/if}
      <input type="hidden" name="transactionId" value={pendingModal.transactionId} />
      <Flex gap={2} wrap={true}>
        <Button type="button" variant="secondary" onclick={() => (pendingModal = null)}>
          {t(locale, "banking.action.cancel")}
        </Button>
        <Button type="submit" variant="danger" disabled={isBusy(pendingModal.action, pendingModal.id)}>
          {pendingModal.action === "reject"
            ? isBusy("reject", pendingModal.id) ? t(locale, "banking.action.rejecting") : t(locale, "banking.action.reject")
            : isBusy("ignore", pendingModal.id) ? t(locale, "banking.action.ignoring") : t(locale, "banking.action.ignore")}
        </Button>
      </Flex>
    </form>
  </Modal>
{/if}

<style>
  .reconciliation__views,
  .reconciliation__pagination,
  .reconciliation__summary,
  .reconciliation__decision {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: var(--st-spacing-2);
  }

  .reconciliation__view--active {
    color: var(--st-semantic-text-primary);
    font-weight: var(--st-font-weight-semibold);
  }

  .reconciliation__list {
    display: grid;
    gap: var(--st-spacing-3);
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .reconciliation__row,
  .reconciliation__proposal-heading {
    align-items: start;
    display: flex;
    flex-wrap: wrap;
    gap: var(--st-spacing-3);
    justify-content: space-between;
  }

  .reconciliation__line,
  .reconciliation__summary,
  .reconciliation__comparison-card,
  .reconciliation__evidence,
  .reconciliation__decision {
    min-width: 0;
  }

  .reconciliation__description,
  .reconciliation__decision p,
  .reconciliation__comparison-card dl,
  .reconciliation__evidence ul {
    margin: 0;
  }

  .reconciliation__amount {
    font-variant-numeric: tabular-nums;
  }

  .reconciliation__proposal {
    display: grid;
    gap: var(--st-spacing-4);
    margin-block-start: var(--st-spacing-4);
    padding-block-start: var(--st-spacing-4);
  }

  .reconciliation__proposal-heading h2,
  .reconciliation__comparison-card h3,
  .reconciliation__evidence h3 {
    margin: 0;
  }

  .reconciliation__comparison {
    display: grid;
    gap: var(--st-spacing-3);
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .reconciliation__comparison-card,
  .reconciliation__evidence,
  .reconciliation__decision {
    background: var(--st-semantic-surface-subtle);
    display: grid;
    gap: var(--st-spacing-2);
    padding: var(--st-spacing-3);
  }

  .reconciliation__comparison-card dl {
    display: grid;
    gap: var(--st-spacing-2);
  }

  .reconciliation__comparison-card dl div {
    display: grid;
    gap: var(--st-spacing-1);
  }

  .reconciliation__comparison-card dt {
    color: var(--st-semantic-text-secondary);
  }

  .reconciliation__comparison-card dd {
    margin: 0;
    overflow-wrap: anywhere;
  }

  .reconciliation__evidence ul {
    display: grid;
    gap: var(--st-spacing-1);
    padding-inline-start: var(--st-spacing-5);
  }

  .reconciliation__pagination {
    justify-content: space-between;
  }
</style>
