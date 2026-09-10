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
  { routeName: "integrations", icon: "puzzle-outline", label: "Интеграции" },
  { routeName: "workspace", icon: "office-building-cog-outline", label: "Пространство" },
];

/** @type {MainNavigationItem[]} */
export const administrationNavigationItems = [
  { routeName: "ui-kit", icon: "palette-outline", label: "UI Kit" },
];
