import { env } from "$env/dynamic/private";
import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = ({ locals, cookies }) => {
  const flagCookie = cookies.get("openerp_chat") === "1";
  const flagEnv = env.OPENERP_CHAT_ENABLED === "1";
  const chatEnabled = flagCookie || flagEnv;
  return { locale: locals.locale, chatEnabled, session: locals.session };
};
