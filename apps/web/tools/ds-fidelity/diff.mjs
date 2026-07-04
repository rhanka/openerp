import { chromium } from "@playwright/test";

const OURS = "http://127.0.0.1:4173/admin/crm/leads";
const REF_LAYOUT = "http://127.0.0.1:4381/layouts/dashboard";
const REF_APPHEADER = "http://127.0.0.1:4381/components/app-header";

const PROPS = [
  "fontFamily", "fontSize", "fontWeight", "lineHeight", "letterSpacing",
  "color", "backgroundColor",
  "height", "paddingTop", "paddingRight", "paddingBottom", "paddingLeft",
  "gap", "borderRadius", "borderTopWidth", "borderBottomWidth", "borderColor",
  "display", "alignItems", "boxShadow", "textTransform"
];

// [key, refPage, refSelector, ourSelector]
const MAP = [
  ["body", "layout", "body", "body"],
  ["header root", "layout", "header.st-appHeader", "header.st-appHeader"],
  ["header bar", "layout", ".st-appHeader__bar", ".st-appHeader__bar"],
  ["actions zone", "layout", ".st-appHeader__actions", ".st-appHeader__actions"],
  ["brand link", "appheader", ".st-appHeader__brand", ".st-appHeader__brand"],
  ["brand name", "appheader", ".st-appHeader__brandName", ".st-appHeader__brandName"],
  ["brand product", "appheader", ".st-appHeader__brandProduct", ".st-appHeader__brandProduct"],
  ["contrôle utilitaire header", "layout", ".st-appHeader__actions .st-appHeader__control", "[data-testid='locale-switcher'] select"],
  ["identity trigger", "layout", ".st-identityMenu__trigger, .st-identityMenu__loginCompact", ".st-identityMenu__trigger, .st-identityMenu__loginCompact"],
  ["sidenav (bloc)", "layout", ".st-sidenav", ".shell__sidebar .st-sidenav"],
  ["sidenav lien", "layout", ".st-sidenav__link, .st-sidenav a", ".shell__sidebar .st-sidenav a, .shell__sidebar .st-sidenav__link"],
  ["main", "layout", "main", "main"],
];

async function extract(page, selector) {
  return page.evaluate(({ selector, PROPS }) => {
    const el = document.querySelector(selector);
    if (!el) return null;
    const cs = getComputedStyle(el);
    const out = {};
    for (const p of PROPS) out[p] = cs[p];
    const r = el.getBoundingClientRect();
    out.rectH = Math.round(r.height * 10) / 10;
    out.tag = el.tagName.toLowerCase();
    return out;
  }, { selector, PROPS });
}

const browser = await chromium.launch();
const mk = async (url, cookies) => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  if (cookies) await ctx.addCookies(cookies);
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  return page;
};

const ourPage = await mk(OURS, [
  { name: "openerp_locale", value: "fr", url: "http://127.0.0.1:4173" },
  { name: "openerp_session", value: JSON.stringify({ token: "t", userIdentityId: "11111111-1111-1111-1111-111111111111", organizationId: "22222222-2222-2222-2222-222222222222" }), url: "http://127.0.0.1:4173" }
]);
const refLayout = await mk(REF_LAYOUT);
const refAppHeader = await mk(REF_APPHEADER);
const refs = { layout: refLayout, appheader: refAppHeader };

let bugs = 0;
for (const [key, refKey, refSel, ourSel] of MAP) {
  const a = await extract(refs[refKey], refSel);
  const b = await extract(ourPage, ourSel);
  if (!a && !b) { console.log(`\n### ${key}: absent des DEUX côtés`); continue; }
  if (!a) { console.log(`\n### ${key}: absent de la RÉF [nous: ${b.tag}] — à comparer autrement`); continue; }
  if (!b) { console.log(`\n### ${key}: MANQUANT chez nous (réf: ${a.tag})`); bugs++; continue; }
  const diffs = [];
  for (const p of [...PROPS, "rectH"]) {
    if (String(a[p]) !== String(b[p])) diffs.push(`  - ${p}: REF=${a[p]}  |  NOUS=${b[p]}`);
  }
  if (diffs.length) {
    bugs++;
    console.log(`\n### ${key} [réf:${a.tag} vs nous:${b.tag}] — ${diffs.length} deltas`);
    console.log(diffs.join("\n"));
  } else {
    console.log(`\n### ${key} — OK (identique)`);
  }
}
console.log(`\n==== éléments divergents: ${bugs}/${MAP.length} ====`);
await browser.close();
