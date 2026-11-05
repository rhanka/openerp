import { env } from "$env/dynamic/private";
import { fail, type Actions } from "@sveltejs/kit";

import type {
  BankTransaction,
  BankTransactionReconciliationStatus,
  ReconciliationLink
} from "@sentropic/openerp-domain/banking";
import type { Payment } from "@sentropic/openerp-domain/billing";

import { createApiClient, type ApiError } from "$lib/api/client";

import type { PageServerLoad } from "./$types";

const PAGE_LIMIT = 25;
const WORKLIST_STATUSES = new Set<BankTransactionReconciliationStatus>([
  "unmatched",
  "matched",
  "ignored"
]);
const BANKING_ERROR_CODES = new Set(["INVALID_JSON", "INVALID_INPUT", "NOT_FOUND", "CONFLICT"]);

type WorklistSuggestion = {
  link: ReconciliationLink;
  payment: Payment;
};

const DEMO_TRANSACTIONS: BankTransaction[] = [
  {
    id: "demo-bank-unmatched-proposal",
    organizationId: "demo-org",
    bankAccountId: "demo-bank-account",
    provider: "ofx",
    providerTransactionRef: "demo-bank-001",
    postedAt: "2026-07-24T00:00:00.000Z",
    amount: { amountMinor: 125000, currency: "CAD", scale: 2 },
    rawDescription: "Northwind payment REF-120",
    normalizedSnapshot: {
      sourceId: "demo-bank-001",
      providerRef: "demo-bank-001",
      postedAt: "2026-07-24T00:00:00.000Z",
      amount: { amountMinor: 125000, currency: "CAD", scale: 2 },
      description: "Northwind payment REF-120"
    },
    reconciliationStatus: "unmatched",
    createdAt: "2026-07-24T00:00:00.000Z",
    updatedAt: "2026-07-24T00:00:00.000Z"
  },
  {
    id: "demo-bank-unmatched-open",
    organizationId: "demo-org",
    bankAccountId: "demo-bank-account",
    provider: "ofx",
    providerTransactionRef: "demo-bank-002",
    postedAt: "2026-07-23T00:00:00.000Z",
    amount: { amountMinor: -5900, currency: "CAD", scale: 2 },
    rawDescription: "Office subscription",
    normalizedSnapshot: {
      sourceId: "demo-bank-002",
      providerRef: "demo-bank-002",
      postedAt: "2026-07-23T00:00:00.000Z",
      amount: { amountMinor: -5900, currency: "CAD", scale: 2 },
      description: "Office subscription"
    },
    reconciliationStatus: "unmatched",
    createdAt: "2026-07-23T00:00:00.000Z",
    updatedAt: "2026-07-23T00:00:00.000Z"
  },
  {
    id: "demo-bank-matched",
    organizationId: "demo-org",
    bankAccountId: "demo-bank-account",
    provider: "ofx",
    providerTransactionRef: "demo-bank-003",
    postedAt: "2026-07-22T00:00:00.000Z",
    amount: { amountMinor: 74000, currency: "CAD", scale: 2 },
    rawDescription: "Apex payment PX-004",
    normalizedSnapshot: {
      sourceId: "demo-bank-003",
      providerRef: "demo-bank-003",
      postedAt: "2026-07-22T00:00:00.000Z",
      amount: { amountMinor: 74000, currency: "CAD", scale: 2 },
      description: "Apex payment PX-004"
    },
    reconciliationStatus: "matched",
    createdAt: "2026-07-22T00:00:00.000Z",
    updatedAt: "2026-07-22T00:00:00.000Z"
  },
  {
    id: "demo-bank-ignored",
    organizationId: "demo-org",
    bankAccountId: "demo-bank-account",
    provider: "ofx",
    providerTransactionRef: "demo-bank-004",
    postedAt: "2026-07-21T00:00:00.000Z",
    amount: { amountMinor: -2200, currency: "CAD", scale: 2 },
    rawDescription: "Bank service charge",
    normalizedSnapshot: {
      sourceId: "demo-bank-004",
      providerRef: "demo-bank-004",
      postedAt: "2026-07-21T00:00:00.000Z",
      amount: { amountMinor: -2200, currency: "CAD", scale: 2 },
      description: "Bank service charge"
    },
    reconciliationStatus: "ignored",
    createdAt: "2026-07-21T00:00:00.000Z",
    updatedAt: "2026-07-21T00:00:00.000Z"
  }
];

const DEMO_PAYMENTS: Record<string, Payment> = {
  "demo-payment-northwind": {
    id: "demo-payment-northwind",
    organizationId: "demo-org",
    invoiceId: "demo-invoice-northwind",
    companyId: "demo-company-northwind",
    amount: { amountMinor: 125000, currency: "CAD", scale: 2 },
    paymentDate: "2026-07-24",
    method: "bank_transfer",
    reference: "REF-120",
    createdAt: "2026-07-24T00:00:00.000Z",
    updatedAt: "2026-07-24T00:00:00.000Z"
  },
  "demo-payment-apex": {
    id: "demo-payment-apex",
    organizationId: "demo-org",
    invoiceId: "demo-invoice-apex",
    companyId: "demo-company-apex",
    amount: { amountMinor: 74000, currency: "CAD", scale: 2 },
    paymentDate: "2026-07-21",
    method: "bank_transfer",
    reference: "PX-004",
    createdAt: "2026-07-21T00:00:00.000Z",
    updatedAt: "2026-07-21T00:00:00.000Z"
  }
};

const DEMO_LINKS: ReconciliationLink[] = [
  {
    id: "demo-link-northwind",
    organizationId: "demo-org",
    bankTransactionId: "demo-bank-unmatched-proposal",
    candidateKind: "payment",
    candidateId: "demo-payment-northwind",
    score: 1,
    reasons: ["amount+currency exact", "same date", "reference/description overlap"],
    status: "proposed",
    createdAt: "2026-07-24T00:00:00.000Z",
    updatedAt: "2026-07-24T00:00:00.000Z"
  },
  {
    id: "demo-link-apex",
    organizationId: "demo-org",
    bankTransactionId: "demo-bank-matched",
    candidateKind: "payment",
    candidateId: "demo-payment-apex",
    score: 0.95,
    reasons: ["amount+currency exact", "date within 1d", "reference/description overlap"],
    status: "confirmed",
    createdAt: "2026-07-22T00:00:00.000Z",
    updatedAt: "2026-07-22T00:00:00.000Z"
  }
];

function clientFromLocalsOrEnv(
  fetchImpl: typeof fetch,
  locals: App.Locals
): { client: ReturnType<typeof createApiClient> } | null {
  const baseUrl = env.OPENERP_API_URL ?? "http://127.0.0.1:4000";
  const token = locals.session?.token;
  if (token) {
    return { client: createApiClient({ baseUrl, token, fetch: fetchImpl as typeof globalThis.fetch }) };
  }
  const organizationId = env.OPENERP_DEV_ORG_ID ?? "";
  const actorUserId = env.OPENERP_DEV_USER_ID ?? "";
  if (!organizationId || !actorUserId) return null;
  return {
    client: createApiClient({
      baseUrl,
      organizationId,
      actorUserId,
      fetch: fetchImpl as typeof globalThis.fetch
    })
  };
}

function worklistStatus(value: string | null): BankTransactionReconciliationStatus {
  return value !== null && WORKLIST_STATUSES.has(value as BankTransactionReconciliationStatus)
    ? value as BankTransactionReconciliationStatus
    : "unmatched";
}

function worklistOffset(value: string | null): number {
  if (!value || !/^(?:0|[1-9]\d*)$/.test(value)) return 0;
  const offset = Number(value);
  return Number.isSafeInteger(offset) ? offset : 0;
}

function demoSuggestions(status: BankTransactionReconciliationStatus): WorklistSuggestion[] {
  const expectedLinkStatus = status === "matched" ? "confirmed" : "proposed";
  if (status === "ignored") return [];
  return DEMO_LINKS
    .filter((link) => link.status === expectedLinkStatus)
    .map((link) => ({ link, payment: DEMO_PAYMENTS[link.candidateId]! }));
}

function actionFailure(action: string, error: unknown) {
  const apiError = error as Partial<ApiError>;
  if (
    (apiError.status === 400 || apiError.status === 404 || apiError.status === 409)
    && apiError.code
    && BANKING_ERROR_CODES.has(apiError.code)
  ) {
    return fail(apiError.status, { code: apiError.code, action });
  }
  return fail(502, { code: "API_ERROR", action });
}

function actionSession(fetchImpl: typeof fetch, locals: App.Locals, action: string) {
  const session = clientFromLocalsOrEnv(fetchImpl, locals);
  return session ?? fail(503, { code: "DEMO_MODE_NO_API", action });
}

function formValue(form: FormData, name: string): string {
  return String(form.get(name) ?? "").trim();
}

export const load: PageServerLoad = async ({ fetch, locals, url }) => {
  const status = worklistStatus(url.searchParams.get("status"));
  const offset = worklistOffset(url.searchParams.get("offset"));
  const session = clientFromLocalsOrEnv(fetch, locals);

  if (!session) {
    return {
      transactions: DEMO_TRANSACTIONS.filter((transaction) => transaction.reconciliationStatus === status),
      suggestions: demoSuggestions(status),
      status,
      limit: PAGE_LIMIT,
      offset,
      hasAnyTransactions: true,
      hasHandledTransactions: true,
      source: "demo" as const,
      locale: locals.locale
    };
  }

  try {
    const suggestionStatus = status === "matched" ? "confirmed" : "proposed";
    const [transactions, suggestions, unmatchedProbe, matchedProbe, ignoredProbe] = await Promise.all([
      session.client.listBankTransactions({ status, limit: PAGE_LIMIT, offset }),
      status === "ignored"
        ? Promise.resolve([] as ReconciliationLink[])
        : session.client.listReconciliationSuggestions(suggestionStatus),
      session.client.listBankTransactions({ status: "unmatched", limit: 1 }),
      session.client.listBankTransactions({ status: "matched", limit: 1 }),
      session.client.listBankTransactions({ status: "ignored", limit: 1 })
    ]);
    const visibleTransactionIds = new Set(transactions.map((transaction) => transaction.id));
    const visibleSuggestions = suggestions.filter((suggestion) => visibleTransactionIds.has(suggestion.bankTransactionId));
    const suggestionDetails = await Promise.all(visibleSuggestions.map(async (link) => ({
      link,
      payment: await session.client.getPayment(link.candidateId)
    })));
    return {
      transactions,
      suggestions: suggestionDetails,
      status,
      limit: PAGE_LIMIT,
      offset,
      hasAnyTransactions: [unmatchedProbe, matchedProbe, ignoredProbe].some((items) => items.length > 0),
      hasHandledTransactions: matchedProbe.length > 0 || ignoredProbe.length > 0,
      source: "api" as const,
      locale: locals.locale
    };
  } catch {
    return {
      transactions: [] as BankTransaction[],
      suggestions: [] as WorklistSuggestion[],
      status,
      limit: PAGE_LIMIT,
      offset,
      hasAnyTransactions: false,
      hasHandledTransactions: false,
      source: "error" as const,
      locale: locals.locale
    };
  }
};

export const actions: Actions = {
  refresh: async ({ fetch, locals }) => {
    const session = actionSession(fetch, locals, "refresh");
    if ("status" in session) return session;
    try {
      await session.client.refreshReconciliationSuggestions();
      return { ok: true as const, action: "refresh" };
    } catch (error) {
      return actionFailure("refresh", error);
    }
  },

  confirm: async ({ request, fetch, locals }) => {
    const form = await request.formData();
    const linkId = formValue(form, "linkId");
    if (!linkId) return fail(400, { code: "INVALID_INPUT", action: "confirm" });
    const session = actionSession(fetch, locals, "confirm");
    if ("status" in session) return session;
    try {
      await session.client.confirmReconciliation(linkId);
      return { ok: true as const, action: "confirm", focusId: formValue(form, "transactionId") };
    } catch (error) {
      return actionFailure("confirm", error);
    }
  },

  reject: async ({ request, fetch, locals }) => {
    const form = await request.formData();
    const linkId = formValue(form, "linkId");
    if (!linkId) return fail(400, { code: "INVALID_INPUT", action: "reject" });
    const session = actionSession(fetch, locals, "reject");
    if ("status" in session) return session;
    try {
      await session.client.rejectReconciliation(linkId);
      return { ok: true as const, action: "reject", focusId: formValue(form, "transactionId") };
    } catch (error) {
      return actionFailure("reject", error);
    }
  },

  unmatch: async ({ request, fetch, locals }) => {
    const form = await request.formData();
    const linkId = formValue(form, "linkId");
    if (!linkId) return fail(400, { code: "INVALID_INPUT", action: "unmatch" });
    const session = actionSession(fetch, locals, "unmatch");
    if ("status" in session) return session;
    try {
      await session.client.unmatchReconciliation(linkId);
      return { ok: true as const, action: "unmatch", focusId: formValue(form, "transactionId") };
    } catch (error) {
      return actionFailure("unmatch", error);
    }
  },

  ignore: async ({ request, fetch, locals }) => {
    const form = await request.formData();
    const transactionId = formValue(form, "transactionId");
    if (!transactionId) return fail(400, { code: "INVALID_INPUT", action: "ignore" });
    const session = actionSession(fetch, locals, "ignore");
    if ("status" in session) return session;
    try {
      await session.client.ignoreBankTransaction(transactionId);
      return { ok: true as const, action: "ignore", focusId: transactionId };
    } catch (error) {
      return actionFailure("ignore", error);
    }
  },

  unignore: async ({ request, fetch, locals }) => {
    const form = await request.formData();
    const transactionId = formValue(form, "transactionId");
    if (!transactionId) return fail(400, { code: "INVALID_INPUT", action: "unignore" });
    const session = actionSession(fetch, locals, "unignore");
    if ("status" in session) return session;
    try {
      await session.client.unignoreBankTransaction(transactionId);
      return { ok: true as const, action: "unignore", focusId: transactionId };
    } catch (error) {
      return actionFailure("unignore", error);
    }
  }
};
