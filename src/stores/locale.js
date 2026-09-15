import { defineStore } from "pinia";
import { ref } from "vue";

/**
 * Kit-wide "UI language" pick for the scoped RU/EN/ES dictionaries under
 * `src/locales/**` (Task A10.9, `.plan` Stage A10 item 8: "Распространить
 * локальные словари A9 на dashboard, ..."). This is deliberately NOT a
 * kit-wide i18n library — no message catalog for arbitrary component text,
 * no route/URL negotiation, no persistence. It is a single fixture switch
 * (`Navbar.vue`'s existing "Язык" `b-select`, previously decorative) that
 * scoped-dictionary consumers (`common/DirtyExitModal.vue`,
 * `common/FormErrorSummary.vue`, and any further A10 screen that adopts the
 * same `src/locales/<area>/index.js` pattern) read instead of each keeping
 * its own local `ref("ru")`.
 *
 * The agent-wizard's own `draft.locale` (`stores/wizard.js`,
 * `WIZARD_LOCALES`/`normalizeWizardLocale`) stays independent on purpose:
 * it is a per-draft, per-workspace choice for the wizard's expert-parameters
 * disclosure only, unrelated to which language the rest of the cabinet
 * chrome/forms render in.
 */
export const LOCALES = Object.freeze(["ru", "en", "es"]);

/** @type {"ru"} */
export const DEFAULT_LOCALE = "ru";

/**
 * @param {unknown} value
 * @returns {typeof LOCALES[number]}
 */
export function normalizeLocale(value) {
  return LOCALES.includes(/** @type {any} */ (value)) ? value : DEFAULT_LOCALE;
}

export const useLocaleStore = defineStore("locale", () => {
  const locale = ref(DEFAULT_LOCALE);

  /** @param {unknown} value */
  function setLocale(value) {
    locale.value = normalizeLocale(value);
  }

  return { locale, setLocale };
});
