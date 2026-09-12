import { describe, expect, it } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { createMemoryHistory, createRouter, RouterView } from "vue-router";
import Buefy from "buefy";

import AgentWizard from "../../../../../src/components/agents/AgentWizard.vue";
import { useWizardStore } from "../../../../../src/stores/wizard.js";
import { useChannelsStore } from "../../../../../src/stores/channels.js";
import { useAgentsStore } from "../../../../../src/stores/agents.js";
import { useWorkspaceStore } from "../../../../../src/stores/workspace.js";

// Task A9.8: шаг «Проверка и запуск» — аудит перед запуском, «Сохранить без
// запуска»/«Включить ответы в Telegram» как два раздельных явных действия, и
// пост-launch навигация (открыть бота, диалоги, пауза, следующий агент). Тот
// же real-`<RouterView>` harness, что `TelegramStep.test.js` (Task A9.7).
const Host = { components: { RouterView }, template: "<RouterView />" };

async function mountWizardAtReview({ withConfirmedChannel = false } = {}) {
  const pinia = createPinia();
  setActivePinia(pinia);

  useWorkspaceStore().activeWorkspaceId = "demo";
  const wizardStore = useWizardStore();
  wizardStore.startDraft("demo");
  wizardStore.updateFields("demo", {
    agentName: "Агент поддержки",
    scenarioId: "faq",
    task: "Отвечать на вопросы о меню и графике работы.",
    style: "friendly",
    noAnswerAction: "apologize_offer_operator",
    operatorHandoff: "on_no_answer",
    modelClassId: "basic",
  });

  const channelsStore = useChannelsStore();

  if (withConfirmedChannel) {
    const { agent, channel } = wizardStore.ensureTelegramChannel("demo");
    channelsStore.confirmChannelIdentity("demo", agent.id, channel.id, {
      username: "@support_bot",
      url: "https://t.me/support_bot",
    });
  }

  wizardStore.goToStep("demo", "review");

  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/agents", name: "agents", component: { template: "<div />" } },
      { path: "/agents/new/:step?", name: "agent-wizard", component: AgentWizard },
      { path: "/agents/:id/settings", name: "agent-settings", component: { template: "<div />" } },
      {
        path: "/conversations/:agentId",
        name: "conversations-agent",
        component: { template: "<div />" },
      },
    ],
  });
  router.push({ name: "agent-wizard", params: { step: "review" } });
  await router.isReady();

  const wrapper = mount(Host, {
    global: {
      plugins: [pinia, router, Buefy],
    },
  });
  await flushPromises();

  return { wrapper, router, wizardStore, channelsStore };
}

function button(wrapper, text) {
  return wrapper.findAll("button").find((b) => b.text().trim() === text);
}

// Пост-launch действия отчасти рендерятся `<b-button tag="router-link">`/
// `<a>` вместо `<button>` (переход по маршруту/внешняя ссылка) — тот же
// `<a>`-как-кнопка приём, что `ChannelCard.vue`'s «Открыть бота».
function control(wrapper, text) {
  return wrapper.findAll("button, a").find((el) => el.text().trim() === text);
}

describe("AgentWizard.vue — шаг «Проверка и запуск» (Task A9.8)", () => {
  it("показывает аудит конфигурации и предупреждает о неподключённом Telegram", async () => {
    const { wrapper } = await mountWizardAtReview();

    expect(wrapper.text()).toContain("Агент поддержки");
    expect(wrapper.text()).toContain("Отвечать на вопросы о меню и графике работы.");
    expect(wrapper.text()).toContain("Telegram не подключён");
    expect(button(wrapper, "Включить ответы в Telegram").attributes("disabled")).toBeDefined();
  });

  it("«Сохранить без запуска» завершает draft и не включает ответы", async () => {
    const { wrapper, wizardStore, channelsStore } = await mountWizardAtReview({ withConfirmedChannel: true });

    await button(wrapper, "Сохранить без запуска").trigger("click");
    await flushPromises();

    const draft = wizardStore.getDraft("demo");
    expect(draft.status).toBe("completed");

    const { agentId, channelId } = draft.resources;
    const agentsStore = useAgentsStore();
    expect(agentsStore.getAgent("demo", agentId).status).toBe("Черновик");
    expect(channelsStore.listByAgent("demo", agentId).find((c) => c.id === channelId).status)
      .not.toBe("active");

    expect(wrapper.text()).toContain("Черновик сохранён");
    expect(wrapper.text()).toContain("Ответы клиентам ещё не включены");
    expect(control(wrapper, "Открыть настройки агента")).toBeTruthy();
  });

  it("после завершения draft'а (сохранение или запуск) «Назад»/«Отменить»/«Сохранить черновик» скрыты (post-review fix)", async () => {
    const { wrapper } = await mountWizardAtReview({ withConfirmedChannel: true });

    expect(button(wrapper, "Отменить")).toBeTruthy();
    expect(button(wrapper, "Назад")).toBeTruthy();

    await button(wrapper, "Сохранить без запуска").trigger("click");
    await flushPromises();

    // Терминальное состояние — review → confirmed success — не должно
    // предлагать вернуться назад/отменить уже завершённый draft.
    expect(button(wrapper, "Отменить")).toBeFalsy();
    expect(button(wrapper, "Назад")).toBeFalsy();
    expect(button(wrapper, "Сохранить черновик")).toBeFalsy();
    expect(button(wrapper, "Далее")).toBeFalsy();
  });

  it("конфликтующий (displaced) канал показывает отдельное сообщение и не завершает draft (post-review fix)", async () => {
    const { wrapper, wizardStore, channelsStore } = await mountWizardAtReview({ withConfirmedChannel: true });
    const { agentId, channelId } = wizardStore.getDraft("demo").resources;
    const channel = channelsStore.listByAgent("demo", agentId).find((c) => c.id === channelId);
    channel.status = "displaced";

    await button(wrapper, "Включить ответы в Telegram").trigger("click");
    await flushPromises();

    expect(wrapper.text()).toContain("Этот бот уже активирован в другом рабочем пространстве");
    expect(wizardStore.getDraft("demo").status).toBe("in_progress");
  });

  it("«Включить ответы в Telegram» недоступна без подтверждённого канала", async () => {
    const { wrapper, wizardStore } = await mountWizardAtReview();

    await button(wrapper, "Включить ответы в Telegram").trigger("click");
    await flushPromises();

    expect(wizardStore.getDraft("demo").status).toBe("in_progress");
  });

  it("успешный запуск активирует агента/канал и открывает пост-launch действия", async () => {
    const { wrapper, wizardStore, channelsStore } = await mountWizardAtReview({ withConfirmedChannel: true });

    await button(wrapper, "Включить ответы в Telegram").trigger("click");
    await flushPromises();

    const draft = wizardStore.getDraft("demo");
    const { agentId, channelId } = draft.resources;
    const agentsStore = useAgentsStore();

    expect(draft.status).toBe("completed");
    expect(agentsStore.getAgent("demo", agentId).status).toBe("Активен");
    expect(channelsStore.listByAgent("demo", agentId).find((c) => c.id === channelId).status).toBe("active");

    expect(wrapper.text()).toContain("Агент активен");
    expect(control(wrapper, "Открыть бота")).toBeTruthy();
    expect(control(wrapper, "Перейти к диалогам")).toBeTruthy();
    expect(button(wrapper, "Приостановить ответы")).toBeTruthy();
    expect(button(wrapper, "Создать следующего агента")).toBeTruthy();
  });

  it("«Приостановить ответы» останавливает уже запущенного агента, не переименовывая ошибку канала", async () => {
    const { wrapper } = await mountWizardAtReview({ withConfirmedChannel: true });

    await button(wrapper, "Включить ответы в Telegram").trigger("click");
    await flushPromises();

    await button(wrapper, "Приостановить ответы").trigger("click");
    await flushPromises();

    const agentsStore = useAgentsStore();
    const draft = useWizardStore().getDraft("demo");
    expect(agentsStore.getAgent("demo", draft.resources.agentId).status).toBe("Приостановлен");
    expect(control(wrapper, "Возобновить ответы")).toBeTruthy();
  });

  it("«Создать следующего агента» заводит новый черновик с шага «Боль», не продолжая прежний", async () => {
    const { wrapper, router, wizardStore } = await mountWizardAtReview({ withConfirmedChannel: true });

    await button(wrapper, "Сохранить без запуска").trigger("click");
    await flushPromises();
    const firstDraftId = wizardStore.getDraft("demo").id;

    await button(wrapper, "Создать следующего агента").trigger("click");
    await flushPromises();

    expect(router.currentRoute.value.params.step).toBe("pain");
    expect(wizardStore.getDraft("demo").id).not.toBe(firstDraftId);
    expect(wizardStore.getDraft("demo").fields.scenarioId).toBeUndefined();
  });
});
