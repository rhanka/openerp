/* eslint-disable no-console */
import { main } from "./main.js";

// Worker runtime entrypoint. main() reads OPENERP_DATABASE_URL, wires the real
// implementations and runs the worker loop until SIGTERM/SIGINT.
main().catch((err) => {
  console.error(err);
  process.exit(1);
});
