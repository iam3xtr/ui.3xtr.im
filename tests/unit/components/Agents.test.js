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

async function mountAgents({ workspaceId = "demo", demoMode, path = "/agents" } = {}) {
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
      { path: "/agents/new/:step?", name: "agent-wizard", component: { template: "<div />" } },
      { path: "/agents/:id", name: "agent", component: { template: "<div />" } },
    ],
  });
  router.push(path);
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

  return { wrapper, router };
}

// Task A9.5 post-review fix (Stage A9 `.plan` decision 4): карточка и фильтр
// теперь показывают класс модели (`MODEL_CLASS_LABELS`, `src/stores/models.js`),
// не сырое каталожное имя — тот же принцип, по которому мастор уже прячет
// raw model id на основном пути. `Консультант` (`gpt-4.1-mini`) и
// `Support Bot` (`gpt-4o-mini`) оба относятся к классу `basic`
// («Простая»); `Sales Assistant` (`gpt-4.1`) — единственный агент demo
// пространства класса `advanced` («Продвинутая»), поэтому именно им
// проверяется точечное сужение фильтра.
describe("Agents.vue — модель в карточке и фильтре (Stage A6 fix, Task A9.5 post-review)", () => {
  it("карточка каталога показывает класс модели, а не каталожное имя/UID", async () => {
    const { wrapper } = await mountAgents();

    expect(wrapper.text()).toContain("Простая");
    expect(wrapper.text()).not.toContain("GPT-4.1 mini");
    expect(wrapper.text()).not.toContain("gpt-4.1-mini");
  });

  it("фильтр по классу модели сужает список до реально совпадающих агентов", async () => {
    const { wrapper } = await mountAgents();

    expect(wrapper.findAll(".tr-entity-card__title").length).toBeGreaterThan(1);

    const modelItem = wrapper.findAll(".dropdown-item")
      .find((item) => item.text() === "Продвинутая");
    expect(modelItem).toBeTruthy();

    await modelItem.trigger("click");
    await flushPromises();

    const cardTitles = wrapper.findAll(".tr-entity-card__title").map((el) => el.text());
    expect(cardTitles).toEqual(["Sales Assistant"]);
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

// Task A9.6: S2 presentation-статус на карточке каталога — «demo»/1
// (Активен, один рабочий канал ch-101 + один в ошибке ch-102) и «demo»/4
// (Активен, единственный канал ch-104 ещё не подключён) — см. fixtures в
// `src/stores/agents.js`/`src/stores/channels.js`.
describe("Agents.vue — S2 presentation-статус карточки (Task A9.6)", () => {
  it("активный агент с рабочим и сбойным каналом остаётся «Активен» и показывает отдельное предупреждение", async () => {
    const { wrapper } = await mountAgents();

    const card = wrapper.findAll(".tr-entity-card").find((c) => c.text().includes("Консультант"));
    expect(card.find(".tag").text()).toBe("Активен");
    expect(card.text()).toContain("WhatsApp — резервный канал");
  });

  it("активный агент без единого рабочего канала показывает «Не отвечает: ошибка подключения», не тихий «Активен»", async () => {
    const { wrapper } = await mountAgents();

    const card = wrapper.findAll(".tr-entity-card")
      .find((c) => c.text().includes("Служба поддержки корпоративных клиентов"));
    expect(card.find(".tag").text()).toBe("Не отвечает: ошибка подключения");
  });

  it("черновик с заполненной инструкцией показывается как «Готов к запуску», не просто «Черновик»", async () => {
    const { wrapper } = await mountAgents();

    const card = wrapper.findAll(".tr-entity-card").find((c) => c.text().includes("Sales Assistant"));
    expect(card.find(".tag").text()).toBe("Готов к запуску");
  });
});

// Task A9.2: каждый триггер создания в каталоге ведёт в общий route-driven
// мастер вместо отдельной локальной модалки.
describe("Agents.vue — единый вход в мастер создания (Task A9.2)", () => {
  it("карточка «Создать нового агента» переходит в мастер вместо открытия модалки", async () => {
    const { wrapper, router } = await mountAgents();

    const createCard = wrapper.findAll("button")
      .find((button) => button.text().includes("Создать нового агента")
        && button.classes().includes("tr-entity-card--create"));
    await createCard.trigger("click");
    await flushPromises();

    expect(wrapper.find(".modal-card").exists()).toBe(false);
    expect(router.currentRoute.value.name).toBe("agent-wizard");
  });

  it("empty-action «Создать нового агента» ведёт в тот же мастер", async () => {
    const { wrapper, router } = await mountAgents({ demoMode: "empty" });

    const createButton = wrapper.findAll("button")
      .find((button) => button.text().includes("Создать нового агента"));
    await createButton.trigger("click");
    await flushPromises();

    expect(router.currentRoute.value.name).toBe("agent-wizard");
  });

  it("`/agents?create=1` редиректит в мастер, а не открывает локальную форму", async () => {
    const { wrapper, router } = await mountAgents({ path: "/agents?create=1" });

    expect(wrapper.find(".modal-card").exists()).toBe(false);
    expect(router.currentRoute.value.name).toBe("agent-wizard");
  });
});
