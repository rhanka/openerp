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
    maxAge: 60 * 60 * 24 * 365
  });
  throw redirect(303, next);
};

function sanitizeNext(next: string): string {
  if (!next.startsWith("/")) return "/";
  if (next.startsWith("//")) return "/";
  return next;
}
