import { env } from "$env/dynamic/private";
import { redirect } from "@sveltejs/kit";

import type { PageServerLoad } from "./$types";

/** Keep the tenant transition behind the same dark web flag as auth-ui. */
export const load: PageServerLoad = () => {
  if (env.OPENERP_PLATFORM_AUTH_UI_ENABLED !== "1") redirect(303, "/login");
};
