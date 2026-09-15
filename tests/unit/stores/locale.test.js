import { beforeEach, describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";

import { DEFAULT_LOCALE, LOCALES, normalizeLocale, useLocaleStore } from "../../../src/stores/locale.js";

// Task A10.9: kit-wide "UI language" pick for the scoped `locales/common`
// dictionary — see the module doc in `stores/locale.js` for why this is
// independent from the agent wizard's own per-draft `WIZARD_LOCALES`.

describe("stores/locale", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("по умолчанию locale — русский", () => {
    const store = useLocaleStore();
    expect(store.locale).toBe(DEFAULT_LOCALE);
  });

  it("setLocale переключает на любой поддерживаемый язык", () => {
    const store = useLocaleStore();

    for (const locale of LOCALES) {
      store.setLocale(locale);
      expect(store.locale).toBe(locale);
    }
  });

  it("setLocale нормализует неизвестное значение на дефолт", () => {
    const store = useLocaleStore();

    store.setLocale("en");
    store.setLocale("fr");

    expect(store.locale).toBe(DEFAULT_LOCALE);
  });

  it("normalizeLocale отклоняет значения вне LOCALES", () => {
    expect(normalizeLocale("es")).toBe("es");
    expect(normalizeLocale("de")).toBe(DEFAULT_LOCALE);
    expect(normalizeLocale(undefined)).toBe(DEFAULT_LOCALE);
  });
});
