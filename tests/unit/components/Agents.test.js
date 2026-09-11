import { describe, expect, it, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { createMemoryHistory, createRouter } from "vue-router";
import Buefy from "buefy";

import Agents from "../../../src/components/Agents.vue";
import { useWorkspaceStore } from "../../../src/stores/workspace.js";

// Регрессия из ревью Stage A6 (Finding 2): Task A6.1 поменяло `agent.model` с
// отображаемого имени на каталожный UID, но фильтр "по модели" и карточка
// каталога остались завязаны на старый список отображаемых имён — выбор
// любой модели в фильтре опустошал список, а карточка показывала сырой UID.

const IconStub = { name: "icon", props: ["name"], template: "<span />" };

// jsdom has no `matchMedia` — `Loader.vue` (mounted while `isLoading` is
// true, see below) reads it on mount to pick the reduced-motion variant.
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

async function mountAgents({ workspaceId = "demo" } = {}) {
  const pinia = createPinia();
  setActivePinia(pinia);

  const workspaceStore = useWorkspaceStore();
  workspaceStore.activeWorkspaceId = workspaceId;

  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/agents", name: "agents", component: Agents },
      { path: "/agents/:id", name: "agent", component: { template: "<div />" } },
    ],
  });
  router.push("/agents");
  await router.isReady();

  // `useSimulatedLoading` (не в scope этого finding) держит `Loader`
  // смонтированным первые 300-900мс — его SVG-иконка не резолвится через
  // vite-svg-loader в vitest.config.js, поэтому здесь фикс. таймеры
  // перематываются мимо задержки, чтобы дойти до реального содержимого
  // списка агентов.
  vi.useFakeTimers();
  const wrapper = mount(Agents, {
    global: {
      plugins: [pinia, router, Buefy],
      components: { icon: IconStub },
    },
  });
  vi.advanceTimersByTime(1000);
  vi.useRealTimers();
  await flushPromises();

  return { wrapper };
}

describe("Agents.vue — модель в карточке и фильтре (Stage A6 fix)", () => {
  it("карточка каталога показывает читаемое имя модели, а не каталожный UID", async () => {
    const { wrapper } = await mountAgents();

    expect(wrapper.text()).toContain("GPT-4.1 mini");
    expect(wrapper.text()).not.toContain("gpt-4.1-mini");
  });

  it("фильтр по модели сужает список до реально совпадающих агентов", async () => {
    const { wrapper } = await mountAgents();

    expect(wrapper.findAll(".tr-entity-card__title").length).toBeGreaterThan(1);

    const modelItem = wrapper.findAll(".dropdown-item")
      .find((item) => item.text() === "GPT-4.1 mini");
    expect(modelItem).toBeTruthy();

    await modelItem.trigger("click");
    await flushPromises();

    const cardTitles = wrapper.findAll(".tr-entity-card__title").map((el) => el.text());
    expect(cardTitles).toEqual(["Консультант"]);
  });

  it("BYOK-агент фильтруется/отображается по эффективной модели, не по обычной", async () => {
    const { wrapper } = await mountAgents({ workspaceId: "trickster" });

    // trickster/1: use_own_api_key=true, provider_model_id задан и не входит
    // в каталог — показывается как есть, а не как undefined/пустая строка.
    expect(wrapper.text()).toContain("meta-llama/llama-3.1-405b-instruct");
    expect(wrapper.text()).not.toContain("undefined");
  });
});
