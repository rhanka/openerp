import { env } from "$env/dynamic/private";
import { json, type RequestHandler } from "@sveltejs/kit";

// POST /login/finish  body={response, organizationId?}
// Forwards the AuthenticationResponseJSON to the API, then materializes the
// returned session JWT as an httpOnly cookie that the SSR loaders use to
// build a tenant context. The cookie payload is opaque to the browser — only
// SvelteKit reads it server-side.

const SESSION_COOKIE = "openerp_session";

interface ApiSuccess {
  token: { raw: string; expiresAt: string; issuedAt: string };
  userIdentityId: string;
  organizationId: string;
}

export const POST: RequestHandler = async ({ request, fetch, cookies }) => {
  const payload = await safeJson(request);
  const apiUrl = env.OPENERP_API_URL ?? "http://127.0.0.1:4000";
  const upstream = await fetch(`${apiUrl}/webauthn/login/finish`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload ?? {})
  });
  const data = (await upstream.json()) as ApiSuccess | { code: string };
  if (!upstream.ok || !("token" in data)) {
    return json(data, { status: upstream.status });
  }
  const expires = new Date(data.token.expiresAt);
  cookies.set(
    SESSION_COOKIE,
    JSON.stringify({
      token: data.token.raw,
      userIdentityId: data.userIdentityId,
      organizationId: data.organizationId
    }),
    {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      expires
    }
  );
  return json({
    ok: true,
    userIdentityId: data.userIdentityId,
    organizationId: data.organizationId
  });
};

async function safeJson(request: Request): Promise<unknown | null> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
