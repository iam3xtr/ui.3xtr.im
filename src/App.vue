<template>
  <div
    class="tr-app"
    :class="{ 'tr-app--fluid': isFluidContent }"
  >
    <template v-if="isAuthRoute">
      <Navbar
        minimal
        v-model:workspace="workspace"
        v-model:is-dark="isDark"
        :workspaces="workspaces"
        :user="user"
      />

      <RouterView />
    </template>

    <template v-else>
      <Navbar
        :workspace="workspace"
        v-model:is-dark="isDark"
        :workspaces="workspaces"
        :user="user"
        @update:workspace="handleWorkspaceSwitch"
        @create-workspace="handleCreateWorkspace"
        @logout="handleLogout"
      >
        <template #menu>
          <div ref="navbarMenuTarget" class="tr-topbar__menu" />
        </template>
      </Navbar>

      <div class="tr-app-shell">
        <Sidebar />

        <div class="tr-main">
          <main class="tr-page">
            <div
              class="tr-page__content"
              :class="{ 'tr-page__content--fluid': isFluidContent }"
            >
              <RouterView />
            </div>
          </main>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { storeToRefs } from "pinia";
import {
  computed, onMounted, provide, ref, shallowRef, watch,
} from "vue";
import {
  isNavigationFailure, RouterView, useRoute, useRouter,
} from "vue-router";

import { navbarMenuKey } from "@iam3xtr/vue";

import Navbar from "./components/Navbar.vue";
import Sidebar from "./components/Sidebar.vue";
import { useAuthStore } from "./stores/auth";
import { useWorkspaceStore } from "./stores/workspace";

/** @typedef {"light" | "dark"} Theme */

const user = {
  firstName: "Иван",
  lastName: "Петров",
  role: "Владелец",
};

const workspaceStore = useWorkspaceStore();
const {
  workspaces,
  activeWorkspaceId: workspace,
} = storeToRefs(workspaceStore);
const authStore = useAuthStore();
const isDark = ref(false);
const route = useRoute();
const router = useRouter();

const navbarMenuTarget = shallowRef(null);
provide(navbarMenuKey, navbarMenuTarget);

const isFluidContent = computed(
  () => route.meta.contentMode === "fluid",
);

// Same check as get.3xtr.im's App.vue (`route.path.startsWith('/auth/')`):
// auth screens get a bare Navbar and no Sidebar/`.tr-app-shell`, matching
// the cabinet instead of the full product shell (see docs/design-system.md,
// "Application shell").
const isAuthRoute = computed(() => route.path.startsWith("/auth/"));

// Task A8.7: closes the demo auth loop — "Выйти" in the user menu has no
// real session to invalidate (see stores/auth.js, `logout()`), it only
// drops the in-memory continuation state and returns to the login screen;
// a successful demo-login (`LoginView.vue`) already routes back to
// `dashboard`, so the cycle (login → logout → login → ...) and direct
// `/auth/*` URLs all resolve without a backend.
function handleLogout() {
  authStore.logout();
  router.push({ name: "auth-login" });
}

/**
 * Tenant-switch isolation (Task A10.7, `.plan` "Пространство и регистрация
 * без лишнего обязательного выбора"): switching the active workspace or
 * creating a new one must not silently carry a dirty form or a detail-page
 * selection from the previous context along with it. Routing back to
 * `dashboard` first — rather than only reassigning `activeWorkspaceId` in
 * place — reuses the existing per-form `useDirtyExitGuard`
 * (`onBeforeRouteLeave`) exactly as its own comment already anticipated
 * ("route change, workspace switch or locale change"): a dirty screen shows
 * its save/discard/stay dialog and can block the switch by resolving
 * "Остаться" (`isNavigationFailure`), and any per-screen selection/filter
 * state is discarded for free by the resulting unmount, instead of staying
 * on screen now attributed to a different workspace.
 * @param {() => void} action
 */
async function runAfterLeavingWorkspaceContext(action) {
  if (route.name !== "dashboard") {
    const failure = await router.push({ name: "dashboard" });
    if (isNavigationFailure(failure)) {
      return;
    }
  }
  action();
}

/** @param {string} id */
function handleWorkspaceSwitch(id) {
  if (id === workspace.value) {
    return;
  }
  runAfterLeavingWorkspaceContext(() => {
    workspace.value = id;
  });
}

function handleCreateWorkspace() {
  runAfterLeavingWorkspaceContext(() => {
    workspaceStore.createWorkspace();
  });
}

/**
 * @param {Theme} theme
 */
function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem("trickster-theme", theme);
}

watch(isDark, (value) => {
  applyTheme(value ? "dark" : "light");
});

onMounted(() => {
  /** @type {Theme | null} */
  const saved = localStorage.getItem("trickster-theme");
  /** @type {Theme} */
  const preferred = window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
  /** @type {Theme} */
  const initial = saved ?? preferred;

  isDark.value = initial === "dark";
  applyTheme(initial);
});
</script>
