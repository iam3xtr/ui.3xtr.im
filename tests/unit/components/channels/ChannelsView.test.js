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
const telegramCards = (wrapper) => wrapper.findAll(".tr-entity-card").filter((c) => !c.text().includes("Веб-чат"));

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
    expect(telegramCards(wrapper)).toHaveLength(0);
  });

  it("empty: показывает пустое состояние даже когда у агента реально есть каналы", async () => {
    const { wrapper } = await mountChannelsView({ demoMode: "empty" });

    expect(wrapper.find(".tr-async-state--empty").exists()).toBe(true);
    expect(telegramCards(wrapper)).toHaveLength(0);
  });

  it("empty/error: Web-публикация агента остаётся с переключателем", async () => {
    for (const demoMode of ["empty", "error"]) {
      const { wrapper } = await mountChannelsView({ agentId: "3", demoMode });

      const web = wrapper.findAll(".tr-entity-card").find((c) => c.text().includes("Веб-чат"));
      expect(web, demoMode).toBeTruthy();
      expect(web.find("input[type=checkbox]").exists()).toBe(true);
    }
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

// Task S2-16: Telegram/Web header switches hold the saved enabled intent and
// stay independent from runtime diagnostics.
describe("ChannelsView.vue — переключатели enabled и runtime (Task S2-16)", () => {
  const findCard = (wrapper, text) => wrapper.findAll(".tr-entity-card").find((c) => c.text().includes(text));

  it("канал с ошибкой остаётся включённым, а runtime показывается отдельно", async () => {
    const { wrapper } = await mountChannelsView({ agentId: "1" });

    const card = findCard(wrapper, "WhatsApp — резервный канал");
    expect(card.find("input[type=checkbox]").element.checked).toBe(true);
    expect(card.find(".tr-status-tag").text()).toBe("Ошибка");
    expect(card.text()).not.toContain("Деактивировать");
  });

  it("Web-публикация — один отдельный вход с независимым enabled", async () => {
    const { wrapper } = await mountChannelsView({ agentId: "3" });

    const web = findCard(wrapper, "Веб-чат");
    expect(web.find("input[type=checkbox]").element.checked).toBe(true);
    expect(web.text()).toContain("Публичная страница временно недоступна.");
    expect(wrapper.findAll(".tr-entity-card").filter((c) => c.text().includes("Веб-чат"))).toHaveLength(1);
  });

  it("не готовая Web-публикация блокирует включение с причиной", async () => {
    const { wrapper } = await mountChannelsView({ agentId: "4" });

    const web = findCard(wrapper, "Веб-чат");
    expect(web.find("input[type=checkbox]").attributes("disabled")).toBeDefined();
    expect(web.text()).toContain("заполните инструкции агента");
  });

  it("включение Web даёт одно pending-действие и сохраняет enabled", async () => {
    const { wrapper } = await mountChannelsView({ agentId: "2" });
    const channelsStore = useChannelsStore();
    vi.useFakeTimers();

    const input = findCard(wrapper, "Веб-чат").find("input[type=checkbox]");
    await input.setValue(true);
    await input.setValue(true);
    expect(input.attributes("disabled")).toBeDefined();
    expect(channelsStore.getWebPublication("demo", "2").enabled).toBe(false);

    await vi.advanceTimersByTimeAsync(500);
    vi.useRealTimers();
    await flushPromises();

    expect(channelsStore.getWebPublication("demo", "2").enabled).toBe(true);
  });

  it("сбой Web-команды сохраняет прежнее состояние и показывает повтор", async () => {
    const { wrapper } = await mountChannelsView({ agentId: "2" });
    const channelsStore = useChannelsStore();
    channelsStore.webPublications.demo[2].lifecycleFixture = "failure";
    vi.useFakeTimers();

    await findCard(wrapper, "Веб-чат").find("input[type=checkbox]").setValue(true);
    await vi.advanceTimersByTimeAsync(500);
    vi.useRealTimers();
    await flushPromises();

    const web = findCard(wrapper, "Веб-чат");
    expect(channelsStore.getWebPublication("demo", "2").enabled).toBe(false);
    expect(web.find("input[type=checkbox]").element.checked).toBe(false);
    expect(web.find("[role=alert]").text()).toContain("Повторить");
  });

  it("выключение Telegram отменяется без изменений, ошибка runtime не блокирует выключение", async () => {
    const { wrapper } = await mountChannelsView({ agentId: "1" });
    const modalStore = useModalStore();
    const channelsStore = useChannelsStore();
    let options;
    vi.spyOn(modalStore, "confirm").mockImplementation((o) => { options = o; });

    const input = findCard(wrapper, "WhatsApp — резервный канал").find("input[type=checkbox]");
    expect(input.attributes("disabled")).toBeUndefined();
    await input.setValue(false);
    expect(modalStore.confirm).toHaveBeenCalledOnce();

    options.onCancel();
    await flushPromises();
    const channel = channelsStore.listByAgent("demo", "1").find((c) => c.id === "ch-102");
    expect(channel.isEnabled).toBe(true);

    vi.useFakeTimers();
    options.onConfirm();
    await vi.advanceTimersByTimeAsync(500);
    vi.useRealTimers();
    await flushPromises();
    expect(channel.isEnabled).toBe(false);
    expect(channel.status).toBe("error");
  });

  it("включение перехваченного канала открывает takeover без сохранения enabled", async () => {
    const { wrapper } = await mountChannelsView({ agentId: "3" });
    const modalStore = useModalStore();
    const channelsStore = useChannelsStore();
    vi.spyOn(modalStore, "open");

    await findCard(wrapper, "Telegram-бот службы поддержки").find("input[type=checkbox]").setValue(true);

    expect(modalStore.open).toHaveBeenCalledWith("channel-takeover");
    expect(channelsStore.listByAgent("demo", "3")[0].isEnabled).toBe(false);
  });

  it("канал в ошибке без включения не включается и объясняет причину", async () => {
    const { wrapper } = await mountChannelsView({ agentId: "1" });
    const channelsStore = useChannelsStore();
    channelsStore.listByAgent("demo", "1").find((c) => c.id === "ch-102").isEnabled = false;
    await flushPromises();

    const card = findCard(wrapper, "WhatsApp — резервный канал");
    expect(card.find("input[type=checkbox]").attributes("disabled")).toBeDefined();
    expect(card.text()).toContain("замените токен");
  });
});
