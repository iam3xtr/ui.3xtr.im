import {
  createRouter,
  createWebHistory,
} from "vue-router";

import AdminModels from "./components/administration/Models.vue";
import AdminProviders from "./components/administration/Providers.vue";
import AdminRequests from "./components/administration/Requests.vue";
import AdminTariffs from "./components/administration/Tariffs.vue";
import AdminUsers from "./components/administration/Users.vue";
import AgentDetail from "./components/agents/AgentDetail.vue";
import AgentKnowledge from "./components/agents/AgentKnowledge.vue";
import AgentPlayground from "./components/agents/AgentPlayground.vue";
import AgentSettings from "./components/agents/AgentSettings.vue";
import AgentWizard from "./components/agents/AgentWizard.vue";
import Agents from "./components/Agents.vue";
import ApplicationShell from "./components/kit/ApplicationShell.vue";
import ForgotView from "./components/auth/ForgotView.vue";
import InviteView from "./components/auth/InviteView.vue";
import LoginView from "./components/auth/LoginView.vue";
import SignupView from "./components/auth/SignupView.vue";
import VerifyView from "./components/auth/VerifyView.vue";
import ChannelsView from "./components/channels/ChannelsView.vue";
import Conversations from "./components/Conversations.vue";
import ConversationDetail from "./components/conversations/ConversationDetail.vue";
import Dashboard from "./components/Dashboard.vue";
import Knowledge from "./components/Knowledge.vue";
import CollectionDetail from "./components/knowledge/CollectionDetail.vue";
import CollectionFiles from "./components/knowledge/Files.vue";
import CollectionSettings from "./components/knowledge/Settings.vue";
import CollectionStatistics from "./components/knowledge/Statistics.vue";
import DialogsOverlays from "./components/kit/DialogsOverlays.vue";
import Forms from "./components/kit/Forms.vue";
import KitShell from "./components/kit/KitShell.vue";
import NavigationStates from "./components/kit/NavigationStates.vue";
import Overview from "./components/kit/Overview.vue";
import Tables from "./components/kit/Tables.vue";
import NotFound from "./components/NotFound.vue";
import ProfileHelp from "./components/profile/Help.vue";
import ProfileNotificationHistory from "./components/profile/NotificationHistory.vue";
import ProfileSecurity from "./components/profile/Security.vue";
import ProfileSettings from "./components/profile/Settings.vue";
import ProfileShell from "./components/profile/ProfileShell.vue";
import Workspace from "./components/Workspace.vue";
import WorkspaceAudit from "./components/workspace/Audit.vue";
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
// no remaining consumer and is removed with this change. Five lightweight
// administration catalogs (Task A8.3) were added later, mirroring the
// cabinet's own `/users/`, `/providers/`, `/models/`, `/tariffs/` list-route
// paths and width (`requests` is a kit-only top-level addition — see the
// route block below).
const router = createRouter({
  // GitHub Pages serves 404.html for a direct deep link; that fallback stores
  // the requested path and returns to this history-mode app (see main.js).
  // Local development and every other host use the same clean URLs.
  history: createWebHistory(import.meta.env.BASE_URL),
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
    // Agent creation wizard (Stage A9, Task A9.2): the one route-driven entry
    // every "Создать агента" trigger resolves to — the persistent Navbar
    // action, the dashboard empty-state CTA, the catalog's own create card
    // and the `/agents?create=1` query-entry (Agents.vue redirects it here
    // instead of opening a local modal). Declared before `/agents/:id` so
    // its static `new` segment can never be shadowed by that dynamic
    // param (Vue Router's matcher scores static segments higher regardless
    // of declaration order, but the adjacency also keeps the two families
    // readable together). `:step?` makes each step directly linkable and
    // back/forward-able; `AgentWizard.vue` is the single controller that
    // reconciles the URL against the workspace's current draft
    // (`useWizardStore`, Task A9.1) — an invalid or missing step falls back
    // to the draft's own step instead of resetting it. The step
    // shell/content itself ships in Task A9.3; this route only owns
    // entry/fallback wiring.
    {
      path: "/agents/new/:step?",
      name: "agent-wizard",
      component: AgentWizard,
      meta: { contentMode: "contained" },
    },
    {
      path: "/agents/:id",
      component: AgentDetail,
      // No meta here: children set their own contentMode. Task A8.5 makes
      // every `/agents/:id/**` tab (playground, settings, channels)
      // `contained` — the earlier `fluid` playground/channels was leftover
      // from a pre-A8 draft of get.3xtr.im's own contract and let the detail
      // surface stretch full-width without a documented reason; the catalog
      // route above is untouched.
      children: [
        {
          path: "",
          name: "agent",
          component: AgentPlayground,
          meta: { contentMode: "contained" },
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
          meta: { contentMode: "contained" },
        },
        // Task A10.3: default-collection знания агента after the wizard —
        // reuses the same `/agents/:id/**` tab family as `settings`/`channels`
        // above instead of a second route tree under `/knowledge`.
        {
          path: "knowledge",
          name: "agent-knowledge",
          component: AgentKnowledge,
          meta: { contentMode: "contained" },
        },
      ],
    },

    // Conversations: list, and the open-dialog detail nested under a
    // `:agentId` parent path. Task A8.4 nests the detail route this way
    // (same path/name as before — `conversations-agent` keeps its own bare
    // `/conversations/:agentId` match since the child's path isn't empty) so
    // `Conversations.vue` can render the open dialog through its own nested
    // `<RouterView>` next to the still-visible list, instead of the two
    // being unrelated route trees. `:agentId` here only identifies which
    // agent's conversation to look up (`ConversationDetail.vue`'s own
    // lookup) — it does not scope the visible list to that agent; the list
    // page's own agent filter is a plain, route-independent ref
    // (`Conversations.vue`'s `agentFilter`), precisely so that opening a
    // dialog never drags the filter along with it. History and its
    // settings pane are no longer separate routed tabs (dropped along with
    // the `conversation-settings` route/NavbarTabs) — `ConversationDetail.vue`
    // toggles between them itself via the gear button in its header,
    // matching get.3xtr.im's own single-component + internal
    // properties-panel-toggle contract.
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
      children: [
        {
          path: ":conversationId",
          name: "conversation",
          component: ConversationDetail,
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
    // Task A8.5 makes every `/knowledge/:id/**` tab (files, settings,
    // statistics) `contained` for the same reason as the agent detail tabs
    // above; the catalog route is untouched.
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
          meta: { contentMode: "contained" },
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
          meta: { contentMode: "contained" },
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
        // Task A10.8 (`.plan` item 7, API Issue #109): capability-gated
        // audit of owner/member/access/settings changes — a separate
        // surface from the personal notification history below, not a
        // second bell/feed. `Audit.vue` decides its own permission-denied
        // presentation from `useWorkspaceStore().canViewAudit`.
        {
          path: "audit",
          name: "workspace-audit",
          component: WorkspaceAudit,
        },
      ],
    },

    // Profile and security: a route-driven shell (Task A5.9), mirroring
    // Workspace.vue — `ProfileShell.vue` teleports its `NavbarTabs` into the
    // Navbar and both children share its `contentMode: "contained"`.
    // `notifications`/`help` (Task A10.8) join this same shell/tab family —
    // both are permanent profile-menu entries per `.plan` item 7, not new
    // route trees of their own.
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
        {
          path: "notifications",
          name: "notification-history",
          component: ProfileNotificationHistory,
        },
        {
          path: "help",
          name: "help",
          component: ProfileHelp,
        },
      ],
    },

    // Administration (Task A8.3): five lightweight reference catalogs behind
    // the Sidebar "Администрирование" group — real named routes and
    // `contentMode`, but no forms/permissions/network, matching
    // get.3xtr.im's own list-route width (`fluid`, see `llms/routes.js`,
    // `users/routes.js`, `tariffs/routes.js`). Each screen is a standalone
    // component with its own fixture data (`src/stores/administration.js`);
    // there is no shared parent shell to keep — none of the five carries
    // nested tabs. `requests` has no top-level list route upstream (only
    // `/requests/:id` and `models/:id/requests`) — a kit-only addition
    // documented in `docs/design-system.md`, "Route families".
    {
      path: "/users",
      name: "administration-users",
      component: AdminUsers,
      meta: { contentMode: "fluid" },
    },
    {
      path: "/providers",
      name: "administration-providers",
      component: AdminProviders,
      meta: { contentMode: "fluid" },
    },
    {
      path: "/models",
      name: "administration-models",
      component: AdminModels,
      meta: { contentMode: "fluid" },
    },
    {
      path: "/tariffs",
      name: "administration-tariffs",
      component: AdminTariffs,
      meta: { contentMode: "fluid" },
    },
    {
      path: "/requests",
      name: "administration-requests",
      component: AdminRequests,
      meta: { contentMode: "fluid" },
    },

    // Auth (Task A5.10): fixture login/signup/forgot/verify/invite forms
    // sharing the `AuthPage` container (`src/components/auth/AuthPage.vue`).
    // The cabinet keeps auth routes outside `.tr-app-shell` entirely (no
    // Sidebar/Navbar, see `get.3xtr.im/src/App.vue`); the kit's `App.vue`
    // matches that with its own `isAuthRoute` check
    // (`route.path.startsWith("/auth/")`, Task A8.7) and renders a minimal
    // `Navbar` with no Sidebar/`.tr-app-shell` for these routes — see
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

    // Contract showcase (not a cabinet route). Task A8.6 splits the former
    // single-file `/kit` into a route-driven shell (`KitShell.vue`, mirroring
    // `ProfileShell.vue`/`Workspace.vue`) with five addressable sections.
    // The "overview" child keeps the pre-A8.6 route name `kit` (so the
    // Sidebar's existing `{ name: "kit" }` link and prefix-based active
    // check keep working unchanged) and its path carries an empty-path
    // `alias`, so the bare `/kit` URL still renders it directly — the
    // required backward-compatible entry point — without a redirect.
    {
      path: "/kit",
      component: KitShell,
      children: [
        {
          path: "overview",
          alias: "",
          name: "kit",
          component: Overview,
        },
        {
          path: "forms",
          name: "kit-forms",
          component: Forms,
        },
        {
          path: "tables",
          name: "kit-tables",
          component: Tables,
        },
        {
          path: "navigation-states",
          name: "kit-navigation-states",
          component: NavigationStates,
        },
        {
          path: "dialogs-overlays",
          name: "kit-dialogs-overlays",
          component: DialogsOverlays,
        },
        // Handoff.2 (.todo строки 761-828, требование 3): connected
        // application-shell scenario — trVue install order, sidebar with a
        // clickable TariffSummaryCard and Icon precedence in one route,
        // instead of separate isolated showcase blocks.
        {
          path: "application-shell",
          name: "kit-application-shell",
          component: ApplicationShell,
        },
      ],
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
