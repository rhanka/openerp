import { env } from "$env/dynamic/private";
import type { RequestHandler } from "./$types";

type AuthMethod = "DELETE" | "GET" | "POST" | "PUT";

const API_BASE_URL = "http://127.0.0.1:4000";

/**
 * This is intentionally a generic pass-through for the published platform
 * surface, not a replacement set of ceremony routes. New paths require an
 * explicit platform-contract decision here.
 */
const ALLOWED_METHODS: Readonly<Record<string, readonly AuthMethod[]>> = {
  "credentials": ["GET"],
  "email/verify-code": ["POST"],
  "email/verify-request": ["POST"],
  "health": ["GET"],
  "login/options": ["POST"],
  "login/verify": ["POST"],
  "register/options": ["POST"],
  "register/verify": ["POST"],
  "session": ["DELETE", "GET"],
  "session/refresh": ["POST"],
  "tenant/select": ["GET", "POST"],
};

export const GET: RequestHandler = (event) => passThrough(event, "GET");
export const POST: RequestHandler = (event) => passThrough(event, "POST");
export const PUT: RequestHandler = (event) => passThrough(event, "PUT");
export const DELETE: RequestHandler = (event) => passThrough(event, "DELETE");

async function passThrough(
  { fetch, locals, params, request }: Parameters<RequestHandler>[0],
  method: AuthMethod,
): Promise<Response> {
  const path = params.path ?? "";
  if (!isAllowedPlatformAuthRequest(path, method)) return new Response(null, { status: 404 });

  const upstreamUrl = platformAuthUrl(path);
  const headers = forwardedHeaders(request, locals.locale);
  const body = method === "GET" || method === "DELETE" ? undefined : await request.arrayBuffer();

  try {
    const upstream = await fetch(upstreamUrl, { method, headers, body });
    return forwardResponse(upstream);
  } catch {
    return new Response(null, { status: 502 });
  }
}

function isAllowedPlatformAuthRequest(path: string, method: AuthMethod): boolean {
  const directMethods = ALLOWED_METHODS[path];
  if (directMethods?.includes(method)) return true;

  const credentialId = path.slice("credentials/".length);
  return (
    path.startsWith("credentials/") &&
    credentialId.length > 0 &&
    !credentialId.includes("/") &&
    ["DELETE", "PUT"].includes(method)
  );
}

function platformAuthUrl(path: string): string {
  const apiBase = new URL(env.OPENERP_API_URL ?? API_BASE_URL);
  const encodedPath = path.split("/").map(encodeURIComponent).join("/");
  apiBase.pathname = `/api/v1/auth/${encodedPath}`;
  apiBase.search = "";
  return apiBase.toString();
}

function forwardedHeaders(request: Request, locale: App.Locals["locale"]): Headers {
  const headers = new Headers();
  for (const name of ["accept", "authorization", "content-type", "cookie", "x-app-locale"] as const) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  if (!headers.has("x-app-locale")) headers.set("x-app-locale", locale);
  return headers;
}

function forwardResponse(upstream: Response): Response {
  const headers = new Headers();
  for (const [name, value] of upstream.headers) {
    if (name.toLowerCase() !== "set-cookie") headers.append(name, value);
  }
  for (const cookie of getSetCookieHeaders(upstream.headers)) headers.append("set-cookie", cookie);
  return new Response(upstream.body, { headers, status: upstream.status, statusText: upstream.statusText });
}

function getSetCookieHeaders(headers: Headers): string[] {
  const getSetCookie = (headers as Headers & { getSetCookie?: () => string[] }).getSetCookie;
  if (getSetCookie) return getSetCookie.call(headers);
  const cookie = headers.get("set-cookie");
  return cookie ? [cookie] : [];
}
