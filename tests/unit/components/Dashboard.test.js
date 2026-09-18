import { beforeEach, describe, expect, it, vi } from "vitest";
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

// Issue #13.1 (`.todo` "Dashboard attention queue"): navigation helpers for
// the session-scoped queue — one active `.tr-dashboard-attention__item` at
// a time, moved with the accessible previous/next controls.
function activeAttentionText(wrapper) {
  return wrapper.find(".tr-dashboard-attention__item").text();
}
async function goNextAttentionItem(wrapper) {
  await wrapper.find("[aria-label='Следующее уведомление']").trigger("click");
  await flushPromises();
}
async function goPreviousAttentionItem(wrapper) {
  await wrapper.find("[aria-label='Предыдущее уведомление']").trigger("click");
  await flushPromises();
}
async function dismissActiveAttentionItem(wrapper) {
  await wrapper.find("[aria-label='Скрыть до конца сессии']").trigger("click");
  await flushPromises();
}

describe("Dashboard.vue — S2 «Требует внимания» (Task A10.4)", () => {
  // Issue #13.1: `sessionStorage` persists across tests in the same file
  // (jsdom keeps it for the whole run), so each test starts from a clean
  // dismiss state regardless of workspace/order.
  beforeEach(() => {
    window.sessionStorage.clear();
  });

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

    // Only one card is active at a time (Issue #13.1) — step through the
    // whole queue with "Следующее уведомление" to see every reason.
    expect(wrapper.findAll(".tr-dashboard-attention__item").length).toBe(1);
    const seenText = [activeAttentionText(wrapper)];
    while (wrapper.find("[aria-label='Следующее уведомление']").attributes("disabled") === undefined) {
      await goNextAttentionItem(wrapper);
      seenText.push(activeAttentionText(wrapper));
    }
    const text = seenText.join(" ");

    expect(text).toContain("Настройка агента не завершена");
    expect(text).toContain("требует внимания"); // knowledge collection card
    expect(text).toContain("не отвечает"); // channel card
    expect(text).toContain("передан оператору"); // handoff card
  });

  it("карточка исчерпанного лимита не противоречит себе (Stage A10 review fix)", async () => {
    // demo-пространство: `objects` уже `exhausted` (used: 200,
    // limit: 200, `src/stores/workspace.js`) — заголовок карточки не должен
    // говорить «почти исчерпан», когда caption рядом уже говорит «лимит
    // исчерпан».
    const { wrapper } = await mountDashboard();

    let limitText = null;
    let card = activeAttentionText(wrapper);
    for (let guard = 0; guard < 20 && limitText === null; guard += 1) {
      if (card.includes("Объекты")) {
        limitText = card;
        break;
      }
      if (wrapper.find("[aria-label='Следующее уведомление']").attributes("disabled") !== undefined) {
        break;
      }
      await goNextAttentionItem(wrapper);
      card = activeAttentionText(wrapper);
    }

    expect(limitText).not.toBeNull();
    expect(limitText).toContain("Лимит «Объекты» исчерпан");
    expect(limitText).not.toContain("почти исчерпан");
    expect(limitText).toContain("лимит исчерпан");
  });

  it("many: показывает позицию и accessible previous/next с disabled-поведением на границах", async () => {
    const { wrapper } = await mountDashboard();

    const nav = wrapper.find(".tr-dashboard-attention__nav");
    expect(nav.exists()).toBe(true);
    expect(nav.text()).toMatch(/^1 из \d+$/);
    expect(wrapper.find("[aria-label='Предыдущее уведомление']").attributes("disabled")).toBeDefined();

    const firstCard = activeAttentionText(wrapper);
    await goNextAttentionItem(wrapper);

    expect(nav.text()).toMatch(/^2 из \d+$/);
    expect(activeAttentionText(wrapper)).not.toBe(firstCard);
    expect(wrapper.find("[aria-label='Предыдущее уведомление']").attributes("disabled")).toBeUndefined();

    await goPreviousAttentionItem(wrapper);
    expect(nav.text()).toMatch(/^1 из \d+$/);
    expect(activeAttentionText(wrapper)).toBe(firstCard);
  });

  it("ровно 1 item: карточка видна без accessible previous/next controls", async () => {
    const { wrapper } = await mountDashboard();

    // Reduce the default multi-item source down to exactly one remaining
    // reason by dismissing every other one — the nav (position text and
    // previous/next buttons) must disappear entirely, not just disable.
    let total = Number(wrapper.find(".tr-dashboard-attention__nav").text().match(/из (\d+)/)[1]);
    while (total > 1) {
      await dismissActiveAttentionItem(wrapper);
      total -= 1;
    }

    expect(wrapper.find(".tr-dashboard-attention__item").exists()).toBe(true);
    expect(wrapper.find(".tr-dashboard-attention__nav").exists()).toBe(false);
    expect(wrapper.find("[aria-label='Следующее уведомление']").exists()).toBe(false);
    expect(wrapper.find("[aria-label='Предыдущее уведомление']").exists()).toBe(false);
  });

  it("dismiss скрывает только активную карточку, выбирает соседнюю и восстанавливается без reload", async () => {
    const { wrapper } = await mountDashboard();

    const total = Number(wrapper.find(".tr-dashboard-attention__nav").text().match(/из (\d+)/)[1]);
    const firstCard = activeAttentionText(wrapper);

    await dismissActiveAttentionItem(wrapper);
    await flushPromises();

    // A neighbour became active, the dismissed card is gone, and the
    // section is still one item smaller — but never fully removed while
    // other reasons remain.
    expect(activeAttentionText(wrapper)).not.toBe(firstCard);
    expect(wrapper.findAll(".tr-dashboard-attention__item").length).toBe(1);
    if (total > 1) {
      expect(wrapper.find(".tr-dashboard-attention__nav").text()).toMatch(new RegExp(`из ${total - 1}$`));
    }

    // Dismiss every remaining item — the section keeps existing (source
    // still has reasons) but switches to the restore affordance instead of
    // rendering an empty/broken card.
    while (wrapper.find(".tr-dashboard-attention__item").exists()) {
      await dismissActiveAttentionItem(wrapper);
    }
    expect(wrapper.find(".tr-dashboard-attention").exists()).toBe(true);
    const restore = wrapper.find(".tr-dashboard-attention__restore");
    expect(restore.exists()).toBe(true);
    expect(restore.text()).toContain(`${total}`);

    await restore.find("button").trigger("click");
    await flushPromises();

    // Restored without a reload — the section is back to a single active
    // card straight away.
    expect(wrapper.find(".tr-dashboard-attention__item").exists()).toBe(true);
    expect(wrapper.find(".tr-dashboard-attention__restore").exists()).toBe(false);
  });

  it("dismiss изолирован по workspace + browser session: другое пространство не видит скрытие", async () => {
    const { wrapper: demoWrapper } = await mountDashboard({ workspaceId: "demo" });
    const demoFirstCard = activeAttentionText(demoWrapper);
    await dismissActiveAttentionItem(demoWrapper);
    expect(activeAttentionText(demoWrapper)).not.toBe(demoFirstCard);

    // A fresh mount for the same "demo" workspace, same browser session
    // (same `sessionStorage`, new Pinia instance — dismiss must have been
    // persisted, not just in-memory component state).
    const { wrapper: demoAgain } = await mountDashboard({ workspaceId: "demo" });
    expect(activeAttentionText(demoAgain)).not.toBe(demoFirstCard);

    // Isolation is checked directly at the storage layer: the dismiss for
    // "demo" only ever wrote a "demo"-scoped key, so nothing else in this
    // session — including a different workspace — could have seen it.
    const dismissedKeys = Object.keys(window.sessionStorage)
      .filter((key) => key.startsWith("trickster-ui-kit:dashboard-attention:dismissed:"));
    expect(dismissedKeys).toEqual(["trickster-ui-kit:dashboard-attention:dismissed:demo"]);
  });

  it("стабильный key сохраняет правильный активный элемент при обновлении источника", async () => {
    const { wrapper } = await mountDashboard();
    const channelsStore = useChannelsStore();

    const activeBefore = activeAttentionText(wrapper);

    // Source update unrelated to the active reason: a new failing channel
    // is added for a different agent, growing `attentionItems` from the
    // front-to-back order the derivation builds it in. The active card
    // must stay the same one, found by its stable key — not shift to
    // whatever is now first.
    const channels = channelsStore.channelsByWorkspaceAndAgent.demo;
    const anyAgentId = Object.keys(channels)[0];
    channels[anyAgentId] = [
      ...channels[anyAgentId],
      { id: "extra-channel", name: "Тестовый канал", status: "error", runtimeReason: "тест" },
    ];
    await flushPromises();

    expect(activeAttentionText(wrapper)).toBe(activeBefore);
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
