import { chromium } from "@playwright/test";

// Balayage exhaustif du sous-arbre AppHeader : réf = démo docs components/app-header.
// 1) éléments canoniques présents dans la réf et absents chez nous
// 2) éléments bespoke chez nous (classes hors st-*) — règle: 0 bespoke
// 3) diffs de computed-styles par classe partagée

const REF = "http://127.0.0.1:4381/components/app-header";
const OURS = "http://127.0.0.1:4173/admin/crm/leads";
const PROPS = ["fontFamily","fontSize","fontWeight","lineHeight","color","backgroundColor","height","paddingTop","paddingRight","paddingBottom","paddingLeft","gap","borderRadius","borderTopWidth","borderBottomWidth","borderColor","display","alignItems","justifyContent","boxShadow","textTransform","letterSpacing","marginLeft","marginRight"];
const S = (v) => String(v).length > 44 ? String(v).slice(0, 41) + "…" : String(v);

const harvest = ({ PROPS, scopeSel }) => {
  const scope = document.querySelector(scopeSel);
  if (!scope) return null;
  const out = {};
  const bespoke = [];
  const walk = (el) => {
    // Les enfants SVG des icônes (lucide) portent des classes de lib, pas du
    // CSS custom : hors périmètre bespoke.
    const isSvg = el instanceof SVGElement;
    const classes = (el.getAttribute?.("class") || "").split(/\s+/).filter(Boolean);
    const stClasses = classes.filter((c) => c.startsWith("st-"));
    const nonSt = classes.filter((c) => !c.startsWith("st-") && !c.startsWith("s-") && !c.startsWith("lucide"));
    if (!isSvg && nonSt.length) bespoke.push(`${el.tagName.toLowerCase()}.${nonSt.join(".")}`);
    if (stClasses.length) {
      const cs = getComputedStyle(el);
      const o = { tag: el.tagName.toLowerCase() };
      for (const p of PROPS) o[p] = cs[p];
      o.rectH = Math.round(el.getBoundingClientRect().height * 10) / 10;
      for (const key of stClasses) {
        // Clé exacte : le pill de base ne doit pas être représenté par la
        // variante --icon (et inversement).
        if (key === "st-appHeader__control" && classes.includes("st-appHeader__control--icon")) continue;
        if (!out[key]) out[key] = o;
      }
    }
    for (const c of el.children) walk(c);
  };
  walk(scope);
  return { styles: out, bespoke: [...new Set(bespoke)] };
};

const browser = await chromium.launch();
async function pageFor(url, cookies) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  if (cookies) await ctx.addCookies(cookies);
  const p = await ctx.newPage();
  await p.goto(url, { waitUntil: "networkidle", timeout: 30000 }).catch(() => {});
  await p.waitForTimeout(800);
  return p;
}
const refP = await pageFor(REF);
const ourP = await pageFor(OURS, [
  { name: "openerp_locale", value: "fr", url: "http://127.0.0.1:4173" },
  { name: "openerp_session", value: JSON.stringify({ token: "t", userIdentityId: "11111111-1111-1111-1111-111111111111", organizationId: "22222222-2222-2222-2222-222222222222" }), url: "http://127.0.0.1:4173" }
]);

const ref = await refP.evaluate(harvest, { PROPS, scopeSel: "header.st-appHeader" });
const ours = await ourP.evaluate(harvest, { PROPS, scopeSel: "header.st-appHeader" });
if (!ref || !ours) { console.log("scope introuvable", !!ref, !!ours); process.exit(1); }

let n = 0;
console.log("| # | Élément (classe) | Propriété | DS (démo app-header) | OpenERP | Verdict |");
console.log("|---|------------------|-----------|----------------------|---------|---------|");
for (const key of Object.keys(ref.styles)) {
  if (!ours.styles[key]) console.log(`| ${++n} | \`${key}\` | (élément) | présent (${ref.styles[key].tag}) | **MANQUANT** | canonique absent |`);
}
for (const key of Object.keys(ours.styles)) {
  if (!ref.styles[key]) console.log(`| ${++n} | \`${key}\` | (élément) | absent de la démo | présent (${ours.styles[key].tag}) | hors canon header |`);
}
for (const key of Object.keys(ref.styles)) {
  const a = ref.styles[key], b = ours.styles[key];
  if (!b) continue;
  for (const p of [...PROPS, "rectH"]) {
    if (String(a[p]) !== String(b[p])) console.log(`| ${++n} | \`${key}\` | ${p} | ${S(a[p])} | ${S(b[p])} | delta |`);
  }
}
for (const bc of ours.bespoke) console.log(`| ${++n} | \`${bc}\` | (classe) | — | classe bespoke dans le header | **0-bespoke violé** |`);
console.log(`\nTOTAL: ${n} lignes | bespoke chez nous: ${ours.bespoke.length} | éléments réf: ${Object.keys(ref.styles).length} | éléments nous: ${Object.keys(ours.styles).length}`);
await browser.close();
