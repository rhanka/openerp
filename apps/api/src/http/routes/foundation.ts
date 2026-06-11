export interface RouteContract {
  method: "GET" | "POST" | "PATCH" | "DELETE";
  path: string;
  audited: boolean;
  /** $ref name (without '#/components/schemas/') for the request body. POST/PATCH only. */
  requestSchema?: string;
  /** $ref name for the 200/201 response body. */
  responseSchema?: string;
}

export function buildFoundationRoutes(): RouteContract[] {
  return [
    { method: "GET", path: "/me", audited: false },
    { method: "GET", path: "/organizations/current", audited: false },
    { method: "PATCH", path: "/organizations/current/settings", audited: true },
    { method: "GET", path: "/users", audited: false },
    { method: "POST", path: "/users/invitations", audited: true },
    { method: "PATCH", path: "/users/:id", audited: true },
    { method: "GET", path: "/roles", audited: false },
    { method: "POST", path: "/roles", audited: true },
    { method: "PATCH", path: "/roles/:id", audited: true },
    { method: "GET", path: "/permissions/effective", audited: false },
    { method: "GET", path: "/audit-events", audited: false },
    { method: "POST", path: "/files", audited: true },
    { method: "GET", path: "/files/:id", audited: false },
    { method: "POST", path: "/comments", audited: false },
    { method: "GET", path: "/notifications", audited: false },
    { method: "PATCH", path: "/notifications/:id", audited: false },
    { method: "GET", path: "/i18n/catalog", audited: false },
    { method: "GET", path: "/system/update-state", audited: false },
    { method: "POST", path: "/auth/exchange-agent-token", audited: true }
  ];
}
