import { describe, expect, it, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { createMemoryHistory, createRouter } from "vue-router";
import Buefy from "buefy";

import Knowledge from "../../../../src/components/Knowledge.vue";
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

// Task A7.4: каталог коллекций знаний подключён к глобальному demo-режиму
// (`useDemoStore()`, Task A7.1) — тот же контракт, что `Agents.vue`/
// `ChannelsView.vue`/`Conversations.vue` (Task A7.3): loading/empty/error
// через `ListAsyncState`, permission-denied прямым `AsyncState`, partial —
// `b-message`-баннером поверх доступных карточек.
async function mountKnowledge({ demoMode } = {}) {
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
      { path: "/knowledge", name: "knowledge", component: Knowledge },
      { path: "/knowledge/:id", name: "knowledge-collection", component: { template: "<div />" } },
    ],
  });
  router.push("/knowledge");
  await router.isReady();

  vi.useFakeTimers();
  const wrapper = mount(Knowledge, {
    global: {
      plugins: [pinia, router, Buefy],
    },
  });
  vi.advanceTimersByTime(1000);
  vi.useRealTimers();
  await flushPromises();

  return { wrapper };
}

describe("Knowledge.vue — demo-состояния (Task A7.4)", () => {
  it("ready показывает существующие карточки коллекций", async () => {
    const { wrapper } = await mountKnowledge();

    expect(wrapper.findAll(".tr-entity-card__title").length).toBeGreaterThan(0);
    expect(wrapper.find(".message.is-warning").exists()).toBe(false);
    expect(wrapper.find(".tr-async-state--permission-denied").exists()).toBe(false);
  });

  it("error: показывает ошибку и не рендерит карточки каталога", async () => {
    const { wrapper } = await mountKnowledge({ demoMode: "error" });

    expect(wrapper.find(".tr-async-state--error").exists()).toBe(true);
    expect(wrapper.findAll(".tr-entity-card").length).toBe(0);
  });

  it("empty: показывает пустое состояние даже когда в рабочем пространстве реально есть коллекции", async () => {
    const { wrapper } = await mountKnowledge({ demoMode: "empty" });

    expect(wrapper.find(".tr-async-state--empty").exists()).toBe(true);
    expect(wrapper.findAll(".tr-entity-card--interactive:not(.tr-entity-card--create)").length).toBe(0);
  });

  it("permission-denied: показывает отказ в доступе через AsyncState", async () => {
    const { wrapper } = await mountKnowledge({ demoMode: "permission-denied" });

    expect(wrapper.find(".tr-async-state--permission-denied").exists()).toBe(true);
    expect(wrapper.findAll(".tr-entity-card").length).toBe(0);
  });

  it("partial: показывает баннер и оставляет доступные карточки коллекций", async () => {
    const { wrapper } = await mountKnowledge({ demoMode: "partial" });

    expect(wrapper.find(".message.is-warning").exists()).toBe(true);
    expect(wrapper.findAll(".tr-entity-card__title").length).toBeGreaterThan(0);
  });
});
