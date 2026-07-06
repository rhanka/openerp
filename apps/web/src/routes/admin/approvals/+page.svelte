<script lang="ts">
  import { enhance } from "$app/forms";
  import { Alert, Button, Card, Container, EmptyState, Flex, Input, Row, Stack, Tag } from "@sentropic/design-system-svelte";

  import type { PageData, ActionData } from "./$types";
  import { t, type LocaleCode } from "$lib/i18n";

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

  function urgencyTone(urgency: string): "error" | "info" | "neutral" {
    if (urgency === "high") return "error";
    if (urgency === "low") return "info";
    return "neutral";
  }

  function decisionLabel(decision: string): string {
    if (decision === "approved") return t(locale, "approval.decision.approved");
    if (decision === "rejected") return t(locale, "approval.decision.rejected");
    if (decision === "escalated") return t(locale, "approval.decision.escalated");
    return decision;
  }
</script>

<Container size="xl" as="section">
<Stack gap={6}>
  <Row justify="between" align="start">
    <div>
      <h1>{t(locale, "approval.page.title")}</h1>
      <p class="page__lede">
        {t(locale, "approval.page.lede")}
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
      {data.message ?? t(locale, "approval.backendError.fallback")}
    </Alert>
  {/if}

  {#if form && "code" in form}
    {@const message = (form as { message?: string }).message}
    <Alert tone="error" title={t(locale, "approval.actionError.title")}>
      {form.code}{message ? ` — ${message}` : ""}
    </Alert>
  {/if}
  {#if form && "ok" in form && form.ok}
    <Alert tone="success" title={t(locale, "approval.success.title")}>
      Approval {form.id} → {decisionLabel(form.decision)}.
    </Alert>
  {/if}

  {#if data.approvals.length === 0}
    <EmptyState
      title={t(locale, "approval.empty.title")}
      message={t(locale, "approval.empty.message")}
    />
  {:else}
    <Stack gap={4} class="approvals-list">
      {#each data.approvals as ar}
        <Card>
          <h2 class="approvals-title">{ar.subjectType}:{ar.subjectId}</h2>
          <p class="approvals-reason">{ar.reason}</p>
          <div class="approvals-meta">
            <Tag tone={urgencyTone(ar.urgency)}>{ar.urgency}</Tag>
            <span class="approvals-meta__time">
              {new Date(ar.createdAt).toISOString().slice(0, 16).replace("T", " ")}
            </span>
          </div>
          <form method="POST" action="?/decide" use:enhance class="approvals-form">
            <input type="hidden" name="id" value={ar.id} />
            <Input
              name="decisionReason"
              label={t(locale, "approval.form.reason")}
              placeholder={t(locale, "approval.form.reasonPlaceholder")}
              required
              minlength={3}
            />
            <div class="approvals-form__actions">
              <Button variant="primary" type="submit" name="decision" value="approved">
                {t(locale, "approval.action.approve")}
              </Button>
              <Button variant="secondary" type="submit" name="decision" value="rejected">
                {t(locale, "approval.action.reject")}
              </Button>
            </div>
          </form>
        </Card>
      {/each}
    </Stack>
  {/if}
</Stack>
</Container>

<style>
  .approvals-title {
    font-size: 1rem;
    margin: 0 0 0.5rem;
  }
  .approvals-reason {
    color: var(--st-semantic-text-secondary);
    margin: 0.25rem 0 0.75rem;
  }
  .approvals-meta {
    align-items: center;
    display: flex;
    gap: 0.75rem;
    margin-bottom: 1rem;
  }
  .approvals-meta__time {
    color: var(--st-semantic-text-secondary);
    font-size: 0.875rem;
  }
  .approvals-form {
    display: grid;
    gap: 0.75rem;
  }
  .approvals-form__actions {
    display: flex;
    gap: 0.5rem;
  }
</style>
