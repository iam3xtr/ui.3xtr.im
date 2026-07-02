export interface MainNavigationItem {
  routeName: string;
  icon: string;
  label: string;
}

export const mainNavigationItems: MainNavigationItem[] = [
  { routeName: "conversations", icon: "forum-outline", label: "Диалоги" },
  { routeName: "agents", icon: "robot-outline", label: "Агенты" },
  {
    routeName: "knowledge",
    icon: "book-open-page-variant-outline",
    label: "Знания",
  },
  { routeName: "channels", icon: "message-outline", label: "Каналы" },
  { routeName: "settings", icon: "cog-outline", label: "Настройки" },
];

export const administrationNavigationItems: MainNavigationItem[] = [
  { routeName: "ui-kit", icon: "palette-outline", label: "UI Kit" },
];
