import { describe, expect, it, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { createMemoryHistory, createRouter } from "vue-router";
import { ref } from "vue";
import Buefy from "buefy";

import CollectionDetail from "../../../../src/components/knowledge/CollectionDetail.vue";
import CollectionFiles from "../../../../src/components/knowledge/Files.vue";
import CollectionSettings from "../../../../src/components/knowledge/Settings.vue";
import CollectionStatistics from "../../../../src/components/knowledge/Statistics.vue";
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

// `useSimulatedLoading` is used twice on this route tree — once by
// `CollectionDetail.vue` itself and once more by whichever child tab is
// active (e.g. `Files.vue`) — with real (or fake-timer-raced) delays, the
// two nested, independently randomized timers were never reliably settled by
// a single `advanceTimersByTimeAsync` window, making this file flaky (~30-40%
// failure rate, reproduced directly). Mocked to resolve instantly and
// deterministically instead of racing timers at all.
vi.mock("../../../../src/composables/useSimulatedLoading.js", () => ({
  useSimulatedLoading: () => ({ isLoading: ref(false) }),
}));

// Task A7.4: маршруты коллекции знаний (`CollectionDetail.vue` + вложенные
// Files/Settings/Statistics) подключены к глобальному demo-режиму
// (`useDemoStore()`, Task A7.1). Route-валидация (несуществующий `:id`)
// всегда побеждает над demo-режимом — не маскируется им.
async function mountCollection({ collectionId = "1", demoMode, path } = {}) {
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
      {
        path: "/knowledge/:id",
        component: CollectionDetail,
        children: [
          { path: "", name: "knowledge-collection", component: CollectionFiles },
          { path: "settings", name: "knowledge-collection-settings", component: CollectionSettings },
          { path: "statistics", name: "knowledge-collection-statistics", component: CollectionStatistics },
        ],
      },
      { path: "/knowledge", name: "knowledge", component: { template: "<div />" } },
    ],
  });
  router.push(path ?? `/knowledge/${collectionId}`);
  await router.isReady();

  const wrapper = mount(CollectionDetail, {
    global: {
      plugins: [pinia, router, Buefy],
    },
  });
  await flushPromises();

  return { wrapper };
}

describe("CollectionDetail.vue — route fallback vs demo-режим (Task A7.4)", () => {
  it("несуществующий id показывает fallback «не найдена» независимо от demo-режима «ready»", async () => {
    const { wrapper } = await mountCollection({ collectionId: "does-not-exist", demoMode: "ready" });

    expect(wrapper.find(".tr-async-state--error").exists()).toBe(true);
    expect(wrapper.text()).toContain("Коллекция не найдена");
  });

  it("несуществующий id показывает fallback «не найдена», а не demo empty-состояние", async () => {
    const { wrapper } = await mountCollection({ collectionId: "does-not-exist", demoMode: "empty" });

    expect(wrapper.find(".tr-async-state--error").exists()).toBe(true);
    expect(wrapper.text()).toContain("Коллекция не найдена");
    expect(wrapper.find(".tr-async-state--empty").exists()).toBe(false);
  });

  it("несуществующий id показывает fallback «не найдена», а не demo permission-denied", async () => {
    const { wrapper } = await mountCollection({ collectionId: "does-not-exist", demoMode: "permission-denied" });

    expect(wrapper.find(".tr-async-state--error").exists()).toBe(true);
    expect(wrapper.text()).toContain("Коллекция не найдена");
    expect(wrapper.find(".tr-async-state--permission-denied").exists()).toBe(false);
  });

  it("существующая коллекция с ready показывает вкладки и содержимое", async () => {
    const { wrapper } = await mountCollection({ demoMode: "ready" });

    expect(wrapper.find(".tr-async-state--error").exists()).toBe(false);
    expect(wrapper.findComponent(CollectionFiles).exists()).toBe(true);
  });

  it("demo error на найденной коллекции показывает ошибку через ListAsyncState", async () => {
    const { wrapper } = await mountCollection({ demoMode: "error" });

    expect(wrapper.find(".tr-async-state--error").exists()).toBe(true);
    expect(wrapper.text()).not.toContain("Коллекция не найдена");
  });

  it("demo permission-denied на найденной коллекции показывает отказ в доступе", async () => {
    const { wrapper } = await mountCollection({ demoMode: "permission-denied" });

    expect(wrapper.find(".tr-async-state--permission-denied").exists()).toBe(true);
    expect(wrapper.findComponent(CollectionFiles).exists()).toBe(false);
  });

  it("partial на вкладке Файлы показывает баннер и оставляет таблицу файлов", async () => {
    const { wrapper } = await mountCollection({ demoMode: "partial" });

    expect(wrapper.find(".message.is-warning").exists()).toBe(true);
    // The explicit picker (`b-upload`) stays available — no dedicated class
    // any more (Issue #3.2 fix), so assert by its own visible label instead.
    expect(wrapper.text()).toContain("Загрузить файлы");
  });

  it("partial на вкладке Статистика показывает баннер и оставляет числа", async () => {
    const { wrapper } = await mountCollection({ demoMode: "partial", path: "/knowledge/1/statistics" });

    expect(wrapper.find(".message.is-warning").exists()).toBe(true);
    expect(wrapper.find(".tr-knowledge-stats").exists()).toBe(true);
  });
});
