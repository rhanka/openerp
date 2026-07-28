import { env } from "$env/dynamic/private";
import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = ({ locals, cookies }) => {
  const flagCookie = cookies.get("openerp_chat") === "1";
  const flagEnv = env.OPENERP_CHAT_ENABLED === "1";
  const chatEnabled = flagCookie || flagEnv;
  // Dark by default: this page flag is independent from the API route flag so
  // a platform UI can never become the shipping login surface accidentally.
  const platformAuthUiEnabled = env.OPENERP_PLATFORM_AUTH_UI_ENABLED === "1";
  return { locale: locals.locale, chatEnabled, platformAuthUiEnabled, session: locals.session };
};
