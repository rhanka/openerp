<script lang="ts">
  import { enhance } from "$app/forms";
  import { Alert, Card, EmptyState, Tag } from "@sentropic/design-system-svelte";

  import type { Assignment, InvoiceProposal, InvoiceProposalStatus, Project, ProjectStatus, ProjectTask, ProjectTaskStatus, TimeEntry, TimeEntryStatus } from "@sentropic/openerp-domain/project";

  import { t, type LocaleCode } from "$lib/i18n";

  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();

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
  const project: Project | null = $derived(data.project);
  const tasks: ProjectTask[] = $derived(data.tasks ?? []);
  const timeEntries: TimeEntry[] = $derived(data.timeEntries ?? []);
  const assignments: Assignment[] = $derived(data.assignments ?? []);
  const proposals: InvoiceProposal[] = $derived(data.proposals ?? []);
  const billableTotal: number = $derived(
    timeEntries.filter((e) => e.billable).reduce((sum, e) => sum + e.minutes, 0)
  );

  let creatingTask = $state(false);
  let loggingTime = $state(false);
  let creatingAssignment = $state(false);
  let generatingProposal = $state(false);

  function statusLabel(status: ProjectStatus): string {
    return t(locale, `project.projects.status.${status}`);
  }
  function statusTone(status: ProjectStatus): "success" | "warning" | "neutral" {
    if (status === "active") return "success";
    if (status === "on_hold") return "warning";
    return "neutral";
  }
  function taskStatusLabel(status: ProjectTaskStatus): string {
    return t(locale, `project.tasks.status.${status}`);
  }
  function taskStatusTone(status: ProjectTaskStatus): "success" | "warning" | "info" | "neutral" {
    if (status === "done") return "success";
    if (status === "blocked") return "warning";
    if (status === "in_progress") return "info";
    return "neutral";
  }
  function timeEntryStatusLabel(status: TimeEntryStatus): string {
    return t(locale, `project.timeEntries.status.${status}`);
  }
  function timeEntryStatusTone(status: TimeEntryStatus): "success" | "warning" | "info" | "neutral" {
    if (status === "approved") return "success";
    if (status === "rejected") return "warning";
    if (status === "submitted") return "info";
    return "neutral";
  }
  function formatMinutes(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h > 0 ? `${h}h${m > 0 ? ` ${m}min` : ""}` : `${m}min`;
  }
  function entryVerb(entryType: string): string {
    const parts = entryType.split(".");
    return parts[parts.length - 1] ?? entryType;
  }
  function entryLabel(entryType: string): string {
    const verb = entryVerb(entryType);
    return t(locale, `project.projects.entryType.${verb}`);
  }
  function entryTone(entryType: string): "success" | "warning" | "info" | "neutral" {
    const verb = entryVerb(entryType);
    if (verb === "created") return "info";
    if (verb === "deleted") return "warning";
    return "neutral";
  }
  function formatTimestamp(iso: string): string {
    return new Date(iso).toLocaleString(locale === "fr" ? "fr-CA" : "en-CA");
  }
  function proposalStatusLabel(status: InvoiceProposalStatus): string {
    return t(locale, `project.invoiceProposals.status.${status}`);
  }
  function proposalStatusTone(status: InvoiceProposalStatus): "success" | "warning" | "info" | "neutral" {
    if (status === "approved") return "success";
    if (status === "rejected") return "warning";
    if (status === "submitted") return "info";
    return "neutral";
  }
  function formatMoney(amountMinor: number, currency: string, scale: number): string {
    const amount = amountMinor / Math.pow(10, scale);
    return new Intl.NumberFormat(locale === "fr" ? "fr-CA" : "en-CA", {
      style: "currency",
      currency
    }).format(amount);
  }
</script>

<section class="page">
  <header class="page__header">
    <div>
      <h1>{project?.name ?? t(locale, "project.projects.detail.notFound")}</h1>
      {#if project?.code}
        <p class="page__lede">{project.code}</p>
      {/if}
    </div>
    <div class="page__actions">
      <span data-source={data.source} data-testid="data-source-badge">
        <Tag tone={sourceTone}>{sourceLabel}</Tag>
      </span>
      <a class="page__back" href="/admin/project/projects">
        ← {t(locale, "project.projects.detail.action.back")}
      </a>
    </div>
  </header>

  {#if data.source === "error"}
    <Alert tone="warning" title={t(locale, "approval.backendError.title")}>
      {data.message ?? t(locale, "approval.backendError.fallback")}
    </Alert>
  {/if}

  {#if data.source === "not_found" || !project}
    <EmptyState
      title={t(locale, "project.projects.detail.notFound")}
      message={data.message ?? ""}
    />
  {:else}
    <Card>
      <div class="page__meta">
        <div>
          <dt>{t(locale, "project.projects.field.status")}</dt>
          <dd>
            <Tag tone={statusTone(project.status)}>{statusLabel(project.status)}</Tag>
          </dd>
        </div>
        {#if project.description}
          <div>
            <dt>{t(locale, "project.projects.field.description")}</dt>
            <dd>{project.description}</dd>
          </div>
        {/if}
        {#if project.startDate}
          <div>
            <dt>{t(locale, "project.projects.field.startDate")}</dt>
            <dd>{project.startDate}</dd>
          </div>
        {/if}
        {#if project.endDate}
          <div>
            <dt>{t(locale, "project.projects.field.endDate")}</dt>
            <dd>{project.endDate}</dd>
          </div>
        {/if}
      </div>
    </Card>

    <h2 class="page__section-title" data-testid="tasks-section-title">
      {t(locale, "project.tasks.section.title")}
    </h2>

    <Card>
      <form
        method="POST"
        action="?/createTask"
        use:enhance={() => {
          creatingTask = true;
          return async ({ update }) => {
            creatingTask = false;
            await update();
          };
        }}
        class="page__task-form"
      >
        <fieldset>
          <legend class="page__task-form-legend">{t(locale, "project.tasks.form.legend")}</legend>
          <div class="page__task-form-fields">
            <label>
              <span>{t(locale, "project.tasks.field.title")}</span>
              <input type="text" name="title" required placeholder={t(locale, "project.tasks.field.title")} />
            </label>
            <label>
              <span>{t(locale, "project.tasks.field.dueDate")}</span>
              <input type="date" name="dueDate" />
            </label>
            <button type="submit" disabled={creatingTask}>
              {creatingTask ? t(locale, "project.tasks.action.creating") : t(locale, "project.tasks.action.create")}
            </button>
          </div>
        </fieldset>
      </form>
    </Card>

    {#if tasks.length === 0}
      <EmptyState
        title={t(locale, "project.tasks.empty.title")}
        message={t(locale, "project.tasks.empty.message")}
      />
    {:else}
      <ol class="page__tasks" data-testid="project-tasks-list">
        {#each tasks as task (task.id)}
          <li class="page__task-item" data-task-id={task.id} data-task-status={task.status}>
            <div class="page__task-status">
              <Tag tone={taskStatusTone(task.status)}>{taskStatusLabel(task.status)}</Tag>
            </div>
            <div class="page__task-body">
              <span class="page__task-title">{task.title}</span>
              {#if task.dueDate}
                <span class="page__task-due">{task.dueDate}</span>
              {/if}
            </div>
            <div class="page__task-actions">
              {#if task.status !== "done" && task.status !== "cancelled"}
                <form method="POST" action="?/markDone" use:enhance>
                  <input type="hidden" name="taskId" value={task.id} />
                  <button type="submit" class="page__task-btn page__task-btn--done">
                    {t(locale, "project.tasks.action.markDone")}
                  </button>
                </form>
              {/if}
              <form
                method="POST"
                action="?/deleteTask"
                use:enhance
                onsubmit={(e) => {
                  if (!confirm(t(locale, "project.tasks.action.deleteConfirm"))) {
                    e.preventDefault();
                  }
                }}
              >
                <input type="hidden" name="taskId" value={task.id} />
                <button type="submit" class="page__task-btn page__task-btn--delete">
                  {t(locale, "project.tasks.action.delete")}
                </button>
              </form>
            </div>
          </li>
        {/each}
      </ol>
    {/if}

    <h2 class="page__section-title" data-testid="time-entries-section-title">
      {t(locale, "project.timeEntries.section.title")}
    </h2>

    <Card>
      <form
        method="POST"
        action="?/logTime"
        use:enhance={() => {
          loggingTime = true;
          return async ({ update }) => {
            loggingTime = false;
            await update();
          };
        }}
        class="page__task-form"
      >
        <fieldset>
          <legend class="page__task-form-legend">{t(locale, "project.timeEntries.form.legend")}</legend>
          <div class="page__task-form-fields">
            <label>
              <span>{t(locale, "project.timeEntries.field.entryDate")}</span>
              <input type="date" name="entryDate" required />
            </label>
            <label>
              <span>{t(locale, "project.timeEntries.field.minutes")}</span>
              <input type="number" name="minutes" min="1" step="1" required placeholder="60" />
            </label>
            <label>
              <span>{t(locale, "project.timeEntries.field.description")}</span>
              <input type="text" name="description" placeholder={t(locale, "project.timeEntries.field.description")} />
            </label>
            <label class="page__checkbox-label">
              <input type="checkbox" name="billable" checked />
              <span>{t(locale, "project.timeEntries.field.billable")}</span>
            </label>
            <input type="hidden" name="userId" value={data.locale === "fr" ? "demo-user-1" : "demo-user-1"} />
            <button type="submit" disabled={loggingTime}>
              {loggingTime ? t(locale, "project.timeEntries.action.creating") : t(locale, "project.timeEntries.action.create")}
            </button>
          </div>
        </fieldset>
      </form>
    </Card>

    {#if timeEntries.length === 0}
      <EmptyState
        title={t(locale, "project.timeEntries.empty.title")}
        message={t(locale, "project.timeEntries.empty.message")}
      />
    {:else}
      <ol class="page__tasks" data-testid="project-time-entries-list">
        {#each timeEntries as entry (entry.id)}
          <li class="page__task-item" data-entry-id={entry.id} data-entry-status={entry.status}>
            <div class="page__task-status">
              <Tag tone={timeEntryStatusTone(entry.status)}>{timeEntryStatusLabel(entry.status)}</Tag>
            </div>
            <div class="page__task-body">
              <span class="page__task-title">{formatMinutes(entry.minutes)} — {entry.entryDate}</span>
              {#if entry.description}
                <span class="page__task-due">{entry.description}</span>
              {/if}
            </div>
            <div class="page__task-actions">
              {#if entry.status === "draft"}
                <form method="POST" action="?/submitTimeEntry" use:enhance>
                  <input type="hidden" name="entryId" value={entry.id} />
                  <button type="submit" class="page__task-btn page__task-btn--done">
                    {t(locale, "project.timeEntries.action.submit")}
                  </button>
                </form>
              {/if}
              {#if entry.status === "submitted"}
                <form method="POST" action="?/approveTimeEntry" use:enhance>
                  <input type="hidden" name="entryId" value={entry.id} />
                  <button type="submit" class="page__task-btn page__task-btn--done">
                    {t(locale, "project.timeEntries.action.approve")}
                  </button>
                </form>
              {/if}
              <form
                method="POST"
                action="?/deleteTimeEntry"
                use:enhance
                onsubmit={(e) => {
                  if (!confirm(t(locale, "project.timeEntries.action.deleteConfirm"))) {
                    e.preventDefault();
                  }
                }}
              >
                <input type="hidden" name="entryId" value={entry.id} />
                <button type="submit" class="page__task-btn page__task-btn--delete">
                  {t(locale, "project.timeEntries.action.delete")}
                </button>
              </form>
            </div>
          </li>
        {/each}
      </ol>
      <p class="page__time-total">
        {t(locale, "project.timeEntries.section.total")}: <strong>{formatMinutes(billableTotal)}</strong>
      </p>
    {/if}

    <h2 class="page__section-title" data-testid="assignments-section-title">
      {t(locale, "project.assignments.section.title")}
    </h2>

    <Card>
      <form
        method="POST"
        action="?/createAssignment"
        use:enhance={() => {
          creatingAssignment = true;
          return async ({ update }) => {
            creatingAssignment = false;
            await update();
          };
        }}
        class="page__task-form"
      >
        <fieldset>
          <legend class="page__task-form-legend">{t(locale, "project.assignments.form.legend")}</legend>
          <div class="page__task-form-fields">
            <label>
              <span>{t(locale, "project.assignments.field.userId")}</span>
              <input type="text" name="userId" required placeholder="user-uuid" />
            </label>
            <label>
              <span>{t(locale, "project.assignments.field.roleLabel")}</span>
              <input type="text" name="roleLabel" placeholder={t(locale, "project.assignments.field.roleLabel")} />
            </label>
            <label>
              <span>{t(locale, "project.assignments.field.allocationPercent")}</span>
              <input type="number" name="allocationPercent" min="0" max="100" step="1" placeholder="100" />
            </label>
            <label>
              <span>{t(locale, "project.assignments.field.billableRate")}</span>
              <input type="text" name="billableRateId" placeholder="rate-uuid" />
            </label>
            <button type="submit" disabled={creatingAssignment}>
              {creatingAssignment ? t(locale, "project.assignments.action.creating") : t(locale, "project.assignments.action.create")}
            </button>
          </div>
        </fieldset>
      </form>
    </Card>

    {#if assignments.length === 0}
      <EmptyState
        title={t(locale, "project.assignments.empty.title")}
        message={t(locale, "project.assignments.empty.message")}
      />
    {:else}
      <ol class="page__tasks" data-testid="project-assignments-list">
        {#each assignments as assignment (assignment.id)}
          <li class="page__task-item" data-assignment-id={assignment.id} data-allocation={assignment.allocationPercent}>
            <div class="page__task-body">
              <span class="page__task-title">{assignment.roleLabel ?? assignment.userId}</span>
              <span class="page__task-due">
                {assignment.userId}
                {#if assignment.allocationPercent !== null}
                  &mdash; {assignment.allocationPercent}%
                {/if}
              </span>
            </div>
            <div class="page__task-actions">
              <form
                method="POST"
                action="?/deleteAssignment"
                use:enhance
                onsubmit={(e) => {
                  if (!confirm(t(locale, "project.assignments.action.deleteConfirm"))) {
                    e.preventDefault();
                  }
                }}
              >
                <input type="hidden" name="assignmentId" value={assignment.id} />
                <button type="submit" class="page__task-btn page__task-btn--delete">
                  {t(locale, "project.assignments.action.delete")}
                </button>
              </form>
            </div>
          </li>
        {/each}
      </ol>
    {/if}

    <h2 class="page__section-title" data-testid="invoice-proposals-section-title">
      {t(locale, "project.invoiceProposals.section.title")}
    </h2>

    <Card>
      <form
        method="POST"
        action="?/generateProposal"
        use:enhance={() => {
          generatingProposal = true;
          return async ({ update }) => {
            generatingProposal = false;
            await update();
          };
        }}
        class="page__task-form"
      >
        <div class="page__task-form-fields">
          <button type="submit" disabled={generatingProposal}>
            {generatingProposal
              ? t(locale, "project.invoiceProposals.action.generating")
              : t(locale, "project.invoiceProposals.action.generate")}
          </button>
        </div>
      </form>
    </Card>

    {#if proposals.length === 0}
      <EmptyState
        title={t(locale, "project.invoiceProposals.empty.title")}
        message={t(locale, "project.invoiceProposals.empty.message")}
      />
    {:else}
      <ol class="page__tasks" data-testid="project-proposals-list">
        {#each proposals as proposal (proposal.id)}
          <li class="page__task-item" data-proposal-id={proposal.id} data-proposal-status={proposal.status}>
            <div class="page__task-status">
              <Tag tone={proposalStatusTone(proposal.status)}>{proposalStatusLabel(proposal.status)}</Tag>
            </div>
            <div class="page__task-body">
              <span class="page__task-title">
                {formatMoney(proposal.total.amountMinor, proposal.total.currency, proposal.total.scale)}
              </span>
              {#if proposal.periodStart || proposal.periodEnd}
                <span class="page__task-due">
                  {proposal.periodStart ?? "—"} → {proposal.periodEnd ?? "—"}
                </span>
              {/if}
            </div>
            <div class="page__task-actions">
              {#if proposal.status === "draft"}
                <form method="POST" action="?/submitProposal" use:enhance>
                  <input type="hidden" name="proposalId" value={proposal.id} />
                  <button type="submit" class="page__task-btn page__task-btn--done">
                    {t(locale, "project.invoiceProposals.action.submit")}
                  </button>
                </form>
              {/if}
              {#if proposal.status === "submitted"}
                <form method="POST" action="?/approveProposal" use:enhance>
                  <input type="hidden" name="proposalId" value={proposal.id} />
                  <button type="submit" class="page__task-btn page__task-btn--done">
                    {t(locale, "project.invoiceProposals.action.approve")}
                  </button>
                </form>
                <form method="POST" action="?/rejectProposal" use:enhance>
                  <input type="hidden" name="proposalId" value={proposal.id} />
                  <button type="submit" class="page__task-btn page__task-btn--delete">
                    {t(locale, "project.invoiceProposals.action.reject")}
                  </button>
                </form>
              {/if}
              <form
                method="POST"
                action="?/deleteProposal"
                use:enhance
                onsubmit={(e) => {
                  if (!confirm(t(locale, "project.invoiceProposals.action.deleteConfirm"))) {
                    e.preventDefault();
                  }
                }}
              >
                <input type="hidden" name="proposalId" value={proposal.id} />
                <button type="submit" class="page__task-btn page__task-btn--delete">
                  {t(locale, "project.invoiceProposals.action.delete")}
                </button>
              </form>
            </div>
          </li>
        {/each}
      </ol>
    {/if}

    <h2 class="page__section-title">
      {t(locale, "project.projects.detail.timeline.title")}
    </h2>

    {#if data.timeline.length === 0}
      <EmptyState
        title={t(locale, "project.projects.detail.empty.title")}
        message={t(locale, "project.projects.detail.empty.message")}
      />
    {:else}
      <ol class="page__timeline" data-testid="project-project-timeline">
        {#each data.timeline as entry (entry.id)}
          <li class="page__timeline-item" data-entry-type={entry.entryType}>
            <div class="page__timeline-badge">
              <Tag tone={entryTone(entry.entryType)}>{entryLabel(entry.entryType)}</Tag>
            </div>
            <div class="page__timeline-body">
              <time datetime={entry.occurredAt}>{formatTimestamp(entry.occurredAt)}</time>
            </div>
          </li>
        {/each}
      </ol>
    {/if}
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
  .page__actions {
    display: flex;
    align-items: center;
    gap: 1rem;
  }
  .page__back {
    color: var(--st-semantic-text-muted, #64748b);
    font-size: 0.875rem;
  }
  .page__meta {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 1rem;
  }
  .page__meta dt {
    color: var(--st-semantic-text-muted, #64748b);
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .page__meta dd {
    margin: 0.25rem 0 0 0;
  }
  .page__section-title {
    margin: 0;
    font-size: 1.125rem;
  }
  .page__timeline {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  .page__timeline-item {
    display: flex;
    align-items: flex-start;
    gap: 1rem;
    padding: 0.75rem;
    background: var(--st-semantic-surface-default, #ffffff);
    border: 1px solid var(--st-semantic-border-subtle, #e2e8f0);
    border-radius: var(--st-component-control-radius, 0.375rem);
  }
  .page__timeline-body {
    color: var(--st-semantic-text-muted, #64748b);
    font-size: 0.875rem;
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
  .page__task-form {
    padding: 0.75rem 0;
  }
  .page__task-form-legend {
    font-size: 0.875rem;
    font-weight: 600;
    margin-bottom: 0.75rem;
  }
  .page__task-form-fields {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
    align-items: flex-end;
  }
  .page__task-form-fields label {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    font-size: 0.875rem;
  }
  .page__task-form-fields input {
    padding: 0.5rem 0.75rem;
    border: 1px solid var(--st-semantic-border-subtle, #e2e8f0);
    border-radius: var(--st-component-control-radius, 0.375rem);
    font-size: 0.875rem;
  }
  .page__task-form-fields button {
    padding: 0.5rem 1rem;
    border-radius: var(--st-component-control-radius, 0.375rem);
    border: none;
    background: var(--st-semantic-action-primary, oklch(50% 0.134 242.749));
    color: var(--st-semantic-action-primaryText, #ffffff);
    font-size: 0.875rem;
    cursor: pointer;
  }
  .page__tasks {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  .page__task-item {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.75rem;
    background: var(--st-semantic-surface-default, #ffffff);
    border: 1px solid var(--st-semantic-border-subtle, #e2e8f0);
    border-radius: var(--st-component-control-radius, 0.375rem);
  }
  .page__task-body {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  .page__task-title {
    font-size: 0.875rem;
  }
  .page__task-due {
    font-size: 0.75rem;
    color: var(--st-semantic-text-muted, #64748b);
  }
  .page__task-actions {
    display: flex;
    gap: 0.5rem;
  }
  .page__task-btn {
    padding: 0.25rem 0.75rem;
    border-radius: var(--st-component-control-radius, 0.375rem);
    border: 1px solid var(--st-semantic-border-subtle, #e2e8f0);
    font-size: 0.75rem;
    cursor: pointer;
    background: transparent;
  }
  .page__task-btn--done {
    color: var(--st-semantic-feedback-success, #16a34a);
    border-color: var(--st-semantic-feedback-success, #16a34a);
  }
  .page__task-btn--delete {
    color: var(--st-semantic-text-muted, #64748b);
  }
  .page__checkbox-label {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
  }
  .page__time-total {
    font-size: 0.875rem;
    color: var(--st-semantic-text-muted, #64748b);
    margin: 0.5rem 0 0 0;
  }
</style>
