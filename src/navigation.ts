export interface MainNavigationItem {
  routeName: string;
  icon: string;
  label: string;
}

export const mainNavigationItems: MainNavigationItem[] = [
  { routeName: "conversations", icon: "forum-outline", label: "Диалоги" },
  { routeName: "agents", icon: "robot-outline", label: "Агенты" },
  { routeName: "knowledge", icon: "book-open-page-variant-outline", label: "Знания" },
  { routeName: "integrations", icon: "puzzle-outline", label: "Интеграции" },
  { routeName: "workspace", icon: "office-building-cog-outline", label: "Пространство" },
];

export const administrationNavigationItems: MainNavigationItem[] = [
  { routeName: "ui-kit", icon: "palette-outline", label: "UI Kit" },
];
