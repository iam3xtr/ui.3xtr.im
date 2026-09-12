import { describe, expect, it, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { createMemoryHistory, createRouter, RouterView } from "vue-router";
import Buefy from "buefy";

import AgentWizard from "../../../../../src/components/agents/AgentWizard.vue";
import { useWizardStore } from "../../../../../src/stores/wizard.js";
import { useChannelsStore } from "../../../../../src/stores/channels.js";
import { useWorkspaceStore } from "../../../../../src/stores/workspace.js";

// jsdom has no `matchMedia` — `Loader.vue` (mounted for the "Проверяем
// токен…" state) reads it on mount (see `tests/unit/components/Agents.test.js`
// for the same fix).
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

// Task A9.7: шаг «Telegram» — T1 mock (всегда отмечен как недоступный демо-макет
// и указывает на T2), T2 fixture-подключение (валидный/неверный/конфликтный
// токен, отдельное подтверждение личности бота, «Подключить другой аккаунт»),
// «Подключить позже» сохраняет черновик. Тот же real-`<RouterView>` harness,
// что `SandboxStep.test.js` (Task A9.6).
const Host = { components: { RouterView }, template: "<RouterView />" };

async function mountWizardAtTelegram(fields = {}) {
  const pinia = createPinia();
  setActivePinia(pinia);

  useWorkspaceStore().activeWorkspaceId = "demo";
  const wizardStore = useWizardStore();
  wizardStore.startDraft("demo");
  wizardStore.updateFields("demo", { agentName: "Агент поддержки", ...fields });
  wizardStore.goToStep("demo", "telegram");

  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/agents", name: "agents", component: { template: "<div />" } },
      { path: "/agents/new/:step?", name: "agent-wizard", component: AgentWizard },
    ],
  });
  router.push({ name: "agent-wizard", params: { step: "telegram" } });
  await router.isReady();

  const wrapper = mount(Host, {
    global: {
      plugins: [pinia, router, Buefy],
    },
  });
  await flushPromises();

  return { wrapper, router, wizardStore };
}

function button(wrapper, text) {
  return wrapper.findAll("button").find((b) => b.text().trim() === text);
}

describe("AgentWizard.vue — шаг «Telegram» (Task A9.7)", () => {
  it("T1 обозначен демо-макетом и всегда предлагает T2 рядом", async () => {
    const { wrapper } = await mountWizardAtTelegram();

    expect(wrapper.text()).toContain("Демо-макет");
    expect(wrapper.text()).toContain("Способ недоступен");
    expect(wrapper.find(".tr-wizard-telegram-qr").exists()).toBe(true);
    expect(wrapper.find(".tr-wizard-telegram-open-mobile").attributes("disabled")).toBeDefined();
    expect(button(wrapper, "Создать нового бота")).toBeTruthy();
    expect(button(wrapper, "Подключить существующего бота")).toBeTruthy();
  });

  it("QR-макет не содержит секретов и не переводит канал в подключённое состояние", async () => {
    const { wrapper, wizardStore } = await mountWizardAtTelegram();

    expect(wrapper.html()).not.toMatch(/\d{6,}:[A-Za-z0-9_-]+/);
    expect(wizardStore.getDraft("demo").resources.channelId).toBeNull();
  });

  it("неверный токен показывает ошибку и не создаёт активный канал", async () => {
    vi.useFakeTimers();
    const { wrapper, wizardStore } = await mountWizardAtTelegram();
    const channelsStore = useChannelsStore();

    await button(wrapper, "Создать нового бота").trigger("click");
    await flushPromises();

    await wrapper.find("input[type='password']").setValue("this-is-invalid-token");
    await button(wrapper, "Проверить токен").trigger("click");
    await flushPromises();

    const { agentId, channelId } = wizardStore.getDraft("demo").resources;
    expect(channelsStore.listByAgent("demo", agentId).find((c) => c.id === channelId).status).toBe("checking");

    await vi.advanceTimersByTimeAsync(600);
    await flushPromises();

    expect(wrapper.text()).toContain("Неверный токен");
    const channel = channelsStore.listByAgent("demo", agentId).find((c) => c.id === channelId);
    expect(channel.status).toBe("error");
    expect(channel.status).not.toBe("active");

    vi.useRealTimers();
  });

  it("уход со шага до истечения паузы проверки отменяет отложенный результат (post-review fix)", async () => {
    vi.useFakeTimers();
    const { wrapper, wizardStore } = await mountWizardAtTelegram();
    const channelsStore = useChannelsStore();

    await button(wrapper, "Создать нового бота").trigger("click");
    await flushPromises();
    await wrapper.find("input[type='password']").setValue("this-is-invalid-token");
    await button(wrapper, "Проверить токен").trigger("click");
    await flushPromises();

    const { agentId, channelId } = wizardStore.getDraft("demo").resources;
    expect(channelsStore.listByAgent("demo", agentId).find((c) => c.id === channelId).status).toBe("checking");

    // Уходим со шага до истечения 500мс паузы — ни "Подключить позже", ни
    // «Назад»/«Отменить» здесь ещё не кликались.
    await button(wrapper, "Подключить позже").trigger("click");
    await flushPromises();

    // Без фикса отложенный callback всё равно сработал бы здесь и заново
    // записал бы канал в "error" поверх отката onBeforeUnmount в "inactive".
    await vi.advanceTimersByTimeAsync(600);
    await flushPromises();

    const channel = channelsStore.listByAgent("demo", agentId).find((c) => c.id === channelId);
    expect(channel.status).toBe("inactive");
    expect(channel.status).not.toBe("error");
    expect(channel.runtimeReason).toBeNull();

    vi.useRealTimers();
  });

  it("конфликтный токен показывает отдельное сообщение о занятом боте", async () => {
    vi.useFakeTimers();
    const { wrapper } = await mountWizardAtTelegram();

    await button(wrapper, "Подключить существующего бота").trigger("click");
    await flushPromises();
    await wrapper.find("input[type='password']").setValue("already-taken-bot");
    await button(wrapper, "Проверить токен").trigger("click");
    await vi.advanceTimersByTimeAsync(600);
    await flushPromises();

    expect(wrapper.text()).toContain("уже подключён в другом рабочем пространстве");

    vi.useRealTimers();
  });

  it("валидный токен требует отдельного подтверждения — канал не подключён до клика", async () => {
    vi.useFakeTimers();
    const { wrapper, wizardStore } = await mountWizardAtTelegram();
    const channelsStore = useChannelsStore();

    await button(wrapper, "Создать нового бота").trigger("click");
    await flushPromises();
    await wrapper.find("input[type='password']").setValue("123456:AAExampleTelegramBotToken");
    await button(wrapper, "Проверить токен").trigger("click");
    await vi.advanceTimersByTimeAsync(600);
    await flushPromises();

    expect(wrapper.text()).toContain("Бот найден");
    const { agentId, channelId } = wizardStore.getDraft("demo").resources;
    let channel = channelsStore.listByAgent("demo", agentId).find((c) => c.id === channelId);
    expect(channel.status).toBe("checking");
    expect(channel.providerIdentity).toBeNull();

    await button(wrapper, "Подтвердить подключение").trigger("click");
    await flushPromises();

    channel = channelsStore.listByAgent("demo", agentId).find((c) => c.id === channelId);
    expect(channel.status).toBe("inactive");
    expect(channel.status).not.toBe("active");
    expect(channel.providerIdentity).toBeTruthy();
    expect(wrapper.text()).toContain("подключён");
    expect(wrapper.text()).toContain("Ответы клиентам ещё не включены");

    vi.useRealTimers();
  });

  it("«Подключить позже» с экрана подтверждения не оставляет канал зависшим в checking (post-review fix)", async () => {
    vi.useFakeTimers();
    const { wrapper, wizardStore } = await mountWizardAtTelegram();
    const channelsStore = useChannelsStore();

    await button(wrapper, "Создать нового бота").trigger("click");
    await flushPromises();
    await wrapper.find("input[type='password']").setValue("123456:AAExampleTelegramBotToken");
    await button(wrapper, "Проверить токен").trigger("click");
    await vi.advanceTimersByTimeAsync(600);
    await flushPromises();

    const { agentId, channelId } = wizardStore.getDraft("demo").resources;
    expect(channelsStore.listByAgent("demo", agentId).find((c) => c.id === channelId).status).toBe("checking");

    // Уходим с экрана подтверждения, не кликнув ни «Подтвердить подключение»,
    // ни «Ввести другой токен» — без фикса канал остался бы в "checking" навсегда.
    await button(wrapper, "Подключить позже").trigger("click");
    await flushPromises();

    const channel = channelsStore.listByAgent("demo", agentId).find((c) => c.id === channelId);
    expect(channel.status).not.toBe("checking");
    expect(channel.status).toBe("inactive");

    vi.useRealTimers();
  });

  it("«Назад» с экрана подтверждения тоже разрешает зависший checking (post-review fix)", async () => {
    vi.useFakeTimers();
    const { wrapper, wizardStore } = await mountWizardAtTelegram();
    const channelsStore = useChannelsStore();

    await button(wrapper, "Создать нового бота").trigger("click");
    await flushPromises();
    await wrapper.find("input[type='password']").setValue("123456:AAExampleTelegramBotToken");
    await button(wrapper, "Проверить токен").trigger("click");
    await vi.advanceTimersByTimeAsync(600);
    await flushPromises();

    const { agentId, channelId } = wizardStore.getDraft("demo").resources;

    await button(wrapper, "Назад").trigger("click");
    await flushPromises();

    const channel = channelsStore.listByAgent("demo", agentId).find((c) => c.id === channelId);
    expect(channel.status).toBe("inactive");

    vi.useRealTimers();
  });

  it("«Подключить позже» сохраняет черновик и переводит на следующий шаг", async () => {
    const { wrapper, router, wizardStore } = await mountWizardAtTelegram();

    await button(wrapper, "Подключить позже").trigger("click");
    await flushPromises();

    expect(wizardStore.getDraft("demo")).toBeTruthy();
    expect(wizardStore.getDraft("demo").status).toBe("in_progress");
    expect(router.currentRoute.value.params.step).toBe("review");
  });
});
