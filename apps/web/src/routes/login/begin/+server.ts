import { env } from "$env/dynamic/private";
import { json, type RequestHandler } from "@sveltejs/kit";

// POST /login/begin  body=email
// Proxies to the OpenERP API's /webauthn/login/begin so the browser never
// talks directly to the API (avoids CORS, keeps the API surface internal).
// Returns the PublicKeyCredentialRequestOptionsJSON straight from the API.

export const POST: RequestHandler = async ({ request, fetch }) => {
  const body = await safeJson(request);
  const email = body && typeof body === "object" && "email" in body
    ? String((body as { email?: string }).email ?? "").trim()
    : "";

  const apiUrl = env.OPENERP_API_URL ?? "http://127.0.0.1:4000";
  const upstream = await fetch(`${apiUrl}/webauthn/login/begin`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(email ? { email } : {})
  });
  const data = (await upstream.json()) as unknown;
  if (!upstream.ok) return json(data, { status: upstream.status });
  return json(data);
};

async function safeJson(request: Request): Promise<unknown | null> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
