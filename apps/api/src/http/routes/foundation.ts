export interface RouteQueryParameter {
  name: string;
  description?: string;
  schema: {
    type: "string" | "integer";
    enum?: readonly string[];
    minimum?: number;
    maximum?: number;
  };
}

export interface RouteContract {
  method: "GET" | "POST" | "PATCH" | "DELETE";
  path: string;
  audited: boolean;
  /** $ref name (without '#/components/schemas/') for the request body. POST/PATCH only. */
  requestSchema?: string;
  /** $ref name for the 200/201 response body. */
  responseSchema?: string;
  /** False for bodyless POST transitions; defaults preserve existing registry behaviour. */
  hasRequestBody?: boolean;
  /** Additional runtime error statuses beyond the common 400/401/path-404 set. */
  errorStatuses?: readonly (400 | 401 | 403 | 404 | 409)[];
  /** Use for state transitions or idempotent POSTs that return 200 rather than creation semantics. */
  successStatus?: 200 | 201 | 204;
  /** Runtime query parameters explicitly exposed by this route. */
  queryParameters?: readonly RouteQueryParameter[];
}

export function buildFoundationRoutes(): RouteContract[] {
  return [
    { method: "GET", path: "/me", audited: false, responseSchema: "User" },
    {
      method: "GET",
      path: "/organizations/current",
      audited: false,
      responseSchema: "Organization"
    },
    { method: "PATCH", path: "/organizations/current/settings", audited: true },
    { method: "GET", path: "/users", audited: false, responseSchema: "User" },
    { method: "POST", path: "/users/invitations", audited: true },
    { method: "PATCH", path: "/users/:id", audited: true, responseSchema: "User" },
    { method: "GET", path: "/roles", audited: false, responseSchema: "Role" },
    { method: "POST", path: "/roles", audited: true, responseSchema: "Role" },
    { method: "PATCH", path: "/roles/:id", audited: true, responseSchema: "Role" },
    {
      method: "GET",
      path: "/permissions/effective",
      audited: false,
      responseSchema: "PermissionGrant"
    },
    { method: "GET", path: "/audit-events", audited: false, responseSchema: "AuditEvent" },
    { method: "POST", path: "/files", audited: true, responseSchema: "FileObject" },
    { method: "GET", path: "/files/:id", audited: false, responseSchema: "FileObject" },
    { method: "POST", path: "/comments", audited: false, responseSchema: "Comment" },
    { method: "GET", path: "/notifications", audited: false, responseSchema: "Notification" },
    {
      method: "PATCH",
      path: "/notifications/:id",
      audited: false,
      responseSchema: "Notification"
    },
    { method: "GET", path: "/i18n/catalog", audited: false },
    { method: "GET", path: "/system/update-state", audited: false },
    { method: "POST", path: "/auth/exchange-agent-token", audited: true }
  ];
}
