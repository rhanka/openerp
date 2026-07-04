import { chromium } from "@playwright/test";
const PROPS = ["fontFamily","fontSize","fontWeight","color","backgroundColor","height","paddingLeft","paddingRight","borderRadius","borderTopWidth","borderColor","boxShadow"];
const pickAll = ({ sel, PROPS }) => {
  const el = document.querySelector(sel);
  if (!el) return null;
  const cs = getComputedStyle(el);
  const o = { tag: el.tagName.toLowerCase() };
  for (const p of PROPS) o[p] = cs[p];
  o.rect = Math.round(el.getBoundingClientRect().height) + "px";
  return o;
};
const browser = await chromium.launch();

const ref = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
await ref.goto("https://preprod.sentropic.sent-tech.ca/", { waitUntil: "networkidle" });
await ref.waitForTimeout(1000);

const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
await ctx.addCookies([{ name: "openerp_locale", value: "fr", url: "http://127.0.0.1:4173" }]);
const ours = await ctx.newPage();
await ours.goto("http://127.0.0.1:4173/admin/crm/leads", { waitUntil: "networkidle" });
await ours.waitForTimeout(1000);

const pairs = [
  ["select langue", "header select", "header select"],
  ["bouton primaire", ".st-button--primary, button[class*=primary], a[class*=primary]", ".st-button--primary, button[class*=primary]"],
  ["nav link header", "header nav a", "header nav a"],
  ["h1 contenu", "h1", "main h1"],
  ["lien sidenav", null, ".shell__sidebar .st-sidenav a"],
];
for (const [key, rs, os] of pairs) {
  const a = rs ? await ref.evaluate(pickAll, { sel: rs, PROPS }) : null;
  const b = os ? await ours.evaluate(pickAll, { sel: os, PROPS }) : null;
  console.log(`\n### ${key}`);
  console.log("  REF :", JSON.stringify(a));
  console.log("  NOUS:", JSON.stringify(b));
}
await browser.close();
