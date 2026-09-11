import { describe, expect, it, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { createMemoryHistory, createRouter } from "vue-router";
import Buefy from "buefy";

import Usage from "../../../../src/components/workspace/Usage.vue";
import { useDemoStore } from "../../../../src/stores/demo.js";
import { useWorkspaceStore } from "../../../../src/stores/workspace.js";

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

// Task A7.5 review follow-up (Finding 6): `workspace/Usage.vue` subscribes
// to the global demo-режим — loading/permission-denied через `Loader`/прямой
// `AsyncState`, error — новая ветка `AsyncState variant="error"`, partial —
// `b-message`-баннером поверх карточек обзора. Нет отдельного empty (см.
// комментарий в самом компоненте).
async function mountUsage({ demoMode } = {}) {
  const pinia = createPinia();
  setActivePinia(pinia);

  const workspaceStore = useWorkspaceStore();
  workspaceStore.activeWorkspaceId = "demo";

  if (demoMode) {
    useDemoStore().setMode(demoMode);
  }

  // `Usage.vue` links to `{ name: 'workspace-plans' }` via `RouterLink`.
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/workspace", name: "workspace", component: Usage },
      { path: "/workspace/plans", name: "workspace-plans", component: { template: "<div />" } },
    ],
  });
  router.push("/workspace");
  await router.isReady();

  vi.useFakeTimers();
  const wrapper = mount(Usage, {
    global: {
      plugins: [pinia, router, Buefy],
    },
  });
  vi.advanceTimersByTime(1000);
  vi.useRealTimers();
  await flushPromises();

  return { wrapper };
}

describe("workspace/Usage.vue — demo-состояния (Task A7.5)", () => {
  it("ready показывает карточки пространства и использования", async () => {
    const { wrapper } = await mountUsage();

    expect(wrapper.findAll(".tr-card").length).toBeGreaterThan(0);
    expect(wrapper.find(".tr-async-state--permission-denied").exists()).toBe(false);
    expect(wrapper.find(".tr-async-state--error").exists()).toBe(false);
  });

  it("permission-denied показывает отказ в доступе через AsyncState", async () => {
    const { wrapper } = await mountUsage({ demoMode: "permission-denied" });

    expect(wrapper.find(".tr-async-state--permission-denied").exists()).toBe(true);
    expect(wrapper.findAll(".tr-card").length).toBe(0);
  });

  it("error показывает ошибку через AsyncState (новая ветка)", async () => {
    const { wrapper } = await mountUsage({ demoMode: "error" });

    expect(wrapper.find(".tr-async-state--error").exists()).toBe(true);
    expect(wrapper.findAll(".tr-card").length).toBe(0);
  });

  it("partial показывает баннер и оставляет карточки обзора", async () => {
    const { wrapper } = await mountUsage({ demoMode: "partial" });

    expect(wrapper.find(".message.is-warning").exists()).toBe(true);
    expect(wrapper.findAll(".tr-card").length).toBeGreaterThan(0);
  });
});
