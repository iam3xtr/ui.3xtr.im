import { describe, expect, it } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { createMemoryHistory, createRouter } from "vue-router";
import Buefy from "buefy";

import AgentPlayground from "../../../../src/components/agents/AgentPlayground.vue";
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

// The sandbox's properties aside (temperature + system prompt, the
// runtime-affecting fields moved out of `AgentSettings.vue`'s routed tab) is
// a second grid column next to the chat panel — same mechanism as
// `conversations/ConversationDetail.vue`, but with a local `propertiesOpen`
// ref instead of provide/inject, since this component owns its own
// `.tr-conversations` grid directly. This message's fix: open by default
// (it only disappears once a narrow viewport collapses the grid to one pane
// at a time — not exercised here, this suite only covers the JS-level
// toggle), the gear only shows once it's closed, and leaving it uses the
// aside's own arrow-left rather than a `×` — there is no close button.
async function mountPlayground({ id = "1" } = {}) {
  const pinia = createPinia();
  setActivePinia(pinia);

  const workspaceStore = useWorkspaceStore();
  workspaceStore.activeWorkspaceId = "demo";

  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/agents", name: "agents", component: { template: "<div />" } },
      { path: "/agents/:id", name: "agent", component: AgentPlayground },
    ],
  });
  router.push(`/agents/${id}`);
  await router.isReady();

  const wrapper = mount(AgentPlayground, {
    global: { plugins: [pinia, router, Buefy] },
  });
  await flushPromises();

  return { wrapper };
}

describe("AgentPlayground.vue — панель настроек песочницы открыта по умолчанию", () => {
  it("по умолчанию показывает панель с температурой и системной инструкцией, без шестерёнки", async () => {
    const { wrapper } = await mountPlayground();

    expect(wrapper.find(".tr-conversation-properties").exists()).toBe(true);
    expect(wrapper.text()).toContain("Температура");
    expect(wrapper.text()).toContain("Системная инструкция");
    expect(wrapper.find(".tr-conversation-settings-action").exists()).toBe(false);
    expect(wrapper.find(".tr-conversation-properties-close").exists()).toBe(false);
  });

  it("стрелка влево в шапке панели закрывает её и после этого появляется шестерёнка", async () => {
    const { wrapper } = await mountPlayground();

    await wrapper.find(".tr-conversation-properties-action").trigger("click");

    expect(wrapper.find(".tr-conversation-properties").exists()).toBe(false);
    expect(wrapper.find(".tr-conversation-settings-action").exists()).toBe(true);
  });

  it("клик по шестерёнке снова открывает панель и снова прячет саму шестерёнку", async () => {
    const { wrapper } = await mountPlayground();

    await wrapper.find(".tr-conversation-properties-action").trigger("click");
    await wrapper.find(".tr-conversation-settings-action").trigger("click");

    expect(wrapper.find(".tr-conversation-properties").exists()).toBe(true);
    expect(wrapper.find(".tr-conversation-settings-action").exists()).toBe(false);
  });
});
