import { describe, expect, it, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { createMemoryHistory, createRouter } from "vue-router";
import Buefy from "buefy";

import Dashboard from "../../../src/components/Dashboard.vue";
import { useDemoStore } from "../../../src/stores/demo.js";
import { useWorkspaceStore } from "../../../src/stores/workspace.js";

// jsdom has no `matchMedia` — `Loader.vue` reads it on mount (see
// tests/unit/components/Agents.test.js for the same fix).
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

// Task A7.5: `Dashboard.vue` подключён к глобальному demo-режиму —
// loading/permission-denied/error через `Loader`/прямой `AsyncState` (тот
// же приём, что `Agents.vue`, Task A7.3), `empty` расширяет уже
// существующую CTA-карточку «Создать первого агента», partial —
// `b-message`-баннером поверх виджетов.
async function mountDashboard({ demoMode } = {}) {
  const pinia = createPinia();
  setActivePinia(pinia);

  const workspaceStore = useWorkspaceStore();
  workspaceStore.activeWorkspaceId = "demo";

  if (demoMode) {
    useDemoStore().setMode(demoMode);
  }

  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/", name: "dashboard", component: Dashboard },
      { path: "/agents", name: "agents", component: { template: "<div />" } },
      { path: "/agents/new/:step?", name: "agent-wizard", component: { template: "<div />" } },
      { path: "/conversations", name: "conversations", component: { template: "<div />" } },
      { path: "/knowledge", name: "knowledge", component: { template: "<div />" } },
      { path: "/workspace/settings", name: "workspace-settings", component: { template: "<div />" } },
      { path: "/workspace/plans", name: "workspace-plans", component: { template: "<div />" } },
      { path: "/profile", name: "profile", component: { template: "<div />" } },
    ],
  });
  router.push("/");
  await router.isReady();

  vi.useFakeTimers();
  const wrapper = mount(Dashboard, {
    global: {
      plugins: [pinia, router, Buefy],
    },
  });
  vi.advanceTimersByTime(1000);
  vi.useRealTimers();
  await flushPromises();

  return { wrapper, router };
}

describe("Dashboard.vue — demo-состояния (Task A7.5)", () => {
  it("ready показывает плитки навигации", async () => {
    const { wrapper } = await mountDashboard();

    expect(wrapper.findAll(".tr-dashboard-link").length).toBeGreaterThan(0);
    expect(wrapper.find(".tr-async-state--permission-denied").exists()).toBe(false);
  });

  it("permission-denied показывает отказ в доступе через AsyncState", async () => {
    const { wrapper } = await mountDashboard({ demoMode: "permission-denied" });

    expect(wrapper.find(".tr-async-state--permission-denied").exists()).toBe(true);
    expect(wrapper.findAll(".tr-dashboard-link").length).toBe(0);
  });

  it("error показывает ошибку через AsyncState", async () => {
    const { wrapper } = await mountDashboard({ demoMode: "error" });

    expect(wrapper.find(".tr-async-state--error").exists()).toBe(true);
    expect(wrapper.findAll(".tr-dashboard-link").length).toBe(0);
  });

  it("empty форсирует CTA-карточку создания первого агента даже когда агенты реально есть", async () => {
    const { wrapper } = await mountDashboard({ demoMode: "empty" });

    expect(wrapper.find(".tr-dashboard-create").exists()).toBe(true);
    expect(wrapper.findAll(".tr-dashboard-link").length).toBe(0);
  });

  // Task A9.2: пустой dashboard — один из точек входа в общий route-driven
  // мастер, а не в отдельную форму каталога.
  it("CTA пустого dashboard ведёт в общий мастер создания агента", async () => {
    const { wrapper, router } = await mountDashboard({ demoMode: "empty" });

    await wrapper.find(".tr-dashboard-create").trigger("click");
    await flushPromises();

    expect(router.currentRoute.value.name).toBe("agent-wizard");
  });

  it("partial показывает баннер и оставляет виджеты обзора", async () => {
    const { wrapper } = await mountDashboard({ demoMode: "partial" });

    expect(wrapper.find(".message.is-warning").exists()).toBe(true);
    expect(wrapper.findAll(".tr-dashboard-link").length).toBeGreaterThan(0);
  });
});
