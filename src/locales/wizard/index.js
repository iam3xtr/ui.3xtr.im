import { DEFAULT_WIZARD_LOCALE, normalizeWizardLocale } from "../../stores/wizard.js";
import ru from "./ru.js";
import en from "./en.js";
import es from "./es.js";

/**
 * Scoped RU/EN/ES dictionaries for the wizard's expert-parameters disclosure
 * (Task A9.5) — not a kit-wide i18n library, see the scope note atop `ru.js`.
 * `WIZARD_LOCALES`/`DEFAULT_WIZARD_LOCALE`/draft-locale state live in
 * `src/stores/wizard.js`, which this module re-exports for convenience so a
 * component only needs one import to get both the dictionary and the
 * locale-normalizing helper.
 *
 * @type {Record<"ru" | "en" | "es", typeof ru>}
 */
export const WIZARD_DICTIONARIES = Object.freeze({ ru, en, es });

/**
 * @param {string | undefined | null} locale
 * @returns {typeof ru}
 */
export function getWizardDictionary(locale) {
  return WIZARD_DICTIONARIES[normalizeWizardLocale(locale)];
}

export { DEFAULT_WIZARD_LOCALE, normalizeWizardLocale };
