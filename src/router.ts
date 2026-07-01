import {
  createRouter,
  createWebHashHistory,
  createWebHistory,
} from "vue-router";

import Conversations from "./components/Conversations.vue";
import Dashboard from "./components/Dashboard.vue";
import SectionPlaceholder from "./components/SectionPlaceholder.vue";
import UiKit from "./components/UiKit.vue";

declare module "vue-router" {
  interface RouteMeta {
    contentMode?: "contained" | "fluid";
  }
}

const router = createRouter({
  history:
    import.meta.env.VITE_ROUTER_MODE === "hash"
      ? createWebHashHistory(import.meta.env.BASE_URL)
      : createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      name: "dashboard",
      component: Dashboard,
    },
    {
      path: "/conversations",
      name: "conversations",
      component: Conversations,
      meta: { contentMode: "fluid" },
    },
    {
      path: "/agents",
      name: "agents",
      component: SectionPlaceholder,
      props: { title: "Агенты" },
    },
    {
      path: "/channels",
      name: "channels",
      component: SectionPlaceholder,
      props: { title: "Каналы" },
    },
    {
      path: "/test-sessions",
      name: "sessions",
      component: SectionPlaceholder,
      props: { title: "Тест-сессии" },
    },
    {
      path: "/settings",
      name: "settings",
      component: SectionPlaceholder,
      props: { title: "Настройки" },
    },
    {
      path: "/workspace/members",
      name: "workspace-members",
      component: SectionPlaceholder,
      props: { title: "Участники пространства" },
    },
    {
      path: "/profile",
      name: "profile",
      component: SectionPlaceholder,
      props: { title: "Профиль" },
    },
    {
      path: "/profile/security",
      name: "security",
      component: SectionPlaceholder,
      props: { title: "Безопасность" },
    },
    {
      path: "/ui-kit",
      name: "ui-kit",
      component: UiKit,
    },
    {
      path: "/:pathMatch(.*)*",
      redirect: { name: "dashboard" },
    },
  ],
  scrollBehavior: () => ({ top: 0 }),
});

export default router;
