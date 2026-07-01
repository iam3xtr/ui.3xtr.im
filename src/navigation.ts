export interface MainNavigationItem {
  routeName: string;
  icon: string;
  label: string;
}

export const mainNavigationItems: MainNavigationItem[] = [
  { routeName: "conversations", icon: "forum-outline", label: "Диалоги" },
  { routeName: "agents", icon: "robot-outline", label: "Агенты" },
  { routeName: "channels", icon: "message-outline", label: "Каналы" },
  { routeName: "sessions", icon: "flask-outline", label: "Тест-сессии" },
  { routeName: "settings", icon: "cog-outline", label: "Настройки" },
  { routeName: "ui-kit", icon: "palette-outline", label: "UI Kit" },
];
