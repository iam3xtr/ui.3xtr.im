import { describe, expect, it } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { createMemoryHistory, createRouter } from "vue-router";
import Buefy from "buefy";

import App from "../../src/App.vue";
import { useAuthStore } from "../../src/stores/auth.js";
import { useWorkspaceStore } from "../../src/stores/workspace.js";

// jsdom has no `matchMedia` — `Loader.vue` (mounted by any screen that uses
// `useSimulatedLoading`) reads it on mount; App.vue itself does not, but its
// default child route (Dashboard) does. See tests/unit/components/Agents.test.js
// for the same fix.
if (typeof window.matchMedia !== "function") {
  window.matchMedia = () => ({
    matches: false,
    media: "",
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  });
}

// jsdom's `localStorage` is not always a full Storage implementation in this
// runner (App.vue reads/writes `trickster-theme` on mount) — stub it the
// same way as `window.matchMedia` above.
if (typeof window.localStorage?.getItem !== "function") {
  const store = new Map();
  window.localStorage = {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
    clear: () => store.clear(),
  };
}

const IconStub = { name: "icon", props: ["name"], template: "<span />" };

// Task A8.7: closes the kit-only auth loop — "Выйти" from the user menu
// returns to `auth-login`, a successful demo-login returns to `dashboard`,
// direct `/auth/*` URLs render the minimal (Sidebar-less) shell, and the
// cycle repeats without a backend.
async function mountApp(initialPath = "/") {
  const pinia = createPinia();
  setActivePinia(pinia);

  useWorkspaceStore().activeWorkspaceId = "demo";

  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/", name: "dashboard", component: { template: "<div class=\"dashboard-stub\" />" } },
      { path: "/agents/", name: "agents", component: { template: "<div />" } },
      { path: "/conversations", name: "conversations", component: { template: "<div />" } },
      { path: "/knowledge/", name: "knowledge", component: { template: "<div />" } },
      { path: "/workspace/", name: "workspace", component: { template: "<div />" } },
      { path: "/kit", name: "kit", component: { template: "<div />" } },
      { path: "/users", name: "administration-users", component: { template: "<div />" } },
      { path: "/providers", name: "administration-providers", component: { template: "<div />" } },
      { path: "/models", name: "administration-models", component: { template: "<div />" } },
      { path: "/tariffs", name: "administration-tariffs", component: { template: "<div />" } },
      { path: "/requests", name: "administration-requests", component: { template: "<div />" } },
      { path: "/workspace/plans", name: "workspace-plans", component: { template: "<div />" } },
      {
        path: "/auth/login",
        name: "auth-login",
        component: { template: "<div class=\"auth-login-stub\" />" },
      },
      { path: "/auth/signup", name: "auth-signup", component: { template: "<div />" } },
    ],
  });
  router.push(initialPath);
  await router.isReady();

  const wrapper = mount(App, {
    global: {
      plugins: [pinia, router, Buefy],
      components: { icon: IconStub },
    },
  });
  await flushPromises();

  return { wrapper, router };
}

describe("App.vue — kit-only auth cycle (Task A8.7)", () => {
  it("«Выйти» из user-menu переводит на auth-login без вызова API", async () => {
    const { wrapper, router } = await mountApp("/");

    expect(wrapper.find(".tr-app-shell").exists()).toBe(true);

    await wrapper.find(".tr-dropdown-danger").trigger("click");
    await flushPromises();

    expect(router.currentRoute.value.name).toBe("auth-login");
  });

  it("logout сбрасывает pendingInvite фикстуры, не выполняя сетевой запрос", async () => {
    const { wrapper } = await mountApp("/");
    const authStore = useAuthStore();
    authStore.setPendingInvite({ token: "t", kind: "workspace", workspaceName: "Demo" });

    await wrapper.find(".tr-dropdown-danger").trigger("click");
    await flushPromises();

    expect(authStore.pendingInvite).toBeNull();
  });

  it("прямое открытие /auth/login рендерит минимальную оболочку без Sidebar", async () => {
    const { wrapper } = await mountApp("/auth/login");

    expect(wrapper.find(".tr-app-shell").exists()).toBe(false);
    expect(wrapper.find(".tr-sidebar").exists()).toBe(false);
    expect(wrapper.find(".auth-login-stub").exists()).toBe(true);
  });

  it("повторный цикл logout → login → logout переключает оболочку каждый раз", async () => {
    const { wrapper, router } = await mountApp("/");

    await wrapper.find(".tr-dropdown-danger").trigger("click");
    await flushPromises();
    expect(router.currentRoute.value.name).toBe("auth-login");
    expect(wrapper.find(".tr-app-shell").exists()).toBe(false);

    await router.push({ name: "dashboard" });
    await flushPromises();
    expect(wrapper.find(".tr-app-shell").exists()).toBe(true);

    await wrapper.find(".tr-dropdown-danger").trigger("click");
    await flushPromises();
    expect(router.currentRoute.value.name).toBe("auth-login");
  });
});
