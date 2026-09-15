import { describe, expect, it, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { createMemoryHistory, createRouter } from "vue-router";
import Buefy from "buefy";

import Dashboard from "../../../src/components/Dashboard.vue";
import { useAgentsStore } from "../../../src/stores/agents.js";
import { useChannelsStore } from "../../../src/stores/channels.js";
import { useConversationsStore } from "../../../src/stores/conversations.js";
import { useDemoStore } from "../../../src/stores/demo.js";
import { useWizardStore } from "../../../src/stores/wizard.js";
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

// Task A7.5/A10.4: `Dashboard.vue` подключён к глобальному demo-режиму —
// loading/permission-denied/error через `Loader`/прямой `AsyncState` (тот
// же приём, что `Agents.vue`, Task A7.3), `empty` расширяет уже
// существующую CTA-карточку «Создать первого агента», partial —
// `b-message`-баннером поверх виджетов. Route stubs cover every target the
// S2 attention cards and table "все ..." links can now resolve to.
async function mountDashboard({ demoMode, workspaceId = "demo" } = {}) {
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
      { path: "/", name: "dashboard", component: Dashboard },
      { path: "/agents", name: "agents", component: { template: "<div />" } },
      { path: "/agents/new/:step?", name: "agent-wizard", component: { template: "<div />" } },
      { path: "/agents/:id", name: "agent", component: { template: "<div />" } },
      { path: "/agents/:id/channels", name: "agent-channels", component: { template: "<div />" } },
      { path: "/conversations", name: "conversations", component: { template: "<div />" } },
      {
        path: "/conversations/:agentId/:conversationId",
        name: "conversation",
        component: { template: "<div />" },
      },
      { path: "/knowledge", name: "knowledge", component: { template: "<div />" } },
      { path: "/knowledge/:id", name: "knowledge-collection", component: { template: "<div />" } },
      { path: "/workspace/settings", name: "workspace-settings", component: { template: "<div />" } },
      { path: "/workspace/plans", name: "workspace-plans", component: { template: "<div />" } },
      { path: "/profile", name: "profile", component: { template: "<div />" } },
    ],
  });
  router.push("/");
  await router.isReady();

  vi.useFakeTimers();
  const wrapper = mount(Dashboard, {
    global: {
      plugins: [pinia, router, Buefy],
    },
  });
  vi.advanceTimersByTime(1000);
  vi.useRealTimers();
  await flushPromises();

  return { wrapper, router };
}

describe("Dashboard.vue — demo-состояния (Task A7.5)", () => {
  it("ready показывает плитки навигации", async () => {
    const { wrapper } = await mountDashboard();

    expect(wrapper.findAll(".tr-dashboard-link").length).toBeGreaterThan(0);
    expect(wrapper.find(".tr-async-state--permission-denied").exists()).toBe(false);
  });

  it("permission-denied показывает отказ в доступе через AsyncState", async () => {
    const { wrapper } = await mountDashboard({ demoMode: "permission-denied" });

    expect(wrapper.find(".tr-async-state--permission-denied").exists()).toBe(true);
    expect(wrapper.findAll(".tr-dashboard-link").length).toBe(0);
  });

  it("error показывает ошибку через AsyncState", async () => {
    const { wrapper } = await mountDashboard({ demoMode: "error" });

    expect(wrapper.find(".tr-async-state--error").exists()).toBe(true);
    expect(wrapper.findAll(".tr-dashboard-link").length).toBe(0);
  });

  it("empty форсирует CTA-карточку создания первого агента даже когда агенты реально есть", async () => {
    const { wrapper } = await mountDashboard({ demoMode: "empty" });

    expect(wrapper.find(".tr-dashboard-create").exists()).toBe(true);
    expect(wrapper.findAll(".tr-dashboard-link").length).toBe(0);
  });

  // Task A9.2: пустой dashboard — один из точек входа в общий route-driven
  // мастер, а не в отдельную форму каталога.
  it("CTA пустого dashboard ведёт в общий мастер создания агента", async () => {
    const { wrapper, router } = await mountDashboard({ demoMode: "empty" });

    await wrapper.find(".tr-dashboard-create").trigger("click");
    await flushPromises();

    expect(router.currentRoute.value.name).toBe("agent-wizard");
  });

  it("partial показывает баннер и оставляет виджеты обзора", async () => {
    const { wrapper } = await mountDashboard({ demoMode: "partial" });

    expect(wrapper.find(".message.is-warning").exists()).toBe(true);
    expect(wrapper.findAll(".tr-dashboard-link").length).toBeGreaterThan(0);
  });
});

describe("Dashboard.vue — S2 «Требует внимания» (Task A10.4)", () => {
  it("собирает непустой список причин для демо-пространства: черновик, знания, канал, handoff", async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    useWorkspaceStore().activeWorkspaceId = "demo";
    // Явный незавершённый черновик мастера — "incomplete setup".
    useWizardStore().startDraft("demo");

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: "/", name: "dashboard", component: Dashboard },
        { path: "/agents/new/:step?", name: "agent-wizard", component: { template: "<div />" } },
        { path: "/agents/:id/channels", name: "agent-channels", component: { template: "<div />" } },
        {
          path: "/conversations/:agentId/:conversationId",
          name: "conversation",
          component: { template: "<div />" },
        },
        { path: "/knowledge/:id", name: "knowledge-collection", component: { template: "<div />" } },
        { path: "/workspace/plans", name: "workspace-plans", component: { template: "<div />" } },
        { path: "/agents", name: "agents", component: { template: "<div />" } },
        { path: "/conversations", name: "conversations", component: { template: "<div />" } },
        { path: "/knowledge", name: "knowledge", component: { template: "<div />" } },
        { path: "/workspace/settings", name: "workspace-settings", component: { template: "<div />" } },
        { path: "/profile", name: "profile", component: { template: "<div />" } },
      ],
    });
    router.push("/");
    await router.isReady();

    vi.useFakeTimers();
    const wrapper = mount(Dashboard, { global: { plugins: [pinia, router, Buefy] } });
    vi.advanceTimersByTime(1000);
    vi.useRealTimers();
    await flushPromises();

    const items = wrapper.findAll(".tr-dashboard-attention__item");
    expect(items.length).toBeGreaterThan(0);

    const text = wrapper.find(".tr-dashboard-attention").text();
    expect(text).toContain("Настройка агента не завершена");
    expect(text).toContain("требует внимания"); // knowledge collection card
    expect(text).toContain("не отвечает"); // channel card
    expect(text).toContain("передан оператору"); // handoff card
  });

  it("карточка исчерпанного лимита не противоречит себе (Stage A10 review fix)", async () => {
    // demo-пространство: `knowledge_objects` уже `exhausted` (used: 200,
    // limit: 200, `src/stores/workspace.js`) — заголовок карточки не должен
    // говорить «почти исчерпан», когда caption рядом уже говорит «лимит
    // исчерпан».
    const { wrapper } = await mountDashboard();

    const limitItem = wrapper.findAll(".tr-dashboard-attention__item")
      .find((item) => item.text().includes("Материалы знаний"));

    expect(limitItem).toBeDefined();
    expect(limitItem.text()).toContain("Лимит «Материалы знаний» исчерпан");
    expect(limitItem.text()).not.toContain("почти исчерпан");
    expect(limitItem.text()).toContain("лимит исчерпан");
  });

  it("сбой одного канала не скрывает работающих агентов/остальные карточки", async () => {
    const { wrapper } = await mountDashboard();

    // Агент 1 ("Консультант") в демо-фикстуре продолжает числиться активным
    // в таблице «Последние агенты», хотя один из его каналов в ошибке.
    const agentRows = wrapper.findAll("tbody tr");
    expect(agentRows.length).toBeGreaterThan(0);
    expect(wrapper.text()).toContain("Консультант");
  });

  it("не рендерит секцию внимания, когда причин нет (пространство trickster с завершённым мастером)", async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    useWorkspaceStore().activeWorkspaceId = "trickster";
    // Убираем единственный сбойный канал/диалог этого пространства, чтобы
    // проверить, что секция действительно пуста, а не просто не найдена.
    useChannelsStore().channelsByWorkspaceAndAgent.trickster[1] = [];
    useAgentsStore(); // no-op, keeps store initialized for parity

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: "/", name: "dashboard", component: Dashboard },
        { path: "/agents", name: "agents", component: { template: "<div />" } },
        { path: "/agents/new/:step?", name: "agent-wizard", component: { template: "<div />" } },
        { path: "/conversations", name: "conversations", component: { template: "<div />" } },
        { path: "/knowledge", name: "knowledge", component: { template: "<div />" } },
        { path: "/workspace/settings", name: "workspace-settings", component: { template: "<div />" } },
        { path: "/workspace/plans", name: "workspace-plans", component: { template: "<div />" } },
        { path: "/profile", name: "profile", component: { template: "<div />" } },
      ],
    });
    router.push("/");
    await router.isReady();

    vi.useFakeTimers();
    const wrapper = mount(Dashboard, { global: { plugins: [pinia, router, Buefy] } });
    vi.advanceTimersByTime(1000);
    vi.useRealTimers();
    await flushPromises();

    expect(wrapper.find(".tr-dashboard-attention").exists()).toBe(false);
  });
});

describe("Dashboard.vue — метрики: unknown ≠ 0 (Task A10.4)", () => {
  it("показывает «—» для доставки, когда сегодня ничего не отправлено (пустое пространство с агентом)", async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    useWorkspaceStore().activeWorkspaceId = "empty";
    // "empty" workspace fixture has no agents by default — give it one so
    // the CTA branch doesn't shadow the metrics section under test.
    useAgentsStore().createAgent("empty", "Тестовый агент");

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: "/", name: "dashboard", component: Dashboard },
        { path: "/agents", name: "agents", component: { template: "<div />" } },
        { path: "/conversations", name: "conversations", component: { template: "<div />" } },
        { path: "/knowledge", name: "knowledge", component: { template: "<div />" } },
        { path: "/workspace/settings", name: "workspace-settings", component: { template: "<div />" } },
        { path: "/workspace/plans", name: "workspace-plans", component: { template: "<div />" } },
        { path: "/profile", name: "profile", component: { template: "<div />" } },
      ],
    });
    router.push("/");
    await router.isReady();

    vi.useFakeTimers();
    const wrapper = mount(Dashboard, { global: { plugins: [pinia, router, Buefy] } });
    vi.advanceTimersByTime(1000);
    vi.useRealTimers();
    await flushPromises();

    expect(wrapper.text()).toContain("—");
    expect(wrapper.text()).toContain("Нет отправленных сообщений");
    expect(wrapper.text()).not.toContain("0%");
  });

  it("считает реальный 0 диалогов за сегодня для пустого пространства, отдельно от unknown", async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    useWorkspaceStore().activeWorkspaceId = "empty";
    useAgentsStore().createAgent("empty", "Тестовый агент");

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: "/", name: "dashboard", component: Dashboard },
        { path: "/agents", name: "agents", component: { template: "<div />" } },
        { path: "/conversations", name: "conversations", component: { template: "<div />" } },
        { path: "/knowledge", name: "knowledge", component: { template: "<div />" } },
        { path: "/workspace/settings", name: "workspace-settings", component: { template: "<div />" } },
        { path: "/workspace/plans", name: "workspace-plans", component: { template: "<div />" } },
        { path: "/profile", name: "profile", component: { template: "<div />" } },
      ],
    });
    router.push("/");
    await router.isReady();

    vi.useFakeTimers();
    const wrapper = mount(Dashboard, { global: { plugins: [pinia, router, Buefy] } });
    vi.advanceTimersByTime(1000);
    vi.useRealTimers();
    await flushPromises();

    expect(wrapper.text()).toContain("0");
    expect(wrapper.text()).toContain("диалогов за сегодня");
  });

  it("показывает время обновления рядом с метриками", async () => {
    const { wrapper } = await mountDashboard();

    expect(wrapper.text()).toContain("Обновлено:");
  });
});

describe("Dashboard.vue — пустой dashboard и черновик мастера (Task A10.4)", () => {
  it("предлагает продолжить черновик вместо «создать первого агента», когда он уже есть", async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    useWorkspaceStore().activeWorkspaceId = "empty";
    useWizardStore().startDraft("empty");

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: "/", name: "dashboard", component: Dashboard },
        { path: "/agents/new/:step?", name: "agent-wizard", component: { template: "<div />" } },
      ],
    });
    router.push("/");
    await router.isReady();

    vi.useFakeTimers();
    const wrapper = mount(Dashboard, { global: { plugins: [pinia, router, Buefy] } });
    vi.advanceTimersByTime(1000);
    vi.useRealTimers();
    await flushPromises();

    expect(wrapper.find(".tr-dashboard-create").text()).toContain("Продолжить настройку агента");
  });
});

// Stage A10 review fix: «Последние агенты»/«Последние диалоги» must show
// the actual most-recent records, not just the first `RECENT_LIMIT` in
// fixture-array order — `updated` is a human-readable relative string, so
// this exercises the parser/comparator that makes the two orders diverge.
describe("Dashboard.vue — «Последние…» сортируются по recency, не по порядку фикстуры (Stage A10 review fix)", () => {
  it("«Последние диалоги» не теряет самые свежие записи в конце fixture-массива", async () => {
    const { wrapper } = await mountDashboard({ workspaceId: "demo" });

    // demo содержит 7 диалогов; id 6 ("Елена Кузнецова", updated "1 мин") и
    // id 7 ("Игорь Соколов", updated "38 мин") стоят последними в
    // fixture-массиве, но на деле — самые свежие после id 5 ("Дмитрий
    // Фролов", "3 мин"). Непросортированный `slice(0, 5)` показывал бы
    // id 1–5 и терял бы оба.
    const table = wrapper.findAll("table").find((t) => t.text().includes("Контакт"));
    const rowTexts = table.findAll("tbody tr").map((row) => row.text());

    expect(rowTexts).toHaveLength(5);
    expect(rowTexts[0]).toContain("Елена Кузнецова");
    expect(table.text()).toContain("Игорь Соколов");
    // "Вчера"/"2 д" — старше всех показанных — не входят в топ-5.
    expect(table.text()).not.toContain("support@example.com");
    expect(table.text()).not.toContain("Отдел закупок");
  });

  it("«Последние агенты» не теряет самый свежий агент, добавленный после старых", async () => {
    const { wrapper } = await mountDashboard({ workspaceId: "demo" });
    const agentsStore = useAgentsStore();

    // demo уже содержит 4 фикстурных агента ("2 ч"/"Вчера"/"3 д"/"5 мин").
    // Добавляем пятый и шестой — старый первым, самый свежий вторым — чтобы
    // самый свежий агент оказался последним в fixture-массиве (6 всего,
    // превышает RECENT_LIMIT = 5) и воспроизвести именно тот порядок,
    // который непросортированный `slice(0, 5)` теряет.
    const veryOld = agentsStore.createAgent("demo", "Самый старый агент");
    veryOld.updated = "10 д";
    const veryRecent = agentsStore.createAgent("demo", "Самый свежий агент");
    veryRecent.updated = "1 мин";
    await flushPromises();

    const table = wrapper.findAll("table").find((t) => t.text().includes("Название"));
    const rowTexts = table.findAll("tbody tr").map((row) => row.text());

    expect(rowTexts).toHaveLength(5);
    expect(rowTexts[0]).toContain("Самый свежий агент");
    expect(table.text()).not.toContain("Самый старый агент");
  });
});
