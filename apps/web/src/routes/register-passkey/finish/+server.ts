import { env } from "$env/dynamic/private";
import { json, type RequestHandler } from "@sveltejs/kit";

// POST /register-passkey/finish  body={userIdentityId, response, label?}

export const POST: RequestHandler = async ({ request, fetch }) => {
  const payload = await safeJson(request);
  const apiUrl = env.OPENERP_API_URL ?? "http://127.0.0.1:4000";
  const upstream = await fetch(`${apiUrl}/webauthn/register/finish`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload ?? {})
  });
  const data = (await upstream.json()) as unknown;
  if (!upstream.ok) return json(data, { status: upstream.status });
  return json(data, { status: 201 });
};

async function safeJson(request: Request): Promise<unknown | null> {
  try { return await request.json(); } catch { return null; }
}
