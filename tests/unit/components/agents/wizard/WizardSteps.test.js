import { describe, expect, it } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { createMemoryHistory, createRouter, RouterView } from "vue-router";
import Buefy from "buefy";

import AgentWizard from "../../../../../src/components/agents/AgentWizard.vue";
import { useWizardStore, WIZARD_STEPS } from "../../../../../src/stores/wizard.js";
import { useWorkspaceStore } from "../../../../../src/stores/workspace.js";

// Task A9.3: shell + steps «Боль», «Контекст», «Правила» — covers the
// per-step gating/persistence contract that `AgentWizard.test.js` (Task
// A9.2) does not: real scenario/field content, "Далее" disabled until the
// current step is complete, and back/forward not losing what was typed.
//
// Same real-`<RouterView>` harness as `AgentWizard.test.js` (Task A9.2), for
// the same reason — unmounting the component the way the real shell would.
const Host = { components: { RouterView }, template: "<RouterView />" };

async function mountWizard(initialPath = "/agents/new", { attachToDocument = false } = {}) {
  const pinia = createPinia();
  setActivePinia(pinia);

  useWorkspaceStore().activeWorkspaceId = "demo";

  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/agents", name: "agents", component: { template: "<div />" } },
      { path: "/agents/new/:step?", name: "agent-wizard", component: AgentWizard },
    ],
  });
  router.push(initialPath);
  await router.isReady();

  const wrapper = mount(Host, {
    global: {
      plugins: [pinia, router, Buefy],
    },
    // Roving-focus assertions need real `document.activeElement`, which
    // jsdom only tracks for elements actually attached to the document.
    ...(attachToDocument ? { attachTo: document.body } : {}),
  });
  await flushPromises();

  return { wrapper, router };
}

function nextButton(wrapper) {
  return wrapper.findAll("button").find((b) => b.text().trim() === "Далее");
}

describe("AgentWizard.vue — шаг «Боль» (Task A9.3)", () => {
  it("показывает подготовленные сценарии и «Другая задача»", async () => {
    const { wrapper } = await mountWizard();

    const cards = wrapper.findAll(".tr-wizard-scenario");
    expect(cards.length).toBeGreaterThanOrEqual(4);
    expect(cards.at(-1).text()).toContain("Другая задача");
  });

  it("стрелки перемещают roving focus и выбор между карточками сценария (post-review fix)", async () => {
    const { wrapper } = await mountWizard("/agents/new", { attachToDocument: true });

    const cards = wrapper.findAll(".tr-wizard-scenario");
    // Пока ничего не выбрано, tabindex="0" держит только первая карточка —
    // остальные вне последовательности Tab (roving tabindex, WAI-ARIA APG).
    expect(cards[0].attributes("tabindex")).toBe("0");
    expect(cards[1].attributes("tabindex")).toBe("-1");

    await cards[0].trigger("keydown", { key: "ArrowRight" });
    await flushPromises();

    expect(useWizardStore().getDraft("demo").fields.scenarioId).toBe("product-pick");
    expect(document.activeElement).toBe(cards[1].element);
    expect(wrapper.findAll(".tr-wizard-scenario")[1].attributes("tabindex")).toBe("0");
    expect(wrapper.findAll(".tr-wizard-scenario")[0].attributes("tabindex")).toBe("-1");

    await wrapper.findAll(".tr-wizard-scenario")[1].trigger("keydown", { key: "ArrowLeft" });
    await flushPromises();

    expect(useWizardStore().getDraft("demo").fields.scenarioId).toBe("faq");
    expect(document.activeElement).toBe(wrapper.findAll(".tr-wizard-scenario")[0].element);

    wrapper.unmount();
  });

  it("выбор сценария разблокирует «Далее» и сохраняется в draft", async () => {
    const { wrapper, router } = await mountWizard();

    await wrapper.find(".tr-wizard-scenario").trigger("click");
    await flushPromises();

    expect(useWizardStore().getDraft("demo").fields.scenarioId).toBe("faq");
    expect(nextButton(wrapper).attributes("disabled")).toBeUndefined();

    await nextButton(wrapper).trigger("click");
    await flushPromises();

    expect(router.currentRoute.value.params.step).toBe("context");
  });

  it("«Другая задача» без описания не разблокирует «Далее»", async () => {
    const { wrapper } = await mountWizard();

    const otherCard = wrapper.findAll(".tr-wizard-scenario").at(-1);
    await otherCard.trigger("click");
    await flushPromises();

    expect(nextButton(wrapper).attributes("disabled")).toBeDefined();

    const textarea = wrapper.find("textarea");
    await textarea.setValue("Уточнять срок доставки перед подтверждением заказа.");
    await flushPromises();

    expect(nextButton(wrapper).attributes("disabled")).toBeUndefined();
  });

  // Task A9.9 (accessibility contract): the error message next to a field
  // must appear on `blur` — a keyboard-reachable event (Tab away from the
  // field), not only on submit/click — and must not show before the user
  // has touched the field at all.
  it("«Другая задача»: ошибка у поля появляется после blur, не при первом рендере", async () => {
    const { wrapper } = await mountWizard();

    const otherCard = wrapper.findAll(".tr-wizard-scenario").at(-1);
    await otherCard.trigger("click");
    await flushPromises();

    expect(wrapper.find(".help.is-danger").exists()).toBe(false);

    const textarea = wrapper.find("textarea");
    await textarea.trigger("blur");
    await flushPromises();

    expect(wrapper.find(".help.is-danger").exists()).toBe(true);
  });
});

describe("AgentWizard.vue — шаг «Контекст» (Task A9.3)", () => {
  it("предлагает имя агента по сценарию и не переписывает его после ручной правки", async () => {
    const { wrapper, router } = await mountWizard();
    const wizardStore = useWizardStore();

    wizardStore.updateFields("demo", { scenarioId: "faq" });
    await router.push({ name: "agent-wizard", params: { step: "context" } });
    await flushPromises();

    expect(wizardStore.getDraft("demo").fields.agentName).toBe("Агент по частым вопросам");

    const nameInput = wrapper.find('input[placeholder="Имя агента"]');
    await nameInput.setValue("Мой агент поддержки");
    await flushPromises();

    // Возврат к «Боли» и смена сценария не должны перезаписать ручную правку.
    await router.push({ name: "agent-wizard", params: { step: "pain" } });
    await flushPromises();
    wizardStore.updateFields("demo", { scenarioId: "product-pick" });
    await router.push({ name: "agent-wizard", params: { step: "context" } });
    await flushPromises();

    expect(wizardStore.getDraft("demo").fields.agentName).toBe("Мой агент поддержки");
  });

  // Task A9.9: same blur-based error contract as «Боль» above, on a
  // required text field of the «Контекст» step.
  it("ошибка у поля контекста появляется после blur, не при первом рендере", async () => {
    const { wrapper, router } = await mountWizard();
    const wizardStore = useWizardStore();

    wizardStore.updateFields("demo", { scenarioId: "faq" });
    await router.push({ name: "agent-wizard", params: { step: "context" } });
    await flushPromises();

    expect(wrapper.find(".help.is-danger").exists()).toBe(false);

    const businessInput = wrapper.findAll("textarea, input").at(0);
    await businessInput.trigger("blur");
    await flushPromises();

    expect(wrapper.find(".help.is-danger").exists()).toBe(true);
  });

  it("«Далее» неактивна, пока не заполнены все обязательные поля контекста", async () => {
    const { wrapper, router } = await mountWizard();
    const wizardStore = useWizardStore();

    wizardStore.updateFields("demo", { scenarioId: "faq" });
    await router.push({ name: "agent-wizard", params: { step: "context" } });
    await flushPromises();

    expect(nextButton(wrapper).attributes("disabled")).toBeDefined();

    wizardStore.updateFields("demo", {
      businessDescription: "Кофейня с доставкой",
      customerDescription: "Постоянные клиенты района",
      goalDescription: "Отвечать на вопросы о меню",
    });
    await flushPromises();

    // agentName уже подставлено сценарием — все четыре поля заполнены.
    expect(nextButton(wrapper).attributes("disabled")).toBeUndefined();
  });
});

describe("AgentWizard.vue — шаг «Правила» (Task A9.3)", () => {
  it("«Далее» недоступна на последнем реализованном шаге правил без выбора всех полей", async () => {
    const { wrapper, router } = await mountWizard();
    const wizardStore = useWizardStore();

    // "rules" достижим только после pain/context (post-review fix).
    wizardStore.updateFields("demo", {
      scenarioId: "faq",
      businessDescription: "Кофейня с доставкой",
      customerDescription: "Постоянные клиенты района",
      goalDescription: "Отвечать на вопросы о меню",
      agentName: "Агент поддержки",
    });
    await router.push({ name: "agent-wizard", params: { step: "rules" } });
    await flushPromises();

    // Rules — не последний шаг мастера (после него ещё «Знания» и т.д.),
    // поэтому «Далее» видна и должна оставаться неактивной без заполнения.
    expect(nextButton(wrapper).attributes("disabled")).toBeDefined();

    wizardStore.updateFields("demo", {
      task: "Отвечать на вопросы о меню и графике работы.",
      style: "friendly",
      noAnswerAction: "apologize_offer_operator",
      operatorHandoff: "on_no_answer",
    });
    await flushPromises();

    expect(nextButton(wrapper).attributes("disabled")).toBeUndefined();
  });

  it("back с шага «Контекст» на «Боль» и обратно сохраняет введённые правила", async () => {
    const { wrapper, router } = await mountWizard();
    const wizardStore = useWizardStore();

    // "rules" достижим только после pain/context (post-review fix).
    wizardStore.updateFields("demo", {
      scenarioId: "faq",
      businessDescription: "Кофейня с доставкой",
      customerDescription: "Постоянные клиенты района",
      goalDescription: "Отвечать на вопросы о меню",
      agentName: "Агент поддержки",
    });
    await router.push({ name: "agent-wizard", params: { step: "rules" } });
    await flushPromises();
    wizardStore.updateFields("demo", { task: "Помогать выбрать тариф." });
    await flushPromises();

    await wrapper.findAll("button").find((b) => b.text().trim() === "Назад").trigger("click");
    await flushPromises();
    expect(router.currentRoute.value.params.step).toBe("context");

    await router.push({ name: "agent-wizard", params: { step: "rules" } });
    await flushPromises();

    expect(wizardStore.getDraft("demo").fields.task).toBe("Помогать выбрать тариф.");
  });
});

describe("AgentWizard.vue — прогресс по шагам (Task A9.3)", () => {
  it("рендерит все семь смысловых шагов и подсвечивает текущий", async () => {
    const { wrapper } = await mountWizard();

    const items = wrapper.findAll(".tr-wizard-progress__item");
    expect(items.length).toBe(WIZARD_STEPS.length);
    expect(items[0].classes()).toContain("tr-wizard-progress__item--current");
  });
});
