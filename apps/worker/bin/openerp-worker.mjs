#!/usr/bin/env node
// NOTE: requires `npm run build -w @sentropic/openerp-worker` first
// to compile src/main.ts → dist/main.js.
import { main } from "../dist/main.js";

main().catch((err) => {
  console.error("[openerp-worker] fatal:", err);
  process.exit(1);
});
