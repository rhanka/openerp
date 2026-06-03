/**
 * Canvas view-context store — integration 2-A.
 *
 * Tracks WHAT the user is currently viewing as
 *   { route, resourceType, resourceId }
 * and exposes a browser-only read accessor at window.__openerpCanvasContext
 * so a future embedded Sentropic chat can read the current context.
 *
 * The transport bridge to the chat (epic 2-B) is deferred pending the
 * platform canvas-protocol contract. Do NOT add postMessage or any bridge here.
 */

import { writable, get } from "svelte/store";

export interface CanvasContext {
  route: string;
  resourceType: string | null;
  resourceId: string | null;
}

// ---------------------------------------------------------------------------
// Route → resourceType mapping table.
// Entries with hasId: true use the next path segment after `prefix` as the ID.
// ---------------------------------------------------------------------------

interface RouteRule {
  /** Prefix to match (without trailing slash). */
  prefix: string;
  resourceType: string;
  /** True when the next path segment after `prefix` is a resource ID. */
  hasId: boolean;
}

const ROUTE_RULES: RouteRule[] = [
  // Reporting
  { prefix: "/admin/reporting/dashboards", resourceType: "reporting.dashboard", hasId: true },
  { prefix: "/admin/reporting/report-definitions", resourceType: "reporting.report_definition", hasId: true },
  { prefix: "/admin/reporting/saved-views", resourceType: "reporting.saved_view", hasId: true },
  { prefix: "/admin/reporting/scheduled-deliveries", resourceType: "reporting.scheduled_delivery", hasId: true },
  { prefix: "/admin/reporting/workflows", resourceType: "workflow.workflow_definition", hasId: true },
  { prefix: "/admin/reporting/webhooks", resourceType: "webhook.webhook_endpoint", hasId: true },

  // CRM
  { prefix: "/admin/crm/companies", resourceType: "crm.company", hasId: true },
  { prefix: "/admin/crm/contacts", resourceType: "crm.contact", hasId: true },
  { prefix: "/admin/crm/leads", resourceType: "crm.lead", hasId: true },
  { prefix: "/admin/crm/opportunities", resourceType: "crm.opportunity", hasId: true },

  // Project
  { prefix: "/admin/project/projects", resourceType: "project.project", hasId: true },
  { prefix: "/admin/project/rates", resourceType: "project.rate", hasId: false },

  // Billing
  { prefix: "/admin/billing/invoices", resourceType: "billing.invoice", hasId: true },
  { prefix: "/admin/billing/taxes", resourceType: "billing.tax", hasId: false },
  { prefix: "/admin/billing/accounting", resourceType: "billing.account", hasId: false },

  // Admin flat pages
  { prefix: "/admin/users", resourceType: "admin.user", hasId: false },
  { prefix: "/admin/roles", resourceType: "admin.role", hasId: false },
  { prefix: "/admin/approvals", resourceType: "admin.approval", hasId: false },
  { prefix: "/admin/audit", resourceType: "admin.audit", hasId: false },
  { prefix: "/admin/settings", resourceType: "admin.settings", hasId: false },
];

/**
 * Pure function — maps a pathname to its canvas context.
 * All unknown / non-admin routes resolve to resourceType: null, resourceId: null.
 */
export function deriveCanvasContext(pathname: string): CanvasContext {
  // Normalise: strip trailing slash (except root "/")
  const path = pathname.length > 1 ? pathname.replace(/\/$/, "") : pathname;

  for (const rule of ROUTE_RULES) {
    if (path === rule.prefix || path.startsWith(rule.prefix + "/")) {
      let resourceId: string | null = null;

      if (rule.hasId && path.length > rule.prefix.length) {
        // The segment immediately after the prefix is the resourceId.
        const rest = path.slice(rule.prefix.length + 1); // skip the leading "/"
        const segment = rest.split("/")[0];
        if (segment && segment.length > 0) {
          resourceId = segment;
        }
      }

      return { route: path, resourceType: rule.resourceType, resourceId };
    }
  }

  return { route: path, resourceType: null, resourceId: null };
}

// ---------------------------------------------------------------------------
// Reactive holder — Svelte writable store.
// Works in both SSR and browser; Svelte 5 components can use $canvasContext.
// ---------------------------------------------------------------------------

export const canvasContext = writable<CanvasContext>({
  route: "/",
  resourceType: null,
  resourceId: null,
});

/**
 * Update canvasContext and keep the browser-side window accessor in sync.
 * Call from +layout.svelte whenever the pathname changes.
 * Safe to call on the server (window guard prevents SSR errors).
 */
export function setCanvasContext(pathname: string): void {
  const next = deriveCanvasContext(pathname);
  canvasContext.set(next);
  syncWindowAccessor(next);
}

/**
 * Sync the current canvas context snapshot to window.__openerpCanvasContext.
 * Browser-only; no-ops on the server.
 */
function syncWindowAccessor(ctx: CanvasContext): void {
  if (typeof window === "undefined") return;
  (window as unknown as Record<string, unknown>).__openerpCanvasContext = {
    route: ctx.route,
    resourceType: ctx.resourceType,
    resourceId: ctx.resourceId,
  };
}

/**
 * Install the window.__openerpCanvasContext initial value (browser-only).
 * Must be called once from the layout after hydration so the accessor is
 * available even before the first navigation-triggered setCanvasContext call.
 * A future embedded Sentropic chat reads this property to know what the user
 * is viewing. The transport bridge (epic 2-B) is deferred — do NOT add
 * postMessage or other transport here.
 */
export function installWindowAccessor(): void {
  if (typeof window === "undefined") return;
  syncWindowAccessor(get(canvasContext));
}
