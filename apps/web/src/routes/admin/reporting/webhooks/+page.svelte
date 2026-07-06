<script lang="ts">
  import { enhance } from "$app/forms";
  import { Alert, Button, Card, Container, EmptyState, Flex, Input, Row, Stack, Tag } from "@sentropic/design-system-svelte";

  import type { WebhookEndpoint, WebhookDelivery } from "@sentropic/openerp-domain/webhook";

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
  let secretCopied = $state(false);

  function eventTypeLabel(eventType: string): string {
    const entry = data.eventTypes.find((e) => e.eventType === eventType);
    if (!entry) return eventType;
    const key = entry.labelKey as Parameters<typeof t>[1];
    return t(locale, key);
  }

  function deliveryStatusTone(status: WebhookDelivery["status"]): "success" | "warning" | "neutral" {
    if (status === "succeeded") return "success";
    if (status === "failed") return "warning";
    return "neutral";
  }

  function deliveryStatusLabel(status: WebhookDelivery["status"]): string {
    const key = `webhook.delivery.status.${status}` as Parameters<typeof t>[1];
    return t(locale, key);
  }

  function formatDate(iso: string | null): string {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
    }
  }

  function errorCodeMessage(code: string | undefined): string {
    if (!code) return "";
    if (code === "EVENT_TYPES_REQUIRED") return t(locale, "webhook.validation.eventTypesRequired");
    return code;
  }

  // Extract signingSecret from action result (shown ONCE)
  const shownSecret = $derived(
    form && "signingSecret" in form && form.signingSecret ? String(form.signingSecret) : null
  );

  // Distinguish created vs rotated secret reveal
  const secretRevealTitle = $derived(
    form && "rotated" in form && form.rotated
      ? t(locale, "webhook.secret.rotated")
      : t(locale, "webhook.secret.created")
  );

  async function copySecret() {
    if (!shownSecret) return;
    try {
      await navigator.clipboard.writeText(shownSecret);
      secretCopied = true;
      setTimeout(() => { secretCopied = false; }, 2000);
    } catch {
      // clipboard unavailable — user can copy manually
    }
  }
</script>

<Container size="xl" as="section">
<Stack gap={6}>
  <Row justify="between" align="start">
    <div>
      <h1>{t(locale, "webhook.page.title")}</h1>
      <p class="page__lede">
        {t(locale, "webhook.page.lede")}
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
      {(data as unknown as { message?: string }).message ?? t(locale, "approval.backendError.fallback")}
    </Alert>
  {/if}

  {#if form && "ok" in form && form.ok && shownSecret}
    <Alert tone="success" title={secretRevealTitle}>
      <div class="page__secret-reveal">
        <code class="page__secret">{shownSecret}</code>
        <Button
          variant="secondary"
          size="sm"
          onclick={copySecret}
          aria-label={t(locale, "webhook.action.copySecret")}
        >
          {secretCopied ? "✓" : t(locale, "webhook.action.copySecret")}
        </Button>
      </div>
    </Alert>
  {/if}

  {#if form && "code" in form}
    <Alert tone="warning" title={t(locale, "approval.actionError.title")}>
      {errorCodeMessage((form as unknown as { code?: string }).code)}
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
        <legend>{t(locale, "webhook.form.legend")}</legend>
        <Input
          label={t(locale, "webhook.field.name")}
          name="name"
          required
          minlength={1}
        />
        <Input
          label={t(locale, "webhook.field.targetUrl")}
          name="targetUrl"
          type="url"
          required
          placeholder="https://hooks.example.com/path"
        />
        <div class="page__field-group">
          <label class="page__label" for="wh-event-types">
            {t(locale, "webhook.field.eventTypes")}
          </label>
          <select
            id="wh-event-types"
            name="eventTypes"
            class="page__select"
            multiple
            required
            data-testid="event-types-select"
            size={data.eventTypes.length}
          >
            {#each data.eventTypes as et}
              <option value={et.eventType}>{eventTypeLabel(et.eventType)}</option>
            {/each}
          </select>
        </div>
        <div class="page__checkbox-group">
          <label class="page__checkbox-label">
            <input type="checkbox" name="isActive" class="page__checkbox" checked />
            {t(locale, "webhook.field.isActive")}
          </label>
        </div>
        <div class="page__checkbox-group">
          <label class="page__checkbox-label">
            <input type="checkbox" name="isShared" class="page__checkbox" />
            {t(locale, "webhook.field.isShared")}
          </label>
        </div>
      </fieldset>
      <div class="page__form-actions">
        <Button type="submit" variant="primary" disabled={creating}>
          {creating
            ? t(locale, "webhook.action.creating")
            : t(locale, "webhook.action.create")}
        </Button>
      </div>
    </form>
  </Card>

  {#if data.endpoints.length === 0}
    <EmptyState
      title={t(locale, "webhook.empty.title")}
      message={t(locale, "webhook.empty.message")}
    />
  {:else}
    <ul class="page__list" data-testid="reporting-webhooks-list">
      {#each data.endpoints as endpoint (endpoint.id)}
        <li class="page__item">
          <Card>
            <header class="page__item-header">
              <div>
                <h2>{endpoint.name}</h2>
                <p class="page__item-sub">
                  {endpoint.targetUrl}
                </p>
                <p class="page__item-events">
                  {endpoint.eventTypes.map(eventTypeLabel).join(", ")}
                </p>
              </div>
              <div class="page__item-tags">
                {#if endpoint.isActive}
                  <Tag tone="success">{t(locale, "webhook.tag.active")}</Tag>
                {:else}
                  <Tag tone="neutral">{t(locale, "webhook.tag.inactive")}</Tag>
                {/if}
                {#if endpoint.isShared}
                  <Tag tone="info">{t(locale, "webhook.tag.shared")}</Tag>
                {/if}
              </div>
            </header>

            <div class="page__item-actions">
              <form method="POST" action="?/test" use:enhance>
                <input type="hidden" name="id" value={endpoint.id} />
                <Button type="submit" variant="secondary" size="sm">
                  {t(locale, "webhook.action.test")}
                </Button>
              </form>
              <form
                method="POST"
                action="?/rotateSecret"
                use:enhance
                onsubmit={(e) => { if (!confirm(t(locale, "webhook.action.rotateSecretConfirm"))) e.preventDefault(); }}
              >
                <input type="hidden" name="id" value={endpoint.id} />
                <Button type="submit" variant="secondary" size="sm">
                  {t(locale, "webhook.action.rotateSecret")}
                </Button>
              </form>
              <form
                method="POST"
                action="?/delete"
                use:enhance
                onsubmit={(e) => { if (!confirm(t(locale, "webhook.action.deleteConfirm"))) e.preventDefault(); }}
              >
                <input type="hidden" name="id" value={endpoint.id} />
                <Button type="submit" variant="secondary" size="sm">
                  {t(locale, "webhook.action.delete")}
                </Button>
              </form>
            </div>

            {#if data.deliveriesByEndpoint[endpoint.id]?.length}
              <details class="page__deliveries">
                <summary class="page__deliveries-summary">
                  {t(locale, "webhook.deliveries.title")}
                  ({data.deliveriesByEndpoint[endpoint.id]!.length})
                </summary>
                <ul class="page__deliveries-list">
                  {#each data.deliveriesByEndpoint[endpoint.id]! as delivery (delivery.id)}
                    <li class="page__delivery-item">
                      <Tag tone={deliveryStatusTone(delivery.status)}>
                        {deliveryStatusLabel(delivery.status)}
                      </Tag>
                      <span class="page__delivery-meta">
                        {delivery.eventType} &mdash; {formatDate(delivery.createdAt)}
                      </span>
                      <details class="page__payload">
                        <summary class="page__payload-summary">{t(locale, "webhook.deliveries.payload")}</summary>
                        <pre class="page__payload-body">{JSON.stringify(delivery.payload, null, 2)}</pre>
                        <code class="page__signature">{delivery.signature}</code>
                      </details>
                    </li>
                  {/each}
                </ul>
              </details>
            {:else}
              <p class="page__deliveries-empty">{t(locale, "webhook.deliveries.empty")}</p>
            {/if}
          </Card>
        </li>
      {/each}
    </ul>
  {/if}
</Stack>
</Container>

<style>
  .page__form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .page__fieldset {
    border: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .page__fieldset legend {
    font-weight: 600;
    margin-bottom: 0.5rem;
    color: var(--st-semantic-text-primary);
  }

  .page__field-group {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .page__label {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--st-semantic-text-primary);
  }

  .page__select {
    padding: 0.5rem;
    border: 1px solid var(--st-semantic-border-default);
    border-radius: 0.25rem;
    background: var(--st-semantic-background-default);
    color: var(--st-semantic-text-primary);
    font-size: 0.875rem;
  }

  .page__checkbox-group {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .page__checkbox-label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
    cursor: pointer;
  }

  .page__checkbox {
    width: 1rem;
    height: 1rem;
  }

  .page__form-actions {
    display: flex;
    justify-content: flex-end;
  }

  .page__list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .page__item-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
  }

  .page__item-tags {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .page__item-sub {
    margin: 0.25rem 0 0 0;
    font-size: 0.875rem;
    color: var(--st-semantic-text-muted);
    word-break: break-all;
  }

  .page__item-events {
    margin: 0.25rem 0 0 0;
    font-size: 0.75rem;
    color: var(--st-semantic-text-muted);
  }

  .page__item-actions {
    display: flex;
    gap: 0.5rem;
    margin-top: 1rem;
    flex-wrap: wrap;
  }

  .page__deliveries {
    margin-top: 1rem;
    border-top: 1px solid var(--st-semantic-border-default);
    padding-top: 0.75rem;
  }

  .page__deliveries-summary {
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    color: var(--st-semantic-text-secondary);
  }

  .page__deliveries-list {
    list-style: none;
    padding: 0;
    margin: 0.5rem 0 0 0;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .page__delivery-item {
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
    font-size: 0.75rem;
    flex-wrap: wrap;
  }

  .page__delivery-meta {
    color: var(--st-semantic-text-muted);
  }

  .page__deliveries-empty {
    margin: 0.5rem 0 0 0;
    font-size: 0.875rem;
    color: var(--st-semantic-text-muted);
  }

  .page__payload {
    width: 100%;
  }

  .page__payload-summary {
    font-size: 0.75rem;
    color: var(--st-semantic-text-secondary);
    cursor: pointer;
  }

  .page__payload-body {
    font-size: 0.75rem;
    white-space: pre-wrap;
    word-break: break-word;
    background: var(--st-semantic-background-subtle);
    padding: 0.5rem;
    border-radius: 0.25rem;
    margin: 0.25rem 0;
    overflow-x: auto;
  }

  .page__signature {
    font-size: 0.75rem;
    color: var(--st-semantic-text-muted);
    word-break: break-all;
  }

  .page__secret-reveal {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  .page__secret {
    display: block;
    font-family: monospace;
    font-size: 0.875rem;
    padding: 0.25rem 0;
    word-break: break-all;
  }
</style>
