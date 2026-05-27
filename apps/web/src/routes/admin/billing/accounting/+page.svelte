<script lang="ts">
  import {
    Alert,
    Card,
    EmptyState,
    Tag
  } from "@sentropic/design-system-svelte";

  import type { Account, JournalEntryWithLines } from "@sentropic/openerp-domain/billing";

  import { t, type LocaleCode } from "$lib/i18n";

  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();

  const locale: LocaleCode = $derived(data.locale);
  const accounts: Account[] = $derived(data.accounts ?? []);
  const journalEntries: JournalEntryWithLines[] = $derived(data.journalEntries ?? []);

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

  function accountTypeTone(type: Account["type"]): "success" | "warning" | "neutral" {
    if (type === "asset") return "success";
    if (type === "revenue") return "success";
    if (type === "liability" || type === "equity") return "neutral";
    return "neutral";
  }

  function statusTone(status: JournalEntryWithLines["status"]): "success" | "warning" | "neutral" {
    if (status === "posted") return "success";
    if (status === "void") return "warning";
    return "neutral";
  }

  function formatMoney(minor: number, scale: number, currency: string): string {
    const amount = minor / Math.pow(10, scale);
    return `${amount.toFixed(scale)} ${currency}`;
  }

  function entryTotalDebit(entry: JournalEntryWithLines): number {
    return entry.lines.reduce((s, l) => s + l.debit.amountMinor, 0);
  }

  let expandedEntryId = $state<string | null>(null);

  function toggleEntry(id: string): void {
    expandedEntryId = expandedEntryId === id ? null : id;
  }
</script>

<section class="page">
  <header class="page__header">
    <div>
      <h1>{t(locale, "billing.accounts.page.title")}</h1>
      <p class="page__lede">
        {t(locale, "billing.accounts.page.lede")}
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
      {t(locale, "approval.backendError.fallback")}
    </Alert>
  {/if}

  <Card>
    {#if accounts.length === 0}
      <EmptyState
        title={t(locale, "billing.accounts.empty.title")}
        message={t(locale, "billing.accounts.empty.message")}
      />
    {:else}
      <div class="table-wrap">
        <table class="data-table" data-testid="accounts-table">
          <thead>
            <tr>
              <th>{t(locale, "billing.accounts.field.code")}</th>
              <th>{t(locale, "billing.accounts.field.name")}</th>
              <th>{t(locale, "billing.accounts.field.type")}</th>
              <th>{t(locale, "billing.accounts.field.active")}</th>
            </tr>
          </thead>
          <tbody>
            {#each accounts as account (account.id)}
              <tr data-testid="account-row" data-account-code={account.code}>
                <td><code>{account.code}</code></td>
                <td>{account.name}</td>
                <td>
                  <Tag tone={accountTypeTone(account.type)}>
                    {t(locale, `billing.accounts.type.${account.type}`)}
                  </Tag>
                </td>
                <td>{account.active ? "✓" : "—"}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </Card>

  <h2 class="section-title">{t(locale, "billing.journal.page.title")}</h2>
  <p class="section-lede">{t(locale, "billing.journal.page.lede")}</p>

  <Card>
    {#if journalEntries.length === 0}
      <EmptyState
        title={t(locale, "billing.journal.empty.title")}
        message={t(locale, "billing.journal.empty.message")}
      />
    {:else}
      <div class="table-wrap">
        <table class="data-table" data-testid="journal-entries-table">
          <thead>
            <tr>
              <th>{t(locale, "billing.journal.field.entryDate")}</th>
              <th>{t(locale, "billing.journal.field.reference")}</th>
              <th>{t(locale, "billing.journal.field.description")}</th>
              <th>{t(locale, "billing.journal.field.sourceType")}</th>
              <th>{t(locale, "billing.journal.field.status")}</th>
              <th>{t(locale, "billing.journal.field.debit")}</th>
            </tr>
          </thead>
          <tbody>
            {#each journalEntries as entry (entry.id)}
            <tr
              data-testid="journal-entry-row"
              data-entry-id={entry.id}
              data-entry-status={entry.status}
              class="journal-row"
              onclick={() => toggleEntry(entry.id)}
              role="button"
              tabindex="0"
              onkeydown={(e) => { if (e.key === "Enter" || e.key === " ") toggleEntry(entry.id); }}
            >
              <td>{entry.entryDate}</td>
              <td><code>{entry.reference ?? "—"}</code></td>
              <td class="entry-description">{entry.description ?? "—"}</td>
              <td>
                <Tag tone="neutral">
                  {t(locale, `billing.journal.sourceType.${entry.sourceType}`)}
                </Tag>
              </td>
              <td>
                <Tag tone={statusTone(entry.status)}>
                  {t(locale, `billing.journal.status.${entry.status}`)}
                </Tag>
              </td>
              <td>
                {formatMoney(
                  entryTotalDebit(entry),
                  entry.lines[0]?.debit.scale ?? 2,
                  entry.lines[0]?.debit.currency ?? "CAD"
                )}
              </td>
            </tr>
            {#if expandedEntryId === entry.id && entry.lines.length > 0}
              <tr class="journal-lines-row" data-testid="journal-lines-{entry.id}">
                <td colspan="6">
                  <table class="lines-table">
                    <thead>
                      <tr>
                        <th>{t(locale, "billing.journal.field.description")}</th>
                        <th>{t(locale, "billing.journal.field.debit")}</th>
                        <th>{t(locale, "billing.journal.field.credit")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {#each entry.lines as line (line.id)}
                        <tr data-testid="journal-line-row">
                          <td>{line.description ?? "—"}</td>
                          <td class="amount">
                            {line.debit.amountMinor > 0
                              ? formatMoney(line.debit.amountMinor, line.debit.scale, line.debit.currency)
                              : "—"}
                          </td>
                          <td class="amount">
                            {line.credit.amountMinor > 0
                              ? formatMoney(line.credit.amountMinor, line.credit.scale, line.credit.currency)
                              : "—"}
                          </td>
                        </tr>
                      {/each}
                    </tbody>
                  </table>
                </td>
              </tr>
            {/if}
          {/each}
        </tbody>
        </table>
      </div>
    {/if}
  </Card>
</section>

<style>
  .page {
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 1rem;
  }

  .table-wrap {
    max-width: 100%;
    overflow-x: auto;
  }

  .page__header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 0.75rem;
  }

  .page__lede {
    color: var(--st-semantic-text-secondary, #475569);
    margin-top: 0.25rem;
  }

  .page__actions {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    flex-shrink: 0;
  }

  .section-title {
    margin-top: 0.5rem;
    margin-bottom: 0;
  }

  .section-lede {
    color: var(--st-semantic-text-secondary, #475569);
    margin-top: 0.25rem;
    margin-bottom: 0;
  }

  .data-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.875rem;
  }

  .data-table th {
    text-align: left;
    padding: 0.5rem 0.75rem;
    border-bottom: 1px solid var(--st-semantic-border-subtle, #e2e8f0);
    font-weight: 500;
    color: var(--st-semantic-text-secondary, #475569);
  }

  .data-table td {
    padding: 0.5rem 0.75rem;
    border-bottom: 1px solid var(--st-semantic-border-subtle, #e2e8f0);
    vertical-align: middle;
  }

  .journal-row {
    cursor: pointer;
  }

  .journal-row:hover td {
    background: var(--st-semantic-surface-subtle, #f8fafc);
  }

  .entry-description {
    max-width: 240px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .journal-lines-row td {
    background: var(--st-semantic-surface-subtle, #f8fafc);
    padding: 0 1rem 0.75rem;
  }

  .lines-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.875rem;
  }

  .lines-table th {
    text-align: left;
    padding: 0.25rem 0.5rem;
    font-weight: 500;
    color: var(--st-semantic-text-secondary, #475569);
    border-bottom: 1px solid var(--st-semantic-border-subtle, #e2e8f0);
  }

  .lines-table td {
    padding: 0.25rem 0.5rem;
    border-bottom: 1px solid var(--st-semantic-border-subtle, #e2e8f0);
  }

  .amount {
    text-align: right;
    font-variant-numeric: tabular-nums;
  }
</style>
