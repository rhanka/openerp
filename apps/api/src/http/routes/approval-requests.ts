import type { RouteContract } from "./foundation";

export interface ApprovalRouteContract extends RouteContract {
  requiresIdempotency?: boolean;
}

export function buildApprovalRequestRoutes(): ApprovalRouteContract[] {
  return [
    {
      method: "POST",
      path: "/approval-requests",
      audited: true,
      requiresIdempotency: true,
      responseSchema: "ApprovalRequest"
    },
    {
      method: "GET",
      path: "/approval-requests",
      audited: false,
      responseSchema: "ApprovalRequest"
    },
    {
      method: "GET",
      path: "/approval-requests/:id",
      audited: false,
      responseSchema: "ApprovalRequest"
    },
    {
      method: "PATCH",
      path: "/approval-requests/:id/decide",
      audited: true,
      requiresIdempotency: true,
      responseSchema: "ApprovalRequest"
    }
  ];
}
