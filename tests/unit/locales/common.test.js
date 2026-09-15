import { describe, expect, it } from "vitest";
import { COMMON_DICTIONARIES, DEFAULT_LOCALE, getCommonDictionary } from "../../../src/locales/common/index.js";
import { LOCALES } from "../../../src/stores/locale.js";

/**
 * Task A10.9 acceptance: «RU/EN/ES dictionaries имеют одинаковые ключи и не
 * переводят user data». Mirrors `tests/unit/locales/wizard.test.js` for the
 * `locales/common` dictionary shared by every A10 savable form's dirty-exit
 * confirmation and error summary.
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

describe("locales/common — полнота RU/EN/ES словарей (Task A10.9)", () => {
  it("COMMON_DICTIONARIES содержит запись на каждый LOCALES", () => {
    for (const locale of LOCALES) {
      expect(COMMON_DICTIONARIES[locale]).toBeTruthy();
    }
  });

  it("EN и ES несут ровно тот же набор ключей, что RU (эталон)", () => {
    const referencePaths = collectLeafPaths(COMMON_DICTIONARIES.ru).sort();

    for (const locale of ["en", "es"]) {
      const paths = collectLeafPaths(COMMON_DICTIONARIES[locale]).sort();
      expect(paths).toEqual(referencePaths);
    }
  });

  it("ни один лист словаря не пустой ни в одной локали", () => {
    for (const locale of LOCALES) {
      const dictionary = COMMON_DICTIONARIES[locale];
      for (const path of collectLeafPaths(dictionary)) {
        expect(typeof readPath(dictionary, path)).toBe("string");
        expect(readPath(dictionary, path).trim().length).toBeGreaterThan(0);
      }
    }
  });

  it("getCommonDictionary нормализует неизвестную/пустую locale на дефолт", () => {
    expect(getCommonDictionary("fr")).toBe(COMMON_DICTIONARIES[DEFAULT_LOCALE]);
    expect(getCommonDictionary(undefined)).toBe(COMMON_DICTIONARIES[DEFAULT_LOCALE]);
  });

  it("переводы EN/ES не совпадают дословно с RU (не заглушки)", () => {
    expect(COMMON_DICTIONARIES.en.dirtyExit.title).not.toBe(COMMON_DICTIONARIES.ru.dirtyExit.title);
    expect(COMMON_DICTIONARIES.es.dirtyExit.title).not.toBe(COMMON_DICTIONARIES.ru.dirtyExit.title);
  });
});
