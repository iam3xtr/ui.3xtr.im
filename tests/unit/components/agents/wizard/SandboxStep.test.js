import { describe, expect, it, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { createMemoryHistory, createRouter, RouterView } from "vue-router";
import Buefy from "buefy";

import AgentWizard from "../../../../../src/components/agents/AgentWizard.vue";
import { useWizardStore } from "../../../../../src/stores/wizard.js";
import { useAgentsStore } from "../../../../../src/stores/agents.js";
import { useWorkspaceStore } from "../../../../../src/stores/workspace.js";

// Task A9.6: шаг «Песочница» — сценарные/общие/«без ответа» вопросы, свой
// вопрос, возврат к правилам/знаниям и «Изменения не проверены» после правки
// уже проверенных полей. Тот же real-`<RouterView>` harness, что
// `KnowledgeStep.test.js` (Task A9.4).
const Host = { components: { RouterView }, template: "<RouterView />" };

async function mountWizardAtSandbox(fields = {}) {
  const pinia = createPinia();
  setActivePinia(pinia);

  useWorkspaceStore().activeWorkspaceId = "demo";
  const wizardStore = useWizardStore();
  wizardStore.startDraft("demo");
  wizardStore.updateFields("demo", {
    task: "Отвечать на вопросы о меню.",
    style: "friendly",
    noAnswerAction: "ask_clarify",
    operatorHandoff: "on_no_answer",
    scenarioId: "faq",
    ...fields,
  });
  wizardStore.goToStep("demo", "sandbox");

  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/agents", name: "agents", component: { template: "<div />" } },
      { path: "/agents/new/:step?", name: "agent-wizard", component: AgentWizard },
    ],
  });
  router.push({ name: "agent-wizard", params: { step: "sandbox" } });
  await router.isReady();

  const wrapper = mount(Host, {
    global: {
      plugins: [pinia, router, Buefy],
    },
  });
  await flushPromises();

  return { wrapper, router, wizardStore };
}

describe("AgentWizard.vue — шаг «Песочница» (Task A9.6)", () => {
  it("не показывает уже пройденный шаг завершённым без теста — подсказка «ещё не проверено»", async () => {
    const { wrapper } = await mountWizardAtSandbox();

    expect(wrapper.find(".message.is-warning").exists()).toBe(false);
    expect(wrapper.text()).not.toContain("Проверено в песочнице");
  });

  it("сценарный вопрос отправляется как сообщение клиента и не пишет в agentsStore.sendMessage", async () => {
    vi.useFakeTimers();
    const { wrapper } = await mountWizardAtSandbox();
    const agentsStore = useAgentsStore();
    const sendSpy = vi.spyOn(agentsStore, "sendMessage");

    const scenarioButton = wrapper.findAll(".tr-wizard-source-add__actions button")
      .find((b) => b.text() === "Какой у вас график работы по выходным?");
    expect(scenarioButton).toBeTruthy();
    await scenarioButton.trigger("click");
    await flushPromises();

    expect(wrapper.find(".tr-chat-message.is-outgoing").text()).toBe("Какой у вас график работы по выходным?");
    expect(sendSpy).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(500);
    await flushPromises();

    // Без знаний в коллекции демо-ответ уходит в fallback ветку выбранного правила.
    expect(wrapper.text()).toContain("Уточните, пожалуйста");
    vi.useRealTimers();
  });

  it("явный «вопрос без ответа» всегда получает fallback-реакцию, даже с готовыми знаниями", async () => {
    vi.useFakeTimers();
    const { wrapper } = await mountWizardAtSandbox();

    const noInfoButton = wrapper.findAll(".tr-wizard-source-add__actions button")
      .find((b) => b.text() === "Расскажите про то, чего точно нет в ваших материалах.");
    await noInfoButton.trigger("click");
    await vi.advanceTimersByTimeAsync(500);
    await flushPromises();

    expect(wrapper.text()).toContain("Уточните, пожалуйста");
    vi.useRealTimers();
  });

  it("свой вопрос отправляется по Enter и очищает поле", async () => {
    vi.useFakeTimers();
    const { wrapper } = await mountWizardAtSandbox();

    const input = wrapper.find(".tr-conversation-composer-input input");
    await input.setValue("Работаете ли вы в праздники?");
    await input.trigger("keyup.enter");
    await flushPromises();

    expect(wrapper.find(".tr-chat-message.is-outgoing").text()).toBe("Работаете ли вы в праздники?");
    expect(input.element.value).toBe("");

    vi.advanceTimersByTime(500);
    vi.useRealTimers();
  });

  it("пустой свой вопрос не отправляется", async () => {
    const { wrapper } = await mountWizardAtSandbox();

    const input = wrapper.find(".tr-conversation-composer-input input");
    await input.setValue("   ");
    await input.trigger("keyup.enter");
    await flushPromises();

    expect(wrapper.find(".tr-chat-message").exists()).toBe(false);
  });

  it("«Изменить правила»/«Изменить знания» переводят draft на нужный шаг", async () => {
    const { wrapper, router, wizardStore } = await mountWizardAtSandbox();

    const rulesButton = wrapper.findAll("button").find((b) => b.text() === "Изменить правила");
    await rulesButton.trigger("click");
    await flushPromises();

    expect(wizardStore.getDraft("demo").step).toBe("rules");
    expect(router.currentRoute.value.params.step).toBe("rules");
  });

  it("уход со шага и правка правил до ответа таймера не помечает изменённую конфигурацию проверенной (post-review fix)", async () => {
    vi.useFakeTimers();
    const { wrapper, wizardStore } = await mountWizardAtSandbox();

    const scenarioButton = wrapper.findAll(".tr-wizard-source-add__actions button")
      .find((b) => b.text() === "Какой у вас график работы по выходным?");
    await scenarioButton.trigger("click");

    // Уходим со шага до истечения таймера ответа (400мс) и меняем правила —
    // без фикса таймер сработал бы уже после этого и пересчитал бы подпись
    // по новым, никогда не протестированным полям.
    const rulesButton = wrapper.findAll("button").find((b) => b.text() === "Изменить правила");
    await rulesButton.trigger("click");
    await flushPromises();
    expect(wizardStore.getDraft("demo").step).toBe("rules");

    wizardStore.updateFields("demo", { task: "Отвечать на вопросы о меню и доставке." });

    await vi.advanceTimersByTimeAsync(500);
    await flushPromises();

    expect(wizardStore.getDraft("demo").fields.sandboxVerifiedSignature).toBeFalsy();

    vi.useRealTimers();
  });

  it("после проверки правка правил помечает «Изменения не проверены»", async () => {
    vi.useFakeTimers();
    const { wrapper, wizardStore } = await mountWizardAtSandbox();

    const scenarioButton = wrapper.findAll(".tr-wizard-source-add__actions button")
      .find((b) => b.text() === "Какой у вас график работы по выходным?");
    await scenarioButton.trigger("click");
    await vi.advanceTimersByTimeAsync(500);
    await flushPromises();

    expect(wizardStore.getDraft("demo").fields.sandboxVerifiedSignature).toBeTruthy();
    expect(wrapper.text()).toContain("Проверено в песочнице");

    wizardStore.updateFields("demo", { task: "Отвечать на вопросы о меню и доставке." });
    await flushPromises();

    expect(wrapper.find(".message.is-warning").exists()).toBe(true);
    expect(wrapper.text()).toContain("Изменения не проверены");

    vi.useRealTimers();
  });
});
