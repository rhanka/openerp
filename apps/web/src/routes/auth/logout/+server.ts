import { env } from "$env/dynamic/private";
import type { RequestHandler } from "./$types";
import { redirect } from "@sveltejs/kit";

const API_BASE_URL = "http://127.0.0.1:4000";

export const POST: RequestHandler = async ({ cookies, fetch, request }) => {
  if (env.OPENERP_PLATFORM_AUTH_UI_ENABLED === "1") {
    const apiUrl = new URL(env.OPENERP_API_URL ?? API_BASE_URL);
    apiUrl.pathname = "/api/v1/auth/session";
    apiUrl.search = "";
    // This rollback bridge attempts upstream revocation before clearing the
    // local browser state. The IdentityMenu normally calls the shared browser
    // transport directly while the flag is on.
    await fetch(apiUrl, {
      method: "DELETE",
      headers: {
        cookie: request.headers.get("cookie") ?? "",
        "x-app-locale": request.headers.get("x-app-locale") ?? "fr",
      },
    }).catch(() => undefined);
    cookies.delete("openerp_refresh", { path: "/" });
  }
  cookies.delete("openerp_session", { path: "/" });
  redirect(303, "/login");
};
