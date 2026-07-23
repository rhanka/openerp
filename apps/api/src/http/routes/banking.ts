import type { RouteContract } from "./foundation";

/** D9 reconciliation persistence registry. Suggestions are stored proposals; refresh is explicit. */
export function buildBankingRoutes(): RouteContract[] {
  return [
    {
      method: "POST",
      path: "/banking/import",
      audited: true,
      requestSchema: "BankingImportInput",
      responseSchema: "BankingImportResult",
      errorStatuses: [409],
      successStatus: 200
    },
    {
      method: "GET",
      path: "/banking/transactions",
      audited: false,
      responseSchema: "BankTransactionList",
      queryParameters: [
        {
          name: "status",
          description: "Filter by the durable reconciliation state.",
          schema: { type: "string", enum: ["unmatched", "matched", "ignored"] }
        },
        {
          name: "limit",
          description: "Maximum number of records to return (capped at 200).",
          schema: { type: "integer", minimum: 1, maximum: 200 }
        },
        {
          name: "offset",
          description: "Number of records to skip.",
          schema: { type: "integer", minimum: 0 }
        }
      ]
    },
    {
      method: "GET",
      path: "/banking/reconciliation/suggestions",
      audited: false,
      responseSchema: "ReconciliationSuggestionList"
    },
    {
      method: "POST",
      path: "/banking/reconciliation/refresh",
      audited: true,
      responseSchema: "BankingRefreshResult",
      hasRequestBody: false,
      errorStatuses: [409],
      successStatus: 200
    },
    {
      method: "POST",
      path: "/banking/reconciliation/:linkId/confirm",
      audited: true,
      responseSchema: "ReconciliationLink",
      hasRequestBody: false,
      errorStatuses: [409],
      successStatus: 200
    },
    {
      method: "POST",
      path: "/banking/reconciliation/:linkId/reject",
      audited: true,
      responseSchema: "ReconciliationLink",
      hasRequestBody: false,
      errorStatuses: [409],
      successStatus: 200
    },
    {
      method: "POST",
      path: "/banking/reconciliation/:linkId/unmatch",
      audited: true,
      responseSchema: "ReconciliationLink",
      hasRequestBody: false,
      errorStatuses: [409],
      successStatus: 200
    },
    {
      method: "POST",
      path: "/banking/transactions/:id/ignore",
      audited: true,
      responseSchema: "BankTransaction",
      hasRequestBody: false,
      errorStatuses: [409],
      successStatus: 200
    }
  ];
}
