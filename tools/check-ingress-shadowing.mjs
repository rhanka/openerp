import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

// The web and the API share one hostname, and the ingress splits them by path.
// Any SvelteKit server route sitting under a prefix the ingress hands to the
// API is therefore unreachable once deployed, while working perfectly on a
// developer machine where no ingress sits in front. That gap cost us a dead
// sign-out and a dead language switcher, neither of which any test could see.
//
// This gate fails when a web route is shadowed without an explicit rule
// rescuing it.

const INGRESS_FILE = "infra/k8s/base/ingress.yaml";
const ROUTES_DIR = "apps/web/src/routes";
const WEB_SERVICE = "openerp-web";
const API_SERVICE = "openerp-api";

// Routes deliberately left to the API. Each entry must say why.
const ACCEPTED_SHADOWING = new Map([
  [
    "/api/v1/auth",
    "The platform auth surface is owned by the ingress in deployed environments; " +
      "the SvelteKit pass-through is only the portable fallback for hosts without one. " +
      "See apps/web/src/routes/api/v1/auth/[...path]/+server.ts.",
  ],
]);

const rules = readIngressRules();
const webRoutes = collectWebRoutes();
const failures = [];

for (const route of webRoutes) {
  const shadow = shadowingRule(route.path);
  if (!shadow) continue;
  if (rescuedBy(route.path)) continue;

  const accepted = acceptedReason(route.path);
  if (accepted) continue;

  failures.push(
    `${route.path}\n` +
      `    served by ${relative(process.cwd(), route.file)}\n` +
      `    shadowed by ingress rule ${shadow.pathType} ${shadow.path} -> ${API_SERVICE}\n` +
      `    fix: add an Exact rule for ${route.path} -> ${WEB_SERVICE} in ${INGRESS_FILE},\n` +
      `         or record it in ACCEPTED_SHADOWING with the reason it stays on the API.`,
  );
}

if (failures.length > 0) {
  console.error(
    `${failures.length} web route(s) unreachable behind the ingress:\n\n` + failures.join("\n\n"),
  );
  process.exit(1);
}

console.log(
  `ingress shadowing: ${webRoutes.length} web route(s) checked, ` +
    `${ACCEPTED_SHADOWING.size} accepted exception(s), none unreachable`,
);

/**
 * Read the path entries without a YAML dependency, the way
 * check-auth-cutover-overlays.mjs does. Each entry is a `- path:` block up to
 * the next one, and carries its own pathType and backend service name.
 */
function readIngressRules() {
  const manifest = readFileSync(INGRESS_FILE, "utf8");
  const blocks = manifest.split(/^\s*- path:/m).slice(1);
  const parsed = blocks.map((block) => ({
    path: /^\s*(\S+)/.exec(block)?.[1] ?? null,
    pathType: /^\s*pathType:\s*(\S+)/m.exec(block)?.[1] ?? null,
    service: /^\s*name:\s*(\S+)/m.exec(block)?.[1] ?? null,
  }));

  const incomplete = parsed.filter((rule) => !rule.path || !rule.pathType || !rule.service);
  if (incomplete.length > 0) {
    throw new Error(`${INGRESS_FILE}: could not read path, pathType and backend for every rule`);
  }
  if (parsed.length === 0) throw new Error(`${INGRESS_FILE} declares no HTTP paths`);
  return parsed;
}

/** The most specific API-owned rule matching this path, if any. */
function shadowingRule(routePath) {
  return rules
    .filter((rule) => rule.service === API_SERVICE && matches(rule, routePath))
    .sort((a, b) => b.path.length - a.path.length)[0];
}

/** A web-owned rule at least as specific as the API rule wins the request. */
function rescuedBy(routePath) {
  const api = shadowingRule(routePath);
  if (!api) return true;
  return rules.some(
    (rule) => rule.service === WEB_SERVICE && matches(rule, routePath) && rule.path.length >= api.path.length,
  );
}

function acceptedReason(routePath) {
  for (const [prefix, reason] of ACCEPTED_SHADOWING) {
    if (routePath === prefix || routePath.startsWith(`${prefix}/`)) return reason;
  }
  return null;
}

function matches(rule, routePath) {
  if (rule.pathType === "Exact") return rule.path === routePath;
  // Prefix matches element-wise: /api covers /api and /api/locale, not /apiary.
  return routePath === rule.path || routePath.startsWith(rule.path.endsWith("/") ? rule.path : `${rule.path}/`);
}

function collectWebRoutes() {
  const found = [];
  walk(ROUTES_DIR, "");
  return found.sort((a, b) => a.path.localeCompare(b.path));

  function walk(directory, urlPath) {
    for (const entry of readdirSync(directory)) {
      const full = join(directory, entry);
      if (statSync(full).isDirectory()) {
        walk(full, urlPath + segmentToUrl(entry));
        continue;
      }
      if (entry === "+server.ts" || (entry === "+page.server.ts" && declaresActions(full))) {
        found.push({ file: full, path: urlPath || "/" });
      }
    }
  }
}

/**
 * Route groups vanish from the URL; a dynamic segment stands for anything, so
 * the guard treats the static part before it as the reachable path.
 */
function segmentToUrl(segment) {
  if (segment.startsWith("(") && segment.endsWith(")")) return "";
  if (segment.startsWith("[")) return "";
  return `/${segment}`;
}

/** Only form actions are reachable by a browser POST; loaders are not. */
function declaresActions(file) {
  return /export\s+const\s+actions\b/.test(readFileSync(file, "utf8"));
}
