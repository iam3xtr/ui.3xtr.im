import {
  createRouter,
  createWebHashHistory,
  createWebHistory,
} from "vue-router";

import AgentDetail from "./components/agents/AgentDetail.vue";
import AgentPlayground from "./components/agents/AgentPlayground.vue";
import AgentSettings from "./components/agents/AgentSettings.vue";
import Agents from "./components/Agents.vue";
import ForgotView from "./components/auth/ForgotView.vue";
import InviteView from "./components/auth/InviteView.vue";
import LoginView from "./components/auth/LoginView.vue";
import SignupView from "./components/auth/SignupView.vue";
import VerifyView from "./components/auth/VerifyView.vue";
import ChannelsView from "./components/channels/ChannelsView.vue";
import Conversations from "./components/Conversations.vue";
import ConversationDetail from "./components/conversations/ConversationDetail.vue";
import ConversationHistory from "./components/conversations/History.vue";
import ConversationSettings from "./components/conversations/Settings.vue";
import Dashboard from "./components/Dashboard.vue";
import Knowledge from "./components/Knowledge.vue";
import CollectionDetail from "./components/knowledge/CollectionDetail.vue";
import CollectionFiles from "./components/knowledge/Files.vue";
import CollectionSettings from "./components/knowledge/Settings.vue";
import CollectionStatistics from "./components/knowledge/Statistics.vue";
import NotFound from "./components/NotFound.vue";
import ProfileSecurity from "./components/profile/Security.vue";
import ProfileSettings from "./components/profile/Settings.vue";
import ProfileShell from "./components/profile/ProfileShell.vue";
import UiKit from "./components/UiKit.vue";
import Workspace from "./components/Workspace.vue";
import WorkspacePlans from "./components/WorkspacePlans.vue";
import WorkspaceSettings from "./components/WorkspaceSettings.vue";
import WorkspaceBilling from "./components/workspace/WorkspaceBilling.vue";
import WorkspaceMembers from "./components/workspace/Members.vue";
import WorkspaceUsage from "./components/workspace/Usage.vue";

// Route map mirrors get.3xtr.im's cabinet routes (src/modules/*/routes.js) so
// design review happens against the same URLs and `meta.contentMode` values —
// see docs/design-system.md "Route families" and .plan Stage A5. Agent detail
// (playground/settings, Task A5.4), knowledge collection tabs
// (files/settings/statistics, Task A5.6), the conversation list/detail/
// settings split (Task A5.7), all five workspace tabs (Task A5.8),
// profile/security (Task A5.9) and auth (Task A5.10) are all built; the
// generic `SectionPlaceholder.vue` that used to stand in for auth screens has
// no remaining consumer and is removed with this change.
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
      meta: { contentMode: "contained" },
    },

    // Agents: catalog, then a route-driven detail shell (Task A5.4) whose
    // `AgentDetail.vue` teleports `agent`/`agent-settings`/`agent-channels`
    // into Navbar tabs and gates them behind the fixture agent existing.
    // `channels` is nested here as its own domain component tree under
    // `src/components/channels/**` (Task A5.5) — the standalone workspace-
    // level "Интеграции" catalog it replaced is gone; `Requests` stays out
    // of scope per Stage A5 `.plan`.
    {
      path: "/agents/",
      name: "agents",
      component: Agents,
      // meta: { contentMode: "fluid" }, — unset to match the cabinet, which
      // also keeps this commented out (src/modules/agents/routes.js).
    },
    {
      path: "/agents/:id",
      component: AgentDetail,
      // No meta here: children set their own contentMode (playground fluid,
      // settings contained, channels fluid), matching get.3xtr.im's
      // `agents/routes.js` + `channels/routes.js`.
      children: [
        {
          path: "",
          name: "agent",
          component: AgentPlayground,
          meta: { contentMode: "fluid" },
        },
        {
          path: "settings",
          name: "agent-settings",
          component: AgentSettings,
          meta: { contentMode: "contained" },
        },
        {
          path: "channels",
          name: "agent-channels",
          component: ChannelsView,
          meta: { contentMode: "fluid" },
        },
      ],
    },

    // Conversations: list, agent-scoped list, detail and its settings tab.
    {
      path: "/conversations",
      name: "conversations",
      component: Conversations,
      meta: { contentMode: "fluid" },
    },
    {
      path: "/conversations/:agentId",
      name: "conversations-agent",
      component: Conversations,
      meta: { contentMode: "fluid" },
    },
    {
      path: "/conversations/:agentId/:conversationId",
      component: ConversationDetail,
      // No meta here: children set their own contentMode — both fluid, per
      // Task A5.7 ("`/conversations`, detail и settings имеют
      // `meta.contentMode: fluid`") — matching the `AgentDetail.vue`/
      // `CollectionDetail.vue` convention of the parent shell staying
      // meta-less while children declare their own mode.
      children: [
        {
          path: "",
          name: "conversation",
          component: ConversationHistory,
          meta: { contentMode: "fluid" },
        },
        {
          path: "settings",
          name: "conversation-settings",
          component: ConversationSettings,
          meta: { contentMode: "fluid" },
        },
      ],
    },

    // Knowledge: catalog, then a route-driven collection shell (Task A5.6)
    // whose `CollectionDetail.vue` teleports `knowledge-collection`/
    // `-settings`/`-statistics` into Navbar tabs, mirroring `AgentDetail.vue`
    // (Task A5.4) — the cabinet's own `Collection.vue` instead re-derives the
    // active tab from `route.path` inside one component, which the kit does
    // not need since it already has this nested-route + NavbarMenu pattern.
    {
      path: "/knowledge/",
      name: "knowledge",
      component: Knowledge,
    },
    {
      path: "/knowledge/:id",
      component: CollectionDetail,
      children: [
        {
          path: "",
          name: "knowledge-collection",
          component: CollectionFiles,
          meta: { contentMode: "fluid" },
        },
        {
          path: "settings",
          name: "knowledge-collection-settings",
          component: CollectionSettings,
          meta: { contentMode: "contained" },
        },
        {
          path: "statistics",
          name: "knowledge-collection-statistics",
          component: CollectionStatistics,
          meta: { contentMode: "fluid" },
        },
      ],
    },

    // Workspace: five tabs sharing one contained shell (see Workspace.vue),
    // all built (Task A5.8) — overview/settings/members/plans/billing.
    {
      path: "/workspace/",
      component: Workspace,
      meta: { contentMode: "contained" },
      children: [
        {
          path: "",
          name: "workspace",
          component: WorkspaceUsage,
        },
        {
          path: "settings",
          name: "workspace-settings",
          component: WorkspaceSettings,
        },
        {
          path: "members",
          name: "workspace-members",
          component: WorkspaceMembers,
        },
        {
          path: "plans",
          name: "workspace-plans",
          component: WorkspacePlans,
        },
        {
          path: "billing",
          name: "workspace-billing",
          component: WorkspaceBilling,
        },
      ],
    },

    // Profile and security: a route-driven shell (Task A5.9), mirroring
    // Workspace.vue — `ProfileShell.vue` teleports its `NavbarTabs` into the
    // Navbar and both children share its `contentMode: "contained"`.
    {
      path: "/profile",
      component: ProfileShell,
      meta: { contentMode: "contained" },
      children: [
        {
          path: "",
          name: "profile",
          component: ProfileSettings,
        },
        {
          path: "security",
          name: "security",
          component: ProfileSecurity,
        },
      ],
    },

    // Auth (Task A5.10): fixture login/signup/forgot/verify/invite forms
    // sharing the `AuthPage` container (`src/components/auth/AuthPage.vue`).
    // The cabinet keeps auth routes outside `.tr-app-shell` entirely (no
    // Sidebar/Navbar, see `get.3xtr.im/src/App.vue`); the kit's `App.vue`
    // is out of this task's scope (see `.todo`/`.plan`, "Область" — only
    // `src/{router.js,stores/**,styles/trickster-buefy.scss}` and
    // `src/components/auth/**`), so these routes still render inside the
    // shared shell like every other kit screen — `AuthPage` itself centers
    // the form regardless. Documented as an open gap in
    // `docs/design-system.md`, "Application shell".
    {
      path: "/auth/login",
      name: "auth-login",
      component: LoginView,
      meta: { contentMode: "contained" },
    },
    {
      path: "/auth/signup",
      name: "auth-signup",
      component: SignupView,
      meta: { contentMode: "contained" },
    },
    {
      path: "/auth/forgot",
      name: "auth-forgot",
      component: ForgotView,
      meta: { contentMode: "contained" },
    },
    {
      path: "/auth/verify/:token?",
      name: "auth-verify",
      component: VerifyView,
      meta: { contentMode: "contained" },
    },
    {
      path: "/auth/invite/:token?",
      name: "auth-invite",
      component: InviteView,
      meta: { contentMode: "contained" },
    },

    // Contract showcase (not a cabinet route).
    {
      path: "/kit",
      name: "kit",
      component: UiKit,
    },

    {
      path: "/404",
      name: "not-found",
      component: NotFound,
      meta: { contentMode: "contained" },
    },
    {
      path: "/:pathMatch(.*)*",
      redirect: { name: "not-found" },
    },
  ],
  scrollBehavior: () => ({ top: 0 }),
});

export default router;
