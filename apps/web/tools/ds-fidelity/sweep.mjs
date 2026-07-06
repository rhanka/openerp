import { chromium } from "@playwright/test";

// Balayage exhaustif composant par composant : chaque composant DS utilisé par
// OpenERP est comparé à SA page de démo officielle des docs DS (mêmes classes).
// Sortie : lignes de tableau markdown, une par propriété divergente.

const DOCS = "http://127.0.0.1:4381/components";
const OURS_LEADS = "http://127.0.0.1:4173/admin/crm/leads";
const OURS_AUDIT = "http://127.0.0.1:4173/admin/audit";

const PROPS = ["fontFamily","fontSize","fontWeight","lineHeight","color","backgroundColor","paddingTop","paddingRight","paddingBottom","paddingLeft","borderRadius","borderTopWidth","borderColor","boxShadow","gap","textTransform","letterSpacing","minHeight"];
const SHORT = (v) => String(v).length > 46 ? String(v).slice(0, 43) + "…" : String(v);

// [élément, page réf docs, sélecteur réf, page nous, sélecteur nous]
const PAIRS = [
  ["Button primaire", `${DOCS}/button`, ".st-button--primary", OURS_LEADS, "main .st-button--primary"],
  ["Input texte", `${DOCS}/input`, "input[class*=st-]", OURS_LEADS, "main input[type=text], main input:not([type])"],
  ["Champ label (st-field__label)", `${DOCS}/input`, "span.st-field__label", OURS_LEADS, "main span.st-field__label"],
  ["Card", `${DOCS}/card`, "[class*=st-card]", OURS_LEADS, "main [class*=st-card]"],
  ["Tag (warning)", `${DOCS}/tag`, ".st-tag--warning", OURS_LEADS, "main .st-tag--warning"],
  ["Alert (warning)", `${DOCS}/alert`, ".st-alert--warning", OURS_LEADS, "main .st-alert--warning"],
  ["EmptyState", `${DOCS}/empty-state`, "[class*=st-emptyState], [class*=empty]", OURS_LEADS, "main [class*=st-emptyState], main [class*=empty-state]"],
  ["SideNav lien", `${DOCS}/side-nav`, ".st-sidenav a:not([aria-current])", OURS_LEADS, ".shell__sidebar .st-sidenav a:not([aria-current])"],
  ["SideNav lien actif", `${DOCS}/side-nav`, ".st-sidenav a[aria-current=page], .st-sidenav [aria-current=page]", OURS_LEADS, ".shell__sidebar .st-sidenav [aria-current=page]"],
  ["SideNav bloc", `${DOCS}/side-nav`, ".st-sidenav", OURS_LEADS, ".shell__sidebar .st-sidenav"],
  ["DataTable th (md)", `${DOCS}/data-table`, ".st-dataTable--md th", OURS_AUDIT, "main .st-dataTable th, main table th"],
  ["DataTable td (md)", `${DOCS}/data-table`, ".st-dataTable--md td", OURS_AUDIT, "main .st-dataTable td, main table td"],
];

const pick = ({ sel, PROPS }) => {
  const el = document.querySelector(sel);
  if (!el) return null;
  const cs = getComputedStyle(el);
  const o = { tag: el.tagName.toLowerCase(), cls: (el.className?.toString?.() || "").slice(0, 60) };
  for (const p of PROPS) o[p] = cs[p];
  o.rectH = Math.round(el.getBoundingClientRect().height) + "px";
  return o;
};

const browser = await chromium.launch();
const cache = new Map();
async function pageFor(url) {
  if (cache.has(url)) return cache.get(url);
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  if (url.includes("4173")) {
    await ctx.addCookies([
      { name: "openerp_locale", value: "fr", url: "http://127.0.0.1:4173" },
      { name: "openerp_session", value: JSON.stringify({ token: "t", userIdentityId: "11111111-1111-1111-1111-111111111111", organizationId: "22222222-2222-2222-2222-222222222222" }), url: "http://127.0.0.1:4173" }
    ]);
  }
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: "networkidle", timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(800);
  cache.set(url, page);
  return page;
}

let n = 0;
const rows = [];
for (const [key, refUrl, refSel, ourUrl, ourSel] of PAIRS) {
  const a = await (await pageFor(refUrl)).evaluate(pick, { sel: refSel, PROPS });
  const b = await (await pageFor(ourUrl)).evaluate(pick, { sel: ourSel, PROPS });
  if (!a && !b) { rows.push(`| ${++n} | ${key} | (élément) | absent de la démo docs | absent chez nous | à instrumenter |`); continue; }
  if (!a) { rows.push(`| ${++n} | ${key} | (élément) | démo docs sans ce sélecteur | présent chez nous | réf à préciser |`); continue; }
  if (!b) { rows.push(`| ${++n} | ${key} | (élément) | présent (${a.tag}.${a.cls.split(" ")[0]}) | **ABSENT/NON-DS chez nous** | bug |`); continue; }
  const CONTENT_DRIVEN = ["Card", "EmptyState", "Alert (warning)"];
  for (const p of [...PROPS, "rectH"]) {
    if (p === "rectH" && CONTENT_DRIVEN.some((k) => key.startsWith(k))) continue;
    if (String(a[p]) !== String(b[p])) {
      rows.push(`| ${++n} | ${key} | ${p} | ${SHORT(a[p])} | ${SHORT(b[p])} | delta |`);
    }
  }
}
console.log("| # | Élément | Propriété | DS (réf docs) | OpenERP | Verdict |");
console.log("|---|---------|-----------|----------------|---------|---------|");
for (const r of rows) console.log(r);
console.log(`\nTOTAL lignes divergentes: ${n}`);
await browser.close();
