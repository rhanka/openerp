import { describe, expect, it } from "vitest";

import { catalog, getMessage, validateCatalogPair } from "./catalog";

describe("foundation i18n catalog", () => {
  it("keeps English and French catalogs in parity", () => {
    expect(validateCatalogPair(catalog.en, catalog.fr)).toEqual([]);
  });

  it("looks up role.owner in English", () => {
    expect(getMessage("en", "role.owner")).toBe("Owner");
  });

  it("looks up role.owner in French", () => {
    expect(getMessage("fr", "role.owner")).toBe("Proprietaire");
  });

  it("detects a missing French key before release", () => {
    expect(validateCatalogPair({ a: "A" }, {})).toEqual(["fr:a"]);
  });
});
