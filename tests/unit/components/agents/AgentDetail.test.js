import { describe, expect, it, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { createMemoryHistory, createRouter } from "vue-router";
import Buefy from "buefy";

import AgentDetail from "../../../../src/components/agents/AgentDetail.vue";
import AgentPlayground from "../../../../src/components/agents/AgentPlayground.vue";
import AgentSettings from "../../../../src/components/agents/AgentSettings.vue";
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

// Task A7.5: detail-shell агента (`agents/AgentDetail.vue`) подключён к
// глобальному demo-режиму (`useDemoStore()`, Task A7.1) тем же приёмом, что
// `knowledge/CollectionDetail.vue` (Task A7.4) — route-валидация всегда
// побеждает над demo-режимом, а когда агент найден, тот же `ListAsyncState`
// дополнительно отражает `isLoading`/`isError`, permission-denied — прямым
// `AsyncState`.
async function mountAgentDetail({ id = "1", demoMode } = {}) {
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
      { path: "/agents", name: "agents", component: { template: "<div />" } },
      {
        path: "/agents/:id",
        component: AgentDetail,
        children: [
          { path: "", name: "agent", component: AgentPlayground },
          { path: "settings", name: "agent-settings", component: AgentSettings },
          { path: "channels", name: "agent-channels", component: { template: "<div />" } },
        ],
      },
    ],
  });
  router.push(`/agents/${id}`);
  await router.isReady();

  // Mounting `AgentDetail` directly (rather than under an ancestor
  // `RouterView`, as in the real app shell) makes its own `<RouterView>`
  // resolve at depth 0 — i.e. render `AgentDetail` itself once more before
  // depth 1 reaches the real child tab. That inner instance runs its own
  // `useSimulatedLoading` timer on top of the outer one, so settling needs
  // more than one delay window — the same `advanceTimersByTimeAsync(2000)`
  // margin `knowledge/CollectionDetail.test.js` uses for its own two-level
  // loading (Task A7.4).
  vi.useFakeTimers();
  const wrapper = mount(AgentDetail, {
    global: {
      plugins: [pinia, router, Buefy],
    },
  });
  await vi.advanceTimersByTimeAsync(2000);
  vi.useRealTimers();
  await flushPromises();

  return { wrapper };
}

describe("AgentDetail.vue — demo-состояния (Task A7.5)", () => {
  it("ready показывает содержимое найденного агента", async () => {
    const { wrapper } = await mountAgentDetail();

    expect(wrapper.find(".tr-async-state--error").exists()).toBe(false);
    expect(wrapper.find(".tr-async-state--permission-denied").exists()).toBe(false);
    expect(wrapper.findComponent(AgentPlayground).exists()).toBe(true);
  });

  it("несуществующий id показывает route fallback независимо от demo-режима", async () => {
    const { wrapper } = await mountAgentDetail({ id: "999", demoMode: "permission-denied" });

    expect(wrapper.find(".tr-async-state--error").exists()).toBe(true);
    expect(wrapper.text()).toContain("Агент не найден");
    expect(wrapper.find(".tr-async-state--permission-denied").exists()).toBe(false);
  });

  it("permission-denied для найденного агента показывает отказ в доступе через AsyncState", async () => {
    const { wrapper } = await mountAgentDetail({ demoMode: "permission-denied" });

    expect(wrapper.find(".tr-async-state--permission-denied").exists()).toBe(true);
    expect(wrapper.findComponent(AgentPlayground).exists()).toBe(false);
  });

  it("error для найденного агента показывает ошибку через ListAsyncState", async () => {
    const { wrapper } = await mountAgentDetail({ demoMode: "error" });

    expect(wrapper.find(".tr-async-state--error").exists()).toBe(true);
    expect(wrapper.text()).not.toContain("Агент не найден");
  });

  it("partial на вкладке песочницы показывает баннер и оставляет сообщения", async () => {
    const { wrapper } = await mountAgentDetail({ demoMode: "partial" });

    expect(wrapper.find(".message.is-warning").exists()).toBe(true);
    expect(wrapper.find(".tr-conversation-messages").exists()).toBe(true);
  });
});
