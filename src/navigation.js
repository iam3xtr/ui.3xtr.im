/**
 * @typedef {Object} MainNavigationItem
 * @property {string} routeName
 * @property {string} icon
 * @property {string} label
 */

/** @type {MainNavigationItem[]} */
export const mainNavigationItems = [
  { routeName: "conversations", icon: "forum-outline", label: "Диалоги" },
  { routeName: "agents", icon: "robot-outline", label: "Агенты" },
  { routeName: "knowledge", icon: "book-open-page-variant-outline", label: "Знания" },
  { routeName: "workspace", icon: "office-building-cog-outline", label: "Пространство" },
];

/**
 * Пять облегчённых операторских каталогов (Task A8.3) + справочник `/kit`.
 * Порядок и иконки первых четырёх пунктов повторяют
 * `get.3xtr.im/src/modules/common/navigation.js`'s `adminNavigationItems`
 * (`navUsers`/`navProviders`/`navModels`/`navTariffs`); `requests` не имеет
 * верхнеуровневого маршрута-аналога в кабинете — кит-only пункт, см.
 * `docs/design-system.md`, «Route families». Реальных permissions кит не
 * применяет: пункты видны всегда. `kit` (Task A8.6) is the route family's
 * default "overview" tab name — the link still resolves to `/kit` unchanged.
 * @type {MainNavigationItem[]}
 */
export const administrationNavigationItems = [
  { routeName: "administration-users", icon: "account-multiple-outline", label: "Пользователи" },
  { routeName: "administration-providers", icon: "connection", label: "Провайдеры" },
  { routeName: "administration-models", icon: "brain", label: "Модели" },
  { routeName: "administration-tariffs", icon: "tag-multiple-outline", label: "Тарифы" },
  { routeName: "administration-requests", icon: "history", label: "Запросы" },
  { routeName: "kit", icon: "palette-outline", label: "UI Kit" },
];
