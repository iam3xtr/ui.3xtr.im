import { describe, expect, it } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { createMemoryHistory, createRouter } from "vue-router";
import { defineComponent, h } from "vue";
import Buefy from "buefy";

import App from "../../src/App.vue";
import Navbar from "../../src/components/Navbar.vue";
import { useAuthStore } from "../../src/stores/auth.js";
import { useWorkspaceStore } from "../../src/stores/workspace.js";
import { useDirtyExitGuard } from "../../src/composables/useDirtyExitGuard.js";

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
async function mountApp(initialPath = "/", extraRoutes = []) {
  const pinia = createPinia();
  setActivePinia(pinia);

  useWorkspaceStore().activeWorkspaceId = "demo";

  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/", name: "dashboard", component: { template: "<div class=\"dashboard-stub\" />" } },
      ...extraRoutes,
      { path: "/agents/", name: "agents", component: { template: "<div />" } },
      { path: "/agents/new/:step?", name: "agent-wizard", component: { template: "<div />" } },
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

// Task A10.7 ("Смена контекста не переносит tenant data/form edits без
// выбора"): switching the active workspace (or creating a new one) routes
// through `dashboard` first, reusing the same `useDirtyExitGuard`
// (`onBeforeRouteLeave`) any savable form already wires up — a dirty screen
// must not lose input silently just because the workspace changed underneath
// it, and the switch itself is not applied while the guard keeps the user on
// the page ("Остаться").
function makeDirtyFormRoute(isDirtyRef) {
  return defineComponent({
    setup() {
      const guard = useDirtyExitGuard({
        isDirty: () => isDirtyRef.value,
        onSave: () => ({ ok: true }),
        onDiscard: () => {
          isDirtyRef.value = false;
        },
      });
      return () => h("div", { class: "dirty-form-stub" }, [
        h("span", { class: "active" }, String(guard.active.value)),
        h("button", { class: "stay", onClick: guard.stay }),
        h("button", { class: "discard", onClick: guard.confirmDiscard }),
      ]);
    },
  });
}

describe("App.vue — изоляция при смене пространства (Task A10.7)", () => {
  it("переключение пространства при чистой форме уходит на dashboard и применяется", async () => {
    const isDirty = { value: false };
    const { wrapper, router } = await mountApp("/dirty", [
      { path: "/dirty", name: "dirty-form", component: makeDirtyFormRoute(isDirty) },
    ]);

    expect(router.currentRoute.value.name).toBe("dirty-form");

    const navbar = wrapper.findComponent(Navbar);
    navbar.vm.$emit("update:workspace", "trickster");
    await flushPromises();

    expect(router.currentRoute.value.name).toBe("dashboard");
    expect(useWorkspaceStore().activeWorkspaceId).toBe("trickster");
  });

  it("грязная форма блокирует переключение пространства, пока не выбрано явное действие", async () => {
    const isDirty = { value: true };
    const { wrapper, router } = await mountApp("/dirty", [
      { path: "/dirty", name: "dirty-form", component: makeDirtyFormRoute(isDirty) },
    ]);

    const navbar = wrapper.findComponent(Navbar);
    navbar.vm.$emit("update:workspace", "trickster");
    await flushPromises();

    // The dirty-exit dialog is open and the switch has not been applied.
    expect(wrapper.find(".dirty-form-stub .active").text()).toBe("true");
    expect(router.currentRoute.value.name).toBe("dirty-form");
    expect(useWorkspaceStore().activeWorkspaceId).toBe("demo");

    await wrapper.find(".dirty-form-stub .stay").trigger("click");
    await flushPromises();

    // "Остаться" — the switch is abandoned, not applied underneath the edit.
    expect(router.currentRoute.value.name).toBe("dirty-form");
    expect(useWorkspaceStore().activeWorkspaceId).toBe("demo");
  });

  it("«Выйти без сохранения» отпускает форму и завершает переключение пространства", async () => {
    const isDirty = { value: true };
    const { wrapper, router } = await mountApp("/dirty", [
      { path: "/dirty", name: "dirty-form", component: makeDirtyFormRoute(isDirty) },
    ]);

    const navbar = wrapper.findComponent(Navbar);
    navbar.vm.$emit("update:workspace", "trickster");
    await flushPromises();

    await wrapper.find(".dirty-form-stub .discard").trigger("click");
    await flushPromises();

    expect(router.currentRoute.value.name).toBe("dashboard");
    expect(useWorkspaceStore().activeWorkspaceId).toBe("trickster");
  });

  it("создание пространства проходит через тот же guard, что и обычное переключение", async () => {
    const isDirty = { value: true };
    const { wrapper, router } = await mountApp("/dirty", [
      { path: "/dirty", name: "dirty-form", component: makeDirtyFormRoute(isDirty) },
    ]);

    const navbar = wrapper.findComponent(Navbar);
    navbar.vm.$emit("create-workspace");
    await flushPromises();

    expect(router.currentRoute.value.name).toBe("dirty-form");
    expect(useWorkspaceStore().workspaces).toHaveLength(3);

    await wrapper.find(".dirty-form-stub .discard").trigger("click");
    await flushPromises();

    expect(router.currentRoute.value.name).toBe("dashboard");
    expect(useWorkspaceStore().workspaces).toHaveLength(4);
  });
});
