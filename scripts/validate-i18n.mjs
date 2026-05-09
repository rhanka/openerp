import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const catalogDir = path.join(rootDir, "packages", "i18n", "src");
const requiredLocales = ["en", "fr"];

const catalogs = Object.fromEntries(
  await Promise.all(
    requiredLocales.map(async (locale) => {
      const filePath = path.join(catalogDir, `foundation.${locale}.json`);
      const content = await readFile(filePath, "utf8");
      return [locale, JSON.parse(content)];
    })
  )
);

const issues = validateCatalogPair(catalogs.en, catalogs.fr);

if (issues.length > 0) {
  throw new Error(`Missing i18n keys: ${issues.join(", ")}`);
}

console.log(`i18n catalogs valid for locales: ${requiredLocales.join(", ")}`);

function sortedKeys(catalog) {
  return Object.keys(catalog).sort((left, right) => left.localeCompare(right));
}

function validateCatalogPair(en, fr) {
  const enKeys = sortedKeys(en);
  const frKeys = sortedKeys(fr);
  const missingFrKeys = enKeys
    .filter((key) => !frKeys.includes(key))
    .map((key) => `fr:${key}`);
  const missingEnKeys = frKeys
    .filter((key) => !enKeys.includes(key))
    .map((key) => `en:${key}`);

  return [...missingFrKeys, ...missingEnKeys];
}
