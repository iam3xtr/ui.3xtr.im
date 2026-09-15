import { DEFAULT_LOCALE, normalizeLocale } from "../../stores/locale.js";
import ru from "./ru.js";
import en from "./en.js";
import es from "./es.js";

/**
 * Scoped RU/EN/ES dictionaries for A10's common cross-cutting elements
 * (Task A10.9) — dirty-exit confirmation and the form-error-summary title
 * shared by every savable form in scope. Not a kit-wide i18n library, see
 * the scope note atop `ru.js`. `LOCALES`/`DEFAULT_LOCALE`/`normalizeLocale`
 * and the current pick live in `src/stores/locale.js`, re-exported here so
 * a component only needs one import to get both the dictionary and the
 * locale-normalizing helper — mirrors `locales/wizard/index.js`.
 *
 * @type {Record<"ru" | "en" | "es", typeof ru>}
 */
export const COMMON_DICTIONARIES = Object.freeze({ ru, en, es });

/**
 * @param {string | undefined | null} locale
 * @returns {typeof ru}
 */
export function getCommonDictionary(locale) {
  return COMMON_DICTIONARIES[normalizeLocale(locale)];
}

export { DEFAULT_LOCALE, normalizeLocale };
