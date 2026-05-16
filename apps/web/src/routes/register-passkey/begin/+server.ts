import { env } from "$env/dynamic/private";
import { json, type RequestHandler } from "@sveltejs/kit";

// POST /register-passkey/begin  body=email
// Proxies to /webauthn/register/begin. The API needs an existing
// UserIdentity for `email` (created by the seeder or via a future invite
// flow). Returns the PublicKeyCredentialCreationOptionsJSON.

export const POST: RequestHandler = async ({ request, fetch }) => {
  const body = await safeJson(request);
  const email = body && typeof body === "object" && "email" in body
    ? String((body as { email?: string }).email ?? "").trim()
    : "";
  if (!email) return json({ code: "EMAIL_REQUIRED" }, { status: 400 });

  const apiUrl = env.OPENERP_API_URL ?? "http://127.0.0.1:4000";
  const upstream = await fetch(`${apiUrl}/webauthn/register/begin`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email })
  });
  const data = (await upstream.json()) as unknown;
  if (!upstream.ok) return json(data, { status: upstream.status });
  return json(data);
};

async function safeJson(request: Request): Promise<unknown | null> {
  try { return await request.json(); } catch { return null; }
}
