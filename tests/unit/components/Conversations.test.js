import { describe, expect, it, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { createMemoryHistory, createRouter } from "vue-router";
import Buefy from "buefy";

import Conversations from "../../../src/components/Conversations.vue";
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

// Task A7.3: список диалогов подключён к глобальному demo-режиму
// (`useDemoStore()`, Task A7.1) — тот же контракт, что и `Agents.vue`/
// `ChannelsView.vue`: loading/empty/error через `ListAsyncState`,
// permission-denied прямым `AsyncState`, partial — `b-message`-баннером
// поверх доступных диалогов.
async function mountConversations({ demoMode } = {}) {
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
      { path: "/conversations", name: "conversations", component: Conversations },
      { path: "/conversations/:agentId", name: "conversations-agent", component: Conversations },
      { path: "/agents/:agentId/conversations/:conversationId", name: "conversation", component: { template: "<div />" } },
    ],
  });
  router.push("/conversations");
  await router.isReady();

  vi.useFakeTimers();
  const wrapper = mount(Conversations, {
    global: {
      plugins: [pinia, router, Buefy],
    },
  });
  vi.advanceTimersByTime(1000);
  vi.useRealTimers();
  await flushPromises();

  return { wrapper };
}

describe("Conversations.vue — demo-состояния (Task A7.3)", () => {
  it("ready показывает существующий список диалогов", async () => {
    const { wrapper } = await mountConversations();

    expect(wrapper.findAll(".tr-conversation-item").length).toBeGreaterThan(0);
  });

  it("error: показывает ошибку и не рендерит список диалогов", async () => {
    const { wrapper } = await mountConversations({ demoMode: "error" });

    expect(wrapper.find(".tr-async-state--error").exists()).toBe(true);
    expect(wrapper.findAll(".tr-conversation-item").length).toBe(0);
  });

  it("empty: показывает пустое состояние даже когда диалоги реально есть", async () => {
    const { wrapper } = await mountConversations({ demoMode: "empty" });

    expect(wrapper.find(".tr-async-state--empty").exists()).toBe(true);
    expect(wrapper.findAll(".tr-conversation-item").length).toBe(0);
  });

  it("permission-denied: показывает отказ в доступе через AsyncState", async () => {
    const { wrapper } = await mountConversations({ demoMode: "permission-denied" });

    expect(wrapper.find(".tr-async-state--permission-denied").exists()).toBe(true);
    expect(wrapper.findAll(".tr-conversation-item").length).toBe(0);
  });

  it("partial: показывает баннер и оставляет доступные диалоги", async () => {
    const { wrapper } = await mountConversations({ demoMode: "partial" });

    expect(wrapper.find(".message.is-warning").exists()).toBe(true);
    expect(wrapper.findAll(".tr-conversation-item").length).toBeGreaterThan(0);
  });
});
