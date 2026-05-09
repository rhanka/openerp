import foundationEn from "./foundation.en.json";
import foundationFr from "./foundation.fr.json";

export type LocaleCode = "en" | "fr";
export type MessageCatalog = Record<string, string>;

export const catalog: Record<LocaleCode, MessageCatalog> = {
  en: foundationEn,
  fr: foundationFr
};

export function getMessage(locale: LocaleCode, key: string): string {
  const message = catalog[locale][key];
  if (!message) {
    throw new Error(`Missing ${locale} message: ${key}`);
  }
  return message;
}

export function validateCatalogPair(en: MessageCatalog, fr: MessageCatalog): string[] {
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

function sortedKeys(catalog: MessageCatalog): string[] {
  return Object.keys(catalog).sort((left, right) => left.localeCompare(right));
}
