import { describe, expect, it } from "vitest";
import { DEFAULT_WIZARD_LOCALE, getWizardDictionary, WIZARD_DICTIONARIES } from "../../../src/locales/wizard/index.js";
import { WIZARD_LOCALES } from "../../../src/stores/wizard.js";

/**
 * Task A9.5 acceptance: «Новый путь имеет полный одинаковый набор RU/EN/ES
 * ключей». Walks every leaf key path in the RU dictionary (the reference)
 * and asserts EN/ES carry the exact same path with a non-empty string value
 * — a missing/renamed key in either language fails loudly instead of
 * silently falling back to Russian at runtime.
 */
function collectLeafPaths(node, prefix = "") {
  return Object.entries(node).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof value === "object" && value !== null
      ? collectLeafPaths(value, path)
      : [path];
  });
}

function readPath(node, path) {
  return path.split(".").reduce((acc, key) => acc?.[key], node);
}

describe("locales/wizard — полнота RU/EN/ES словарей (Task A9.5)", () => {
  it("WIZARD_DICTIONARIES содержит запись на каждый WIZARD_LOCALES", () => {
    for (const locale of WIZARD_LOCALES) {
      expect(WIZARD_DICTIONARIES[locale]).toBeTruthy();
    }
  });

  it("EN и ES несут ровно тот же набор ключей, что RU (эталон)", () => {
    const referencePaths = collectLeafPaths(WIZARD_DICTIONARIES.ru).sort();

    for (const locale of ["en", "es"]) {
      const paths = collectLeafPaths(WIZARD_DICTIONARIES[locale]).sort();
      expect(paths).toEqual(referencePaths);
    }
  });

  it("ни один лист словаря не пустой ни в одной локали", () => {
    for (const locale of WIZARD_LOCALES) {
      const dictionary = WIZARD_DICTIONARIES[locale];
      for (const path of collectLeafPaths(dictionary)) {
        expect(typeof readPath(dictionary, path)).toBe("string");
        expect(readPath(dictionary, path).trim().length).toBeGreaterThan(0);
      }
    }
  });

  it("getWizardDictionary нормализует неизвестную/пустую locale на дефолт", () => {
    expect(getWizardDictionary("fr")).toBe(WIZARD_DICTIONARIES[DEFAULT_WIZARD_LOCALE]);
    expect(getWizardDictionary(undefined)).toBe(WIZARD_DICTIONARIES[DEFAULT_WIZARD_LOCALE]);
  });

  it("переводы EN/ES не совпадают дословно с RU (не заглушки)", () => {
    expect(WIZARD_DICTIONARIES.en.expertToggle.show).not.toBe(WIZARD_DICTIONARIES.ru.expertToggle.show);
    expect(WIZARD_DICTIONARIES.es.expertToggle.show).not.toBe(WIZARD_DICTIONARIES.ru.expertToggle.show);
  });
});
