import { describe, expect, it } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { createMemoryHistory, createRouter, RouterView } from "vue-router";
import Buefy from "buefy";

import AgentWizard from "../../../../../src/components/agents/AgentWizard.vue";
import { useWizardStore } from "../../../../../src/stores/wizard.js";
import { useWorkspaceStore } from "../../../../../src/stores/workspace.js";

// Task A9.5: model-class picker (main path) and "Расширенные параметры"
// disclosure (expert zone) on the "Правила" step — capability gating,
// draft-preserving expert/locale toggles, and the explicit
// revert-to-template confirmation. Same real-`<RouterView>` harness as
// `WizardSteps.test.js` (Task A9.3)/`KnowledgeStep.test.js` (Task A9.4).
const Host = { components: { RouterView }, template: "<RouterView />" };

async function mountWizardAtRules(workspaceId = "demo") {
  const pinia = createPinia();
  setActivePinia(pinia);

  useWorkspaceStore().activeWorkspaceId = workspaceId;
  const wizardStore = useWizardStore();
  wizardStore.startDraft(workspaceId);
  wizardStore.updateFields(workspaceId, { scenarioId: "faq", agentName: "Агент по частым вопросам" });
  wizardStore.goToStep(workspaceId, "rules");

  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/agents", name: "agents", component: { template: "<div />" } },
      { path: "/agents/new/:step?", name: "agent-wizard", component: AgentWizard },
    ],
  });
  router.push({ name: "agent-wizard", params: { step: "rules" } });
  await router.isReady();

  const wrapper = mount(Host, {
    global: {
      plugins: [pinia, router, Buefy],
    },
  });
  await flushPromises();

  return { wrapper, router, wizardStore };
}

function expertToggle(wrapper) {
  return wrapper.find(".tr-wizard-expert__toggle");
}

describe("RulesStep.vue — класс модели (Task A9.5)", () => {
  it("проставляет рекомендованный по сценарию класс без обязательного выбора", async () => {
    const { wrapper, wizardStore } = await mountWizardAtRules();

    expect(wizardStore.getDraft("demo").fields.modelClassId).toBe("basic");
    const cards = wrapper.findAll(".tr-wizard-model-class .tr-wizard-scenario");
    expect(cards.length).toBe(3);
  });

  it("выбор другого класса сохраняется в draft и не требует raw model id", async () => {
    const { wrapper, wizardStore } = await mountWizardAtRules();

    const cards = wrapper.findAll(".tr-wizard-model-class .tr-wizard-scenario");
    const powerCard = cards.find((card) => card.text().includes("Сильная"));
    await powerCard.trigger("click");
    await flushPromises();

    expect(wizardStore.getDraft("demo").fields.modelClassId).toBe("power");
    // Основной путь не показывает ни одного raw id каталога.
    expect(wrapper.find(".tr-wizard-model-class").text()).not.toMatch(/gpt-|claude-|gemini-/);
  });

  it("на тарифе с единственным доступным классом не показывает выбор", async () => {
    const { wrapper, wizardStore } = await mountWizardAtRules("empty");

    expect(wizardStore.getDraft("empty").fields.modelClassId).toBe("basic");
    expect(wrapper.find(".tr-wizard-model-class .tr-wizard-scenario-grid").exists()).toBe(false);
    expect(wrapper.find(".tr-wizard-model-class").text()).toContain("доступен только этот класс");
  });
});

describe("RulesStep.vue — «Расширенные параметры», клавиатурная доступность (Task A9.9)", () => {
  it("переключатель — фокусируемая кнопка с корректным aria-expanded/aria-controls", async () => {
    const { wrapper } = await mountWizardAtRules("demo");
    const toggle = expertToggle(wrapper);

    // Реальный `<button>`, не `<div>`/`<span>` с обработчиком клика —
    // достижим Tab'ом и активируется Enter/Space нативно.
    expect(toggle.element.tagName).toBe("BUTTON");
    expect(toggle.attributes("aria-expanded")).toBe("false");
    expect(wrapper.find("#wizard-expert-panel").exists()).toBe(false);

    await toggle.trigger("click");
    await flushPromises();

    expect(toggle.attributes("aria-expanded")).toBe("true");
    expect(toggle.attributes("aria-controls")).toBe("wizard-expert-panel");
    expect(wrapper.find("#wizard-expert-panel").exists()).toBe(true);

    await toggle.trigger("click");
    await flushPromises();

    expect(toggle.attributes("aria-expanded")).toBe("false");
  });
});

describe("RulesStep.vue — «Расширенные параметры» (Task A9.5)", () => {
  it("свёрнута по умолчанию и не даёт доступ к каталогу/BYOK на младшем тарифе", async () => {
    const { wrapper, wizardStore } = await mountWizardAtRules("demo");

    expect(wrapper.find(".tr-wizard-expert__panel").exists()).toBe(false);

    await expertToggle(wrapper).trigger("click");
    await flushPromises();

    const panel = wrapper.find(".tr-wizard-expert__panel");
    expect(panel.exists()).toBe(true);
    expect(panel.text()).toContain("Точный выбор модели недоступен");
    expect(panel.text()).toContain("Собственный ключ недоступен");
    expect(wizardStore.getDraft("demo").fields.modelClassId).toBe("basic");
  });

  it("на расширенном тарифе показывает каталог и BYOK", async () => {
    const { wrapper } = await mountWizardAtRules("trickster");

    await expertToggle(wrapper).trigger("click");
    await flushPromises();

    const panel = wrapper.find(".tr-wizard-expert__panel");
    expect(panel.find(".tr-model-select").exists()).toBe(true);
    expect(panel.text()).toContain("Использовать собственный ключ API");
  });

  it("переключение locale внутри экспертной зоны не теряет введённые поля", async () => {
    const { wrapper, wizardStore } = await mountWizardAtRules("trickster");

    wizardStore.updateFields("trickster", { task: "Помогать с настройкой." });
    await flushPromises();

    await expertToggle(wrapper).trigger("click");
    await flushPromises();

    const localeSelect = wrapper.find(".tr-wizard-expert__locale select");
    await localeSelect.setValue("en");
    await flushPromises();

    expect(wizardStore.getDraft("trickster").locale).toBe("en");
    expect(wizardStore.getDraft("trickster").fields.task).toBe("Помогать с настройкой.");
    expect(wrapper.find(".tr-wizard-expert__toggle").text()).toBe("Hide advanced parameters");

    // Возврат к русской locale — то же самое, поля по-прежнему на месте.
    await localeSelect.setValue("ru");
    await flushPromises();
    expect(wizardStore.getDraft("trickster").fields.task).toBe("Помогать с настройкой.");
  });

  it("пишет custom-инструкцию и требует явного подтверждения возврата к шаблону", async () => {
    const { wrapper, wizardStore } = await mountWizardAtRules("trickster");

    wizardStore.updateFields("trickster", {
      task: "Отвечать на вопросы о меню.",
      style: "friendly",
    });
    await flushPromises();

    await expertToggle(wrapper).trigger("click");
    await flushPromises();

    const panel = wrapper.find(".tr-wizard-expert__panel");
    const useCustomButton = panel.findAll("button").find((b) => b.text().trim() === "Написать вручную");
    await useCustomButton.trigger("click");
    await flushPromises();

    expect(wizardStore.getDraft("trickster").fields.instructionMode).toBe("custom");

    const textarea = panel.find("textarea");
    await textarea.setValue("Полностью свой текст инструкции.");
    await flushPromises();
    expect(wizardStore.getDraft("trickster").fields.instructionOverride).toBe("Полностью свой текст инструкции.");

    const revertButton = wrapper.findAll(".tr-wizard-expert__panel button")
      .find((b) => b.text().trim() === "Вернуться к шаблону");
    await revertButton.trigger("click");
    await flushPromises();

    // Подтверждение через модалку — сам custom-текст не стирается молча.
    expect(wizardStore.getDraft("trickster").fields.instructionMode).toBe("custom");
    expect(wizardStore.getDraft("trickster").fields.instructionOverride).toBe("Полностью свой текст инструкции.");
  });

  it("предупреждает о недоступном по тарифу выборе, не сбрасывая его", async () => {
    const { wrapper, wizardStore } = await mountWizardAtRules("empty");

    // Симулирует последствие downgrade тарифа — draft уже нёс значение,
    // недоступное текущей capability workspace `empty` (только `basic`).
    wizardStore.updateFields("empty", { modelClassId: "power" });
    await flushPromises();

    await expertToggle(wrapper).trigger("click");
    await flushPromises();

    expect(wrapper.find(".tr-wizard-expert__panel").text()).toContain("недоступен на этом тарифе");
    expect(wizardStore.getDraft("empty").fields.modelClassId).toBe("power");
  });
});
