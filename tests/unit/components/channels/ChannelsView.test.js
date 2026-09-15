import { describe, expect, it, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { createMemoryHistory, createRouter } from "vue-router";
import Buefy from "buefy";

import ChannelsView from "../../../../src/components/channels/ChannelsView.vue";
import { useChannelsStore } from "../../../../src/stores/channels.js";
import { useDemoStore } from "../../../../src/stores/demo.js";
import { useModalStore } from "../../../../src/stores/modal.js";
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

// Task A7.3: каталог каналов агента подключён к глобальному demo-режиму
// (`useDemoStore()`, Task A7.1) — тот же контракт, что и `Agents.vue`:
// loading/empty/error через `ListAsyncState`, permission-denied прямым
// `AsyncState`, partial — `b-message`-баннером поверх доступных каналов.
async function mountChannelsView({ agentId = "1", demoMode } = {}) {
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
      { path: "/agents/:id/channels", name: "agent-channels", component: ChannelsView },
    ],
  });
  router.push(`/agents/${agentId}/channels`);
  await router.isReady();

  // `useSimulatedLoading` keeps `Loader` mounted for 300-900ms regardless of
  // demo-режим — fast-forward past it, same fix as Agents.test.js.
  vi.useFakeTimers();
  const wrapper = mount(ChannelsView, {
    global: {
      plugins: [pinia, router, Buefy],
    },
  });
  vi.advanceTimersByTime(1000);
  vi.useRealTimers();
  await flushPromises();

  return { wrapper };
}

describe("ChannelsView.vue — demo-состояния (Task A7.3)", () => {
  it("ready показывает существующие карточки каналов агента", async () => {
    const { wrapper } = await mountChannelsView();

    expect(wrapper.findAll(".tr-entity-card").length).toBeGreaterThan(0);
  });

  it("error: показывает ошибку и не рендерит карточки каналов", async () => {
    const { wrapper } = await mountChannelsView({ demoMode: "error" });

    expect(wrapper.find(".tr-async-state--error").exists()).toBe(true);
    expect(wrapper.findAll(".tr-entity-card").length).toBe(0);
  });

  it("empty: показывает пустое состояние даже когда у агента реально есть каналы", async () => {
    const { wrapper } = await mountChannelsView({ demoMode: "empty" });

    expect(wrapper.find(".tr-async-state--empty").exists()).toBe(true);
    expect(wrapper.findAll(".tr-entity-card").length).toBe(0);
  });

  it("permission-denied: показывает отказ в доступе через AsyncState", async () => {
    const { wrapper } = await mountChannelsView({ demoMode: "permission-denied" });

    expect(wrapper.find(".tr-async-state--permission-denied").exists()).toBe(true);
    expect(wrapper.findAll(".tr-entity-card").length).toBe(0);
  });

  it("partial: показывает баннер и оставляет доступные карточки каналов", async () => {
    const { wrapper } = await mountChannelsView({ demoMode: "partial" });

    expect(wrapper.find(".message.is-warning").exists()).toBe(true);
    expect(wrapper.findAll(".tr-entity-card").length).toBeGreaterThan(0);
  });
});

// Task A10.2: удаление канала подтверждается перед мутацией — «уточнить
// последствия удаления сущностей перед подтверждением» (`.plan` Stage A10).
describe("ChannelsView.vue — подтверждение удаления канала (Task A10.2)", () => {
  function findDeleteButton(wrapper) {
    return wrapper.findAll("button").find((button) => button.text().trim() === "Удалить");
  }

  it("отмена подтверждения не удаляет канал", async () => {
    const { wrapper } = await mountChannelsView({ agentId: "1" });
    const modalStore = useModalStore();
    const channelsStore = useChannelsStore();
    vi.spyOn(modalStore, "confirm").mockImplementation(() => {});

    const before = channelsStore.listByAgent("demo", "1").length;
    await findDeleteButton(wrapper).trigger("click");

    expect(modalStore.confirm).toHaveBeenCalledOnce();
    expect(channelsStore.listByAgent("demo", "1")).toHaveLength(before);
  });

  it("подтверждение удаляет канал", async () => {
    const { wrapper } = await mountChannelsView({ agentId: "1" });
    const modalStore = useModalStore();
    const channelsStore = useChannelsStore();
    vi.spyOn(modalStore, "confirm").mockImplementation((options) => options.onConfirm?.());

    const before = channelsStore.listByAgent("demo", "1").length;
    await findDeleteButton(wrapper).trigger("click");

    expect(channelsStore.listByAgent("demo", "1")).toHaveLength(before - 1);
  });
});
