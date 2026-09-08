import {
  createRouter,
  createWebHashHistory,
  createWebHistory,
} from "vue-router";

import Agents from "./components/Agents.vue";
import Conversations from "./components/Conversations.vue";
import Dashboard from "./components/Dashboard.vue";
import Integrations from "./components/Integrations.vue";
import Knowledge from "./components/Knowledge.vue";
import SectionPlaceholder from "./components/SectionPlaceholder.vue";
import Settings from "./components/Settings.vue";
import UiKit from "./components/UiKit.vue";
import Workspace from "./components/Workspace.vue";
import WorkspacePlan from "./components/WorkspacePlan.vue";

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
      component: Agents,
      // meta: { contentMode: "fluid" },
    },
    {
      path: "/knowledge",
      name: "knowledge",
      component: Knowledge,
    },
    {
      path: "/integrations",
      name: "integrations",
      component: Integrations,
    },
    {
      path: "/channels",
      redirect: { name: "integrations" },
    },
    {
      path: "/settings",
      redirect: { name: "workspace-settings" },
    },
    {
      path: "/workspace/",
      component: Workspace,
      children: [
        {
          path: "",
          name: "workspace",
          component: SectionPlaceholder,
          props: { title: "Обзор пространства" },
        },
        {
          path: "settings/",
          name: "workspace-settings",
          component: Settings,
        },
        {
          path: "members/",
          name: "workspace-members",
          component: SectionPlaceholder,
          props: { title: "Участники пространства" },
        },
        {
          path: "plan/",
          name: "workspace-plan",
          component: WorkspacePlan,
        },
      ],
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
