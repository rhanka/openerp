import { redirect, type RequestHandler } from "@sveltejs/kit";

import { isLocaleCode } from "$lib/i18n";

// POST /api/locale  body=locale=fr|en + next=/admin/audit
// Writes the openerp_locale cookie and redirects back to the caller-provided
// `next` URL (defaults to "/"). The form lives in the layout header.

export const POST: RequestHandler = async ({ request, cookies }) => {
  const form = await request.formData();
  const locale = String(form.get("locale") ?? "");
  const next = sanitizeNext(String(form.get("next") ?? "/"));
  if (!isLocaleCode(locale)) {
    return new Response("invalid locale", { status: 400 });
  }
  cookies.set("openerp_locale", locale, {
    path: "/",
    httpOnly: false,
    sameSite: "lax",
    // SvelteKit defaults `secure` to true for any non-`localhost` hostname,
    // which silently drops the cookie on 127.0.0.1 over HTTP. Tie the flag
    // to NODE_ENV so dev / e2e work and production stays secure.
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365
  });
  throw redirect(303, next);
};

function sanitizeNext(next: string): string {
  if (!next.startsWith("/")) return "/";
  if (next.startsWith("//")) return "/";
  return next;
}
