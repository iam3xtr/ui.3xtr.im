import {
  createRouter,
  createWebHashHistory,
  createWebHistory,
} from "vue-router";

import Agents from "./components/Agents.vue";
import Channels from "./components/Channels.vue";
import Conversations from "./components/Conversations.vue";
import Dashboard from "./components/Dashboard.vue";
import Knowledge from "./components/Knowledge.vue";
import SectionPlaceholder from "./components/SectionPlaceholder.vue";
import UiKit from "./components/UiKit.vue";
import Workspace from "./components/Workspace.vue";
import WorkspacePlans from "./components/WorkspacePlans.vue";
import WorkspaceSettings from "./components/WorkspaceSettings.vue";

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
      path: "/channels",
      name: "channels",
      component: Channels,
    },
    {
      // @deprecated /integrations — renamed to /channels in Task A3.3.
      //   Kept as a redirect so existing links keep working.
      path: "/integrations",
      redirect: { name: "channels" },
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
          component: WorkspaceSettings,
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
          component: WorkspacePlans,
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
