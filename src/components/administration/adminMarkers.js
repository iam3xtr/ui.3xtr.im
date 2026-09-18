/**
 * Единая documented domain-to-icon карта для пяти административных
 * каталогов (Task #12.1: Users, Providers, Models, Tariffs, Requests).
 * Ключ верхнего уровня — домен колонки (`role`/`status`/`protocol`), ключ
 * второго уровня — точное fixture-значение поля (см.
 * `src/stores/administration.js`), значение — имя иконки, разрешаемое
 * публичным `Icon`-контрактом (#8.2, `Icon` из `@iam3xtr/vue`).
 *
 * `role`/`status` не совпадают ни с одним именем в custom SVG registry
 * `@iam3xtr/ui/icons`, поэтому для них `Icon` намеренно падает на Buefy MDI
 * fallback (`defaultIconPack: "mdi"`, см. `main.js`) — это ожидаемый путь
 * резолюции, а не отсутствующая custom-иконка.
 *
 * `protocol` (только у Providers) переиспользует те же ключи вендорского
 * SVG registry `@iam3xtr/ui/icons` — это база `Icon.vue` независимо от
 * `provideIconRegistry`/`main.js` (см. `Icon.vue`'s doc comment), тот же
 * набор ключей, что `ModelSelect.vue`/`stores/models.js` используют
 * (`openai`/`anthropic`/`gemini`/...) — здесь не заводится вторая копия
 * того же mapping, только недостающее значение `google -> "gemini"` (тот же
 * выбор, что в `stores/models.js`).
 */
export const ADMIN_ROLE_ICONS = {
  Владелец: "crown-outline",
  Администратор: "shield-account-outline",
  Участник: "account-outline",
};

export const ADMIN_STATUS_ICONS = {
  // "включено/активно/успех" — общая семантика для Users, Providers,
  // Models, Tariffs, Requests, несмотря на разные литералы статуса.
  Активен: "check-circle-outline",
  Подключён: "check-circle-outline",
  Включена: "check-circle-outline",
  Успех: "check-circle-outline",
  // "выключено/заблокировано" — тоже общая семантика, отдельная от ошибки.
  Заблокирован: "close-circle-outline",
  Отключён: "close-circle-outline",
  Отключена: "close-circle-outline",
  // Ошибка запроса — отдельная семантика от простого "выключено".
  Ошибка: "alert-circle-outline",
  // Архивный тариф — отдельная семантика от активного/выключенного.
  Архив: "archive-outline",
};

export const ADMIN_PROTOCOL_ICONS = {
  openai: "openai",
  anthropic: "anthropic",
  google: "gemini",
};

const ADMIN_MARKER_ICONS = {
  role: ADMIN_ROLE_ICONS,
  status: ADMIN_STATUS_ICONS,
  protocol: ADMIN_PROTOCOL_ICONS,
};

/**
 * @param {"role" | "status" | "protocol"} domain
 * @param {string} value Точное fixture-значение колонки.
 * @returns {string | null} Имя иконки для `Icon` (`@iam3xtr/vue`), либо `null`, если
 *   для домена/значения нет сопоставления — вызывающий код должен показывать
 *   только текст без иконки, а не placeholder.
 */
export function resolveAdminMarkerIcon(domain, value) {
  return ADMIN_MARKER_ICONS[domain]?.[value] ?? null;
}
