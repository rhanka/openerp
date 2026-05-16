import type { LayoutLoad } from "./$types";

// Pass-through. Picks up `locale` from the server load so the client side
// has the same value (svelte-kit merges parent server data into the
// universal load by default).
export const load: LayoutLoad = async ({ data }) => data;
