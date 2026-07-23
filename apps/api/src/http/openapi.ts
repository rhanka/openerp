// OpenAPI 3.1 document builder for the OpenERP REST surface.
//
// Assembles the document from the existing route registries (source of truth).
// Per-entity request/response body schemas are v1 placeholders ({type:"object"});
// rich schemas and the MCP tool-schema endpoint (4-B) are deferred pending
// platform agent-protocol contract Q7.
//
// Security: bearerAuth = the verified session / agent JWT from integrations 0-A / 1-A.
// Public paths (/webauthn/* and /openapi.json) carry no security requirement.

import { buildApprovalRequestRoutes } from "./routes/approval-requests";
import { buildBillingRoutes } from "./routes/billing";
import { buildBankingRoutes } from "./routes/banking";
import { buildCrmRoutes } from "./routes/crm";
import type { RouteContract } from "./routes/foundation";
import { buildFoundationRoutes } from "./routes/foundation";
import { buildProjectRoutes } from "./routes/project";
import { buildReportingRoutes } from "./routes/reporting";
import { buildWebhookRoutes } from "./routes/webhook";
import { buildWorkflowRoutes } from "./routes/workflow";
import { ENTITY_SCHEMAS } from "./openapi-entity-schemas";

// ── Types ────────────────────────────────────────────────────────────────────

interface OpenApiInfo {
  title: string;
  version: string;
}

interface OpenApiServer {
  url: string;
  description?: string;
}

interface OpenApiTag {
  name: string;
  description?: string;
}

interface OpenApiSchemaObject {
  type?: string;
  $ref?: string;
  properties?: Record<string, unknown>;
  required?: string[];
  additionalProperties?: boolean;
  description?: string;
  allOf?: Array<Record<string, unknown>>;
}

interface OpenApiRequestBody {
  required: boolean;
  content: {
    "application/json": {
      schema: OpenApiSchemaObject;
    };
  };
}

interface OpenApiResponse {
  description: string;
  content?: {
    "application/json": {
      schema: OpenApiSchemaObject;
    };
  };
}

interface OpenApiParameter {
  name: string;
  in: "path" | "query";
  required: boolean;
  description?: string;
  schema: {
    type: "string" | "integer";
    enum?: readonly string[];
    minimum?: number;
    maximum?: number;
  };
}

interface OpenApiOperation {
  operationId: string;
  tags: string[];
  summary?: string;
  parameters?: OpenApiParameter[];
  requestBody?: OpenApiRequestBody;
  responses: Record<string, OpenApiResponse>;
  security?: Array<Record<string, string[]>>;
}

type PathItem = Partial<Record<"get" | "post" | "patch" | "delete", OpenApiOperation>>;

interface SecurityScheme {
  type: "http";
  scheme: "bearer";
  bearerFormat: "JWT";
}

interface OpenApiComponents {
  securitySchemes: {
    bearerAuth: SecurityScheme;
  };
  schemas: Record<string, OpenApiSchemaObject>;
}

export interface OpenApiDoc {
  openapi: "3.1.0";
  info: OpenApiInfo;
  servers: OpenApiServer[];
  tags: OpenApiTag[];
  paths: Record<string, PathItem>;
  components: OpenApiComponents;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Convert Hono path param syntax (:id, :widgetId) to OpenAPI syntax ({id}, {widgetId}).
 */
function honoPathToOpenApi(path: string): string {
  return path.replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, "{$1}");
}

/**
 * Derive a module tag name from a path prefix.
 * "/crm/companies" → "crm", "/auth/..." → "auth", "/me" → "foundation"
 */
function moduleTag(path: string): string {
  const segment = path.split("/").filter(Boolean)[0];
  if (!segment) return "foundation";
  const known: Record<string, string> = {
    crm: "crm",
    reporting: "reporting",
    workflows: "workflow",
    webhook: "webhook",
    billing: "billing",
    banking: "banking",
    project: "project",
    "approval-requests": "approval-requests",
    webauthn: "webauthn",
    auth: "auth"
  };
  return known[segment] ?? "foundation";
}

/** Paths that must NOT carry a security requirement (public/pre-auth). */
function isPublicPath(openApiPath: string): boolean {
  return openApiPath.startsWith("/webauthn/") || openApiPath === "/openapi.json";
}

/** Extract {paramName} segments from an already-converted OpenAPI path. */
function extractPathParams(openApiPath: string): OpenApiParameter[] {
  const matches = openApiPath.match(/\{([^}]+)\}/g) ?? [];
  return matches.map((m) => ({
    name: m.slice(1, -1),
    in: "path" as const,
    required: true as const,
    schema: { type: "string" as const }
  }));
}

/**
 * Sanitize a path for use as an operationId component:
 * "/crm/companies/{id}" → "crm_companies__id_"
 */
function sanitizeForOperationId(path: string): string {
  return path
    .replace(/^\//, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/**
 * Returns the map of entity name → JSON Schema for components.schemas.
 * Populated in OA-2..OA-5 sub-slices with concrete entity schemas from packages/domain.
 */
function getEntitySchemas(): Record<string, OpenApiSchemaObject> {
  return ENTITY_SCHEMAS;
}

// ── Module tag catalogue ─────────────────────────────────────────────────────

/** One tag entry per distinct module, in stable order. */
const MODULE_TAG_DESCRIPTIONS: ReadonlyArray<[string, string]> = [
  ["foundation", "Core platform — users, roles, permissions, audit, files, notifications, i18n"],
  ["auth", "Authentication — agent-token exchange"],
  ["approval-requests", "Approval workflow — create, list, decide"],
  ["crm", "CRM — companies, contacts, pipeline, opportunities, leads, quote-handoffs"],
  ["project", "Project management — projects, tasks, time-entries, rates, assignments, proposals"],
  ["billing", "Billing — invoices, payments, taxes, journal entries, recurring schedules"],
  ["banking", "Banking — imported normalized transactions and auditable reconciliation attestations"],
  ["reporting", "Reporting — saved views, report definitions, runs, dashboards, deliveries"],
  ["workflow", "Workflow automation — definitions, runs, catalog"],
  ["webhook", "Webhooks — endpoints, deliveries, event types"]
];

// ── Builder ──────────────────────────────────────────────────────────────────

/**
 * Collects all RouteContract[] from every route registry and emits a complete
 * OpenAPI 3.1 document.  Called at request time (cheap: pure data assembly).
 */
export function buildOpenApiDocument(): OpenApiDoc {
  // Aggregate all registries. ApprovalRouteContract extends RouteContract so it
  // is compatible.
  const allRoutes: RouteContract[] = [
    ...buildFoundationRoutes(),
    ...buildApprovalRequestRoutes(),
    ...buildCrmRoutes(),
    ...buildProjectRoutes(),
    ...buildBillingRoutes(),
    ...buildBankingRoutes(),
    ...buildReportingRoutes(),
    ...buildWorkflowRoutes(),
    ...buildWebhookRoutes(),
    // The GET /openapi.json endpoint itself: public, not audited.
    { method: "GET", path: "/openapi.json", audited: false }
  ];

  const pathsMap: Record<string, PathItem> = {};
  const seenTags = new Set<string>();

  for (const route of allRoutes) {
    const openApiPath = honoPathToOpenApi(route.path);
    const tag = moduleTag(openApiPath);
    seenTags.add(tag);

    const methodKey = route.method.toLowerCase() as "get" | "post" | "patch" | "delete";
    const operationId = `${methodKey}_${sanitizeForOperationId(openApiPath)}`;

    const pathParams = extractPathParams(openApiPath);
    const queryParams: OpenApiParameter[] = (route.queryParameters ?? []).map((parameter) => ({
      name: parameter.name,
      in: "query",
      required: false,
      ...(parameter.description ? { description: parameter.description } : {}),
      schema: parameter.schema
    }));
    const parameters = [...pathParams, ...queryParams];

    // Determine security:
    // - public paths → no security requirement
    // - everything else → bearerAuth (even un-audited reads need a valid session)
    const security: Array<Record<string, string[]>> | undefined = isPublicPath(openApiPath)
      ? []
      : [{ bearerAuth: [] }];

    // Schema refs: use $ref if the route declares a schema name, else fall back to placeholder.
    const requestSchema: OpenApiSchemaObject = route.requestSchema
      ? { $ref: `#/components/schemas/${route.requestSchema}` }
      : { type: "object" as const };

    const responseSchema: OpenApiSchemaObject = route.responseSchema
      ? { $ref: `#/components/schemas/${route.responseSchema}` }
      : { type: "object" as const };

    // Responses: most POSTs create a resource, while declared transition routes return 200.
    const responses: Record<string, OpenApiResponse> = {};
    const successStatus = route.successStatus ?? (route.method === "POST" ? 201 : 200);
    responses[String(successStatus)] = {
      description: successStatus === 201 ? "Created" : successStatus === 204 ? "No content" : "OK",
      ...(successStatus === 204 ? {} : { content: { "application/json": { schema: responseSchema } } })
    };
    responses["400"] = { description: "Bad request" };
    if (!isPublicPath(openApiPath)) {
      responses["401"] = { description: "Unauthorized — missing or invalid bearer token" };
    }
    if (pathParams.length > 0) {
      responses["404"] = { description: "Resource not found" };
    }
    for (const status of route.errorStatuses ?? []) {
      if (responses[String(status)]) continue;
      const descriptions: Record<number, string> = {
        400: "Bad request",
        401: "Unauthorized — missing or invalid bearer token",
        403: "Forbidden",
        404: "Resource not found",
        409: "Conflict — illegal state transition"
      };
      responses[String(status)] = { description: descriptions[status] ?? "Error" };
    }

    const operation: OpenApiOperation = {
      operationId,
      tags: [tag],
      ...(parameters.length > 0 ? { parameters } : {}),
      ...(route.hasRequestBody ?? ["POST", "PATCH"].includes(route.method)
        ? {
            requestBody: {
              required: true,
              content: {
                "application/json": {
                  schema: requestSchema
                }
              }
            }
          }
        : {}),
      responses,
      security
    };

    if (!pathsMap[openApiPath]) {
      pathsMap[openApiPath] = {};
    }
    (pathsMap[openApiPath] as Record<string, OpenApiOperation>)[methodKey] = operation;
  }

  // Build ordered tags list: only include tags that appear in the routes.
  const tags: OpenApiTag[] = MODULE_TAG_DESCRIPTIONS.filter(([name]) => seenTags.has(name)).map(
    ([name, description]) => ({ name, description })
  );

  return {
    openapi: "3.1.0",
    info: {
      title: "OpenERP API",
      version: "1.0.0"
    },
    servers: [
      {
        url: "/",
        description: "OpenERP API server"
      }
    ],
    tags,
    paths: pathsMap,
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT"
        }
      },
      schemas: getEntitySchemas()
    }
  };
}
