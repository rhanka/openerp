/**
 * PLAID-C0 — POC sandbox rejouable (chaîne complète Link → Item → transactions).
 * Lit PLAID_CLIENT_ID / PLAID_SANDBOX_SECRET depuis .env (racine repo, jamais commité).
 * N'affiche JAMAIS les secrets ni les tokens — uniquement des décomptes/états.
 * Usage : node tools/bank-connector/poc-plaid-sandbox.mjs
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const env = Object.fromEntries(
  readFileSync(resolve(import.meta.dirname, "../../.env"), "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()])
);
const BASE = "https://sandbox.plaid.com";
const auth = { client_id: env.PLAID_CLIENT_ID, secret: env.PLAID_SANDBOX_SECRET };
if (!auth.client_id || !auth.secret) { console.error("creds absents du .env"); process.exit(2); }

async function api(path, body) {
  const r = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...auth, ...body })
  });
  const j = await r.json();
  if (j.error_code) throw new Error(`${path}: ${j.error_code} — ${j.error_message}`);
  return j;
}

// 1. Institutions CA + focus Desjardins (couverture produits réelle)
const dj = await api("/institutions/search", {
  query: "Desjardins", products: null, country_codes: ["CA"]
});
for (const i of dj.institutions.slice(0, 3)) {
  console.log(`institution: ${i.name} (${i.institution_id}) — produits: ${i.products.join(", ")}`);
}

// 2. link_token (ce que le connecteur créera pour le rôle comptable)
const link = await api("/link/token/create", {
  user: { client_user_id: "poc-openerp-c0" },
  client_name: "OpenERP bank-connector POC",
  products: ["transactions"],
  country_codes: ["CA"],
  language: "fr"
});
console.log("link_token: créé (expire", link.expiration + ")");

// 3. Item sandbox (simule l'enrôlement Link du comptable) sur une institution CA
const inst = dj.institutions.find((i) => i.products.includes("transactions")) ?? dj.institutions[0];
const pub = await api("/sandbox/public_token/create", {
  institution_id: inst.institution_id,
  initial_products: ["transactions"]
});
console.log(`public_token sandbox: créé sur ${inst.name}`);

// 4. Échange → access_token (custody connecteur, jamais exposé)
const exch = await api("/item/public_token/exchange", { public_token: pub.public_token });
console.log("access_token: obtenu (item", exch.item_id + ") — non affiché");

// 5. transactions/sync (retente tant que PRODUCT_NOT_READY)
let added = [], cursor = undefined, tries = 0;
while (tries++ < 12) {
  try {
    let hasMore = true;
    while (hasMore) {
      const t = await api("/transactions/sync", { access_token: exch.access_token, cursor });
      added.push(...t.added);
      cursor = t.next_cursor;
      hasMore = t.has_more;
    }
    break;
  } catch (e) {
    if (String(e.message).includes("PRODUCT_NOT_READY")) {
      await new Promise((r) => setTimeout(r, 5000));
      continue;
    }
    throw e;
  }
}
console.log(`transactions/sync: ${added.length} transactions récupérées`);
if (added[0]) {
  const s = added[0];
  console.log(`  exemple: ${s.date} | ${s.name} | ${s.amount} ${s.iso_currency_code}`);
}
console.log("\nPOC C0: CHAÎNE COMPLÈTE OK (link_token → item → transactions)");
