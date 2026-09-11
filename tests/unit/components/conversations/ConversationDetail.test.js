import { describe, expect, it, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { createMemoryHistory, createRouter } from "vue-router";
import Buefy from "buefy";

import ConversationDetail from "../../../../src/components/conversations/ConversationDetail.vue";
import History from "../../../../src/components/conversations/History.vue";
import ConversationSettings from "../../../../src/components/conversations/Settings.vue";
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

// Task A7.5: detail-shell диалога (`conversations/ConversationDetail.vue`)
// подключён к глобальному demo-режиму тем же приёмом, что
// `agents/AgentDetail.vue`/`knowledge/CollectionDetail.vue` (Task A7.4) —
// route-валидация всегда побеждает над demo-режимом.
async function mountConversationDetail({ agentId = "1", conversationId = "1", demoMode } = {}) {
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
      { path: "/conversations/:agentId", name: "conversations-agent", component: { template: "<div />" } },
      {
        path: "/conversations/:agentId/:conversationId",
        component: ConversationDetail,
        children: [
          { path: "", name: "conversation", component: History },
          { path: "settings", name: "conversation-settings", component: ConversationSettings },
        ],
      },
    ],
  });
  router.push(`/conversations/${agentId}/${conversationId}`);
  await router.isReady();

  // See `agents/AgentDetail.test.js` for why this needs
  // `advanceTimersByTimeAsync(2000)` rather than one delay window: mounting
  // the shell directly makes its own `<RouterView>` render itself once more
  // before reaching the real child tab, doubling up `useSimulatedLoading`.
  vi.useFakeTimers();
  const wrapper = mount(ConversationDetail, {
    global: {
      plugins: [pinia, router, Buefy],
    },
  });
  await vi.advanceTimersByTimeAsync(2000);
  vi.useRealTimers();
  await flushPromises();

  return { wrapper };
}

describe("ConversationDetail.vue — demo-состояния (Task A7.5)", () => {
  it("ready показывает содержимое найденного диалога", async () => {
    const { wrapper } = await mountConversationDetail();

    expect(wrapper.find(".tr-async-state--error").exists()).toBe(false);
    expect(wrapper.find(".tr-async-state--permission-denied").exists()).toBe(false);
    expect(wrapper.findComponent(History).exists()).toBe(true);
  });

  it("несуществующий диалог показывает route fallback независимо от demo-режима", async () => {
    const { wrapper } = await mountConversationDetail({ conversationId: "999", demoMode: "permission-denied" });

    expect(wrapper.find(".tr-async-state--error").exists()).toBe(true);
    expect(wrapper.text()).toContain("Диалог не найден");
    expect(wrapper.find(".tr-async-state--permission-denied").exists()).toBe(false);
  });

  it("permission-denied для найденного диалога показывает отказ в доступе через AsyncState", async () => {
    const { wrapper } = await mountConversationDetail({ demoMode: "permission-denied" });

    expect(wrapper.find(".tr-async-state--permission-denied").exists()).toBe(true);
    expect(wrapper.findComponent(History).exists()).toBe(false);
  });

  it("error для найденного диалога показывает ошибку через ListAsyncState", async () => {
    const { wrapper } = await mountConversationDetail({ demoMode: "error" });

    expect(wrapper.find(".tr-async-state--error").exists()).toBe(true);
    expect(wrapper.text()).not.toContain("Диалог не найден");
  });

  it("partial на вкладке истории показывает баннер и оставляет сообщения", async () => {
    const { wrapper } = await mountConversationDetail({ demoMode: "partial" });

    expect(wrapper.find(".message.is-warning").exists()).toBe(true);
    expect(wrapper.find(".tr-conversation-messages").exists()).toBe(true);
  });
});
