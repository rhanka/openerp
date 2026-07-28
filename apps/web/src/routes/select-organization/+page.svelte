<script lang="ts">
  import { goto } from "$app/navigation";
  import { onMount } from "svelte";
  import { page } from "$app/state";
  import { Alert, Button, Card, Container, RadioGroup, Stack, Typography } from "@sentropic/design-system-svelte";

  import { safeRelativeReturnUrl } from "$lib/auth-transport";
  import { t, type LocaleCode } from "$lib/i18n";

  interface Membership {
    organizationId: string;
    preferredLocale: string | null;
  }

  const locale: LocaleCode = $derived(page.data.locale as LocaleCode);
  const returnUrl = $derived(safeRelativeReturnUrl(page.url.searchParams.get("returnUrl")));

  let memberships = $state<Membership[]>([]);
  let selectedOrganizationId = $state("");
  let loading = $state(true);
  let submitting = $state(false);
  let error = $state("");

  onMount(() => {
    if (page.data.platformAuthUiEnabled !== true) {
      void goto("/login");
      return;
    }
    void loadMemberships();
  });

  async function loadMemberships(): Promise<void> {
    try {
      const response = await fetch("/api/v1/auth/tenant/select", {
        credentials: "include",
        headers: { "x-app-locale": locale },
      });
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok || !isMembershipResponse(body)) {
        error = t(locale, "organizationSelection.unavailable");
        return;
      }
      memberships = body.memberships;
      if (memberships.length === 0) error = t(locale, "organizationSelection.unavailable");
    } catch {
      error = t(locale, "organizationSelection.unavailable");
    } finally {
      loading = false;
    }
  }

  async function selectOrganization(): Promise<void> {
    if (!selectedOrganizationId || submitting) return;
    submitting = true;
    error = "";
    try {
      const response = await fetch("/api/v1/auth/tenant/select", {
        body: JSON.stringify({ organizationId: selectedOrganizationId }),
        credentials: "include",
        headers: { "content-type": "application/json", "x-app-locale": locale },
        method: "POST",
      });
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        error = t(locale, "organizationSelection.unavailable");
        return;
      }
      // Selecting the tenant is what finally issues the application session,
      // so the shell must reload its server data rather than keep the
      // sessionless state this page was rendered with.
      await goto(returnUrl, { invalidateAll: true });
    } catch {
      error = t(locale, "organizationSelection.unavailable");
    } finally {
      submitting = false;
    }
  }

  function isMembershipResponse(value: unknown): value is { memberships: Membership[] } {
    return Boolean(
      value &&
        typeof value === "object" &&
        Array.isArray((value as { memberships?: unknown }).memberships) &&
        (value as { memberships: unknown[] }).memberships.every(
          (membership) =>
            membership &&
            typeof membership === "object" &&
            typeof (membership as { organizationId?: unknown }).organizationId === "string",
        ),
    );
  }

</script>

<Container size="sm" as="section">
  <Stack gap={6}>
    <header>
      <Typography variant="h1">{t(locale, "organizationSelection.title")}</Typography>
      <Typography variant="body" tone="muted">{t(locale, "organizationSelection.lede")}</Typography>
    </header>

    <Card>
      {#if loading}
        <Typography variant="body" tone="muted">{t(locale, "organizationSelection.loading")}</Typography>
      {:else if error}
        <Alert tone="error" title={t(locale, "organizationSelection.error")} message={error}>
          <a href="/login">{t(locale, "auth.signIn")}</a>
        </Alert>
      {:else}
        <RadioGroup
          legend={t(locale, "organizationSelection.legend")}
          name="organization"
          options={memberships.map((membership) => ({
            label: membership.organizationId,
            value: membership.organizationId,
          }))}
          value={selectedOrganizationId}
          onchange={(value) => (selectedOrganizationId = value)}
        />
        <Button type="button" variant="primary" disabled={submitting || !selectedOrganizationId} onclick={selectOrganization}>
          {t(locale, "organizationSelection.continue")}
        </Button>
      {/if}
    </Card>
  </Stack>
</Container>
