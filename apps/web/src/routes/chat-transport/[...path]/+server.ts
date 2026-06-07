/**
 * Chat transport proxy — integration 3-B.
 *
 * Transparent streaming passthrough to the configured OPENERP_CHAT_ENDPOINT.
 * Injects the session bearer token server-side (never exposed to client JS).
 * Returns unbuffered upstream body so EventSource / SSE works end-to-end.
 */

import { env } from "$env/dynamic/private";
import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

const PROXIED_METHODS = new Set(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]);

// Headers from the upstream response that we forward downstream.
const FORWARD_RESPONSE_HEADERS = [
  "content-type",
  "cache-control",
  "x-request-id",
  "x-run-id",
];

export const fallback: RequestHandler = async ({ request, params, locals }) => {
  const endpoint = env.OPENERP_CHAT_ENDPOINT;
  if (!endpoint) {
    return json({ code: "CHAT_ENDPOINT_NOT_CONFIGURED" }, { status: 503 });
  }

  const method = request.method.toUpperCase();
  if (!PROXIED_METHODS.has(method)) {
    return json({ code: "METHOD_NOT_ALLOWED" }, { status: 405 });
  }

  // Build the upstream URL: endpoint (absolute) + path from [...path] param.
  const subPath: string = (params as Record<string, string>).path ?? "";
  const upstreamUrl = subPath
    ? `${endpoint.replace(/\/$/, "")}/${subPath}`
    : endpoint;

  // Forward relevant client-sent headers (content-type, accept, etc.)
  // but strip hop-by-hop and sensitive headers.
  const forwardHeaders: Record<string, string> = {};
  for (const [k, v] of request.headers.entries()) {
    const lower = k.toLowerCase();
    if (
      lower === "content-type" ||
      lower === "accept" ||
      lower === "x-request-id" ||
      lower.startsWith("x-sentropic-")
    ) {
      forwardHeaders[k] = v;
    }
  }

  // Inject server-side bearer token.
  const token = locals.session?.token;
  if (token) {
    forwardHeaders["Authorization"] = `Bearer ${token}`;
  }

  // Forward body only for methods that carry one.
  const hasBody = method !== "GET" && method !== "HEAD" && method !== "OPTIONS";

  let upstream: Response;
  try {
    upstream = await fetch(upstreamUrl, {
      method,
      headers: forwardHeaders,
      body: hasBody ? request.body : undefined,
      // @ts-expect-error -- Node 18 fetch supports duplex for streaming bodies
      duplex: hasBody ? "half" : undefined,
    });
  } catch (fetchErr) {
    console.error("[chat-transport] upstream fetch failed:", fetchErr);
    return json({ code: "CHAT_UPSTREAM_UNREACHABLE" }, { status: 502 });
  }

  // Build response headers from upstream.
  const responseHeaders = new Headers();
  for (const h of FORWARD_RESPONSE_HEADERS) {
    const val = upstream.headers.get(h);
    if (val) responseHeaders.set(h, val);
  }

  // Stream the body unbuffered.
  return new Response(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
};
