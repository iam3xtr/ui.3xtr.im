import { describe, expect, it, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { createMemoryHistory, createRouter } from "vue-router";
import Buefy from "buefy";

import Agents from "../../../src/components/Agents.vue";
import { useDemoStore } from "../../../src/stores/demo.js";
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

async function mountAgents({ workspaceId = "demo", demoMode } = {}) {
  const pinia = createPinia();
  setActivePinia(pinia);

  const workspaceStore = useWorkspaceStore();
  workspaceStore.activeWorkspaceId = workspaceId;

  if (demoMode) {
    useDemoStore().setMode(demoMode);
  }

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

// Task A7.3: каталог агентов подключён к глобальному demo-режиму
// (`useDemoStore()`, Task A7.1) — loading/empty/error через
// `ListAsyncState`, permission-denied прямым `AsyncState`, partial —
// `b-message`-баннером поверх доступных карточек.
describe("Agents.vue — demo-состояния (Task A7.3)", () => {
  it("error: показывает ошибку и не рендерит карточки каталога", async () => {
    const { wrapper } = await mountAgents({ demoMode: "error" });

    expect(wrapper.find(".tr-async-state--error").exists()).toBe(true);
    expect(wrapper.findAll(".tr-entity-card").length).toBe(0);
  });

  it("empty: показывает пустое состояние, не рендерит карточки агентов и предлагает создать первого", async () => {
    const { wrapper } = await mountAgents({ demoMode: "empty" });

    expect(wrapper.find(".tr-async-state--empty").exists()).toBe(true);
    expect(wrapper.findAll(".tr-entity-card--interactive:not(.tr-entity-card--create)").length).toBe(0);
    // Finding 5 (Stage A7 review): CTA "Создать нового агента" не должен
    // пропадать в demo empty-режиме — согласовано с ChannelsView.vue/Files.vue.
    const createButton = wrapper.findAll("button")
      .find((button) => button.text().includes("Создать нового агента"));
    expect(createButton).toBeTruthy();
  });

  it("permission-denied: показывает отказ в доступе через AsyncState", async () => {
    const { wrapper } = await mountAgents({ demoMode: "permission-denied" });

    expect(wrapper.find(".tr-async-state--permission-denied").exists()).toBe(true);
    expect(wrapper.findAll(".tr-entity-card").length).toBe(0);
  });

  it("partial: показывает баннер и оставляет доступные карточки агентов", async () => {
    const { wrapper } = await mountAgents({ demoMode: "partial" });

    expect(wrapper.find(".message.is-warning").exists()).toBe(true);
    expect(wrapper.findAll(".tr-entity-card__title").length).toBeGreaterThan(0);
  });

  it("ready сохраняет обычный список карточек без демо-баннеров", async () => {
    const { wrapper } = await mountAgents({ demoMode: "ready" });

    expect(wrapper.find(".message.is-warning").exists()).toBe(false);
    expect(wrapper.find(".tr-async-state--permission-denied").exists()).toBe(false);
    expect(wrapper.findAll(".tr-entity-card__title").length).toBeGreaterThan(0);
  });
});
