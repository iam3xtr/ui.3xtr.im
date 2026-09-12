import { describe, expect, it } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { createMemoryHistory, createRouter, RouterView } from "vue-router";
import Buefy from "buefy";

import AgentWizard from "../../../../src/components/agents/AgentWizard.vue";
import { useWizardStore, WIZARD_STEPS } from "../../../../src/stores/wizard.js";
import { useWorkspaceStore } from "../../../../src/stores/workspace.js";

// Task A9.2: `AgentWizard.vue` is the one route-driven controller behind
// every "Создать агента" entry point - direct URL, browser back/forward and
// an invalid/missing step must all resolve through it without resetting a
// valid draft (`useWizardStore`, Task A9.1).
//
// Mounted under a real `<RouterView>` (not `AgentWizard` directly) so that
// navigating away from it - "Отменить" pushing to `agents` - actually
// unmounts the component the way the app shell would, instead of leaving its
// route-watchers alive to react to a route change they would never see in
// the real app.
const Host = { components: { RouterView }, template: "<RouterView />" };

async function mountWizard(initialPath = "/agents/new", workspaceId = "demo") {
  const pinia = createPinia();
  setActivePinia(pinia);

  useWorkspaceStore().activeWorkspaceId = workspaceId;

  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/agents", name: "agents", component: { template: "<div />" } },
      { path: "/agents/new/:step?", name: "agent-wizard", component: AgentWizard },
      // Registered so a completed draft's "review" step (post-review fix
      // test below) can render `ReviewStep.vue`'s post-launch `router-link`s
      // without crashing — same routes `ReviewStep.test.js` registers.
      { path: "/agents/:id/settings", name: "agent-settings", component: { template: "<div />" } },
      {
        path: "/conversations/:agentId",
        name: "conversations-agent",
        component: { template: "<div />" },
      },
    ],
  });
  router.push(initialPath);
  await router.isReady();

  const wrapper = mount(Host, {
    global: {
      plugins: [pinia, router, Buefy],
    },
  });
  await flushPromises();

  return { wrapper, router, pinia };
}

describe("AgentWizard.vue - единый вход и fallback (Task A9.2)", () => {
  it("прямой URL без шага заводит draft и нормализует адрес на его первый шаг", async () => {
    const { router } = await mountWizard("/agents/new");
    await flushPromises();

    expect(router.currentRoute.value.params.step).toBe(WIZARD_STEPS[0]);

    const wizardStore = useWizardStore();
    expect(wizardStore.getDraft("demo")).toBeTruthy();
    expect(wizardStore.getDraft("demo").step).toBe(WIZARD_STEPS[0]);
  });

  it("прямой URL с валидным и достижимым шагом синхронизирует draft на него (в т.ч. back/forward)", async () => {
    const { router } = await mountWizard("/agents/new");
    await flushPromises();

    // «Telegram» достижим только после pain/context/rules — иначе это и есть
    // finding «прямой URL обходит обязательные шаги» (post-review fix).
    useWizardStore().updateFields("demo", {
      scenarioId: "faq",
      businessDescription: "Кофейня у моста",
      customerDescription: "Постоянные клиенты района",
      goalDescription: "Разгрузить оператора от частых вопросов",
      agentName: "Агент поддержки",
      task: "Отвечать на вопросы о меню.",
      style: "friendly",
      noAnswerAction: "apologize_offer_operator",
      operatorHandoff: "on_no_answer",
    });
    await router.push("/agents/new/telegram");
    await flushPromises();

    expect(router.currentRoute.value.params.step).toBe("telegram");

    const wizardStore = useWizardStore();
    expect(wizardStore.getDraft("demo").step).toBe("telegram");
  });

  it("прямой URL вперёд по ещё не заполненным обязательным шагам не переводит draft (post-review fix)", async () => {
    const { router } = await mountWizard("/agents/new");
    await flushPromises();

    await router.push("/agents/new/review");
    await flushPromises();

    // Пустой draft не может «молча» оказаться на review — pain/context/rules
    // ещё не заполнены (Task A9.3 acceptance: «шаги нельзя молча пропустить»).
    expect(router.currentRoute.value.params.step).toBe(WIZARD_STEPS[0]);
    expect(useWizardStore().getDraft("demo").step).toBe(WIZARD_STEPS[0]);
  });

  it("завершённый draft всегда откатывается на review при любом другом :step в URL (post-review fix)", async () => {
    const { router } = await mountWizard("/agents/new");
    await flushPromises();

    const wizardStore = useWizardStore();
    wizardStore.updateFields("demo", {
      scenarioId: "faq",
      businessDescription: "Кофейня у моста",
      customerDescription: "Постоянные клиенты района",
      goalDescription: "Разгрузить оператора от частых вопросов",
      agentName: "Агент поддержки",
      task: "Отвечать на вопросы о меню.",
      style: "friendly",
      noAnswerAction: "apologize_offer_operator",
      operatorHandoff: "on_no_answer",
    });
    wizardStore.goToStep("demo", "review");
    wizardStore.completeDraft("demo");

    await router.push("/agents/new/telegram");
    await flushPromises();

    expect(router.currentRoute.value.params.step).toBe("review");
    expect(wizardStore.getDraft("demo").step).toBe("review");
  });

  it("невалидный шаг в URL откатывается на текущий шаг draft'а, не сбрасывая его", async () => {
    const { router } = await mountWizard("/agents/new");
    await flushPromises();

    // "context" достижим только после "pain" — заполняем сценарий, иначе
    // прямой переход на "context" сам был бы заблокирован тем же гвардом,
    // который проверяет этот тест (post-review fix).
    const wizardStore = useWizardStore();
    wizardStore.updateFields("demo", { scenarioId: "faq" });
    await router.push("/agents/new/context");
    await flushPromises();

    wizardStore.updateFields("demo", { businessName: "Кофейня у моста" });

    await router.push("/agents/new/not-a-real-step");
    await flushPromises();

    expect(router.currentRoute.value.params.step).toBe("context");
    expect(wizardStore.getDraft("demo").step).toBe("context");
    // `agentName` подставляется автоматически при входе на «Контекст» по
    // выбранному сценарию (Task A9.3) — не то, что этот тест проверяет;
    // важно, что `businessName` (произвольное поле, введённое до отката)
    // пережило откат невалидного шага.
    expect(wizardStore.getDraft("demo").fields).toEqual({
      scenarioId: "faq",
      agentName: "Агент по частым вопросам",
      businessName: "Кофейня у моста",
    });
  });

  it("«Далее» продвигает draft и URL синхронно после заполнения шага", async () => {
    const { wrapper, router } = await mountWizard("/agents/new");
    await flushPromises();

    // Task A9.3: «Далее» неактивна, пока шаг «Боль» не заполнен — сначала
    // выбираем сценарий, как это сделал бы пользователь.
    useWizardStore().updateFields("demo", { scenarioId: "faq" });
    await flushPromises();

    await wrapper.findAll("button").find((b) => b.text().trim() === "Далее").trigger("click");
    await flushPromises();

    expect(router.currentRoute.value.params.step).toBe(WIZARD_STEPS[1]);
    expect(useWizardStore().getDraft("demo").step).toBe(WIZARD_STEPS[1]);
  });

  it("«Далее» остаётся неактивной, пока обязательный шаг не заполнен", async () => {
    const { wrapper, router } = await mountWizard("/agents/new");
    await flushPromises();

    const nextButton = wrapper.findAll("button").find((b) => b.text().trim() === "Далее");
    expect(nextButton.attributes("disabled")).toBeDefined();

    await nextButton.trigger("click");
    await flushPromises();

    expect(router.currentRoute.value.params.step).toBe(WIZARD_STEPS[0]);
    expect(useWizardStore().getDraft("demo").step).toBe(WIZARD_STEPS[0]);
  });

  it("«Назад» с первого шага недоступна", async () => {
    const { wrapper } = await mountWizard("/agents/new");
    await flushPromises();

    const backButton = wrapper.findAll("button").find((b) => b.text().trim() === "Назад");
    expect(backButton.attributes("disabled")).toBeDefined();
  });

  it("«Отменить» удаляет draft и возвращает в каталог", async () => {
    const { wrapper, router } = await mountWizard("/agents/new");
    await flushPromises();

    const cancelButton = wrapper.findAll("button").find((b) => b.text().trim() === "Отменить");
    await cancelButton.trigger("click");
    await flushPromises();

    expect(useWizardStore().getDraft("demo")).toBeUndefined();
    expect(router.currentRoute.value.name).toBe("agents");
  });

  it("подсказки развёрнуты для первого агента пространства и остаются развёрнутыми после сохранения черновика (post-review fix)", async () => {
    // "empty" пространство без единого агента — в отличие от "demo",
    // используемого остальными тестами этого файла.
    const { wrapper, router } = await mountWizard("/agents/new", "empty");
    await flushPromises();

    expect(wrapper.find(".tr-wizard-hint--compact").exists()).toBe(false);
    expect(wrapper.findAll("button").find((b) => b.text().trim() === "Показать подсказки")).toBeFalsy();

    // Репродукция бага: шаг Telegram заводит реального агента в
    // `useAgentsStore()` ещё до завершения мастера — до фикса это на
    // повторном входе делало пространство "не первым".
    const wizardStore = useWizardStore();
    wizardStore.ensureTelegramChannel("empty");
    expect(wizardStore.getDraft("empty").resources.agentId).not.toBeNull();

    // "Сохранить черновик" уводит из мастера (unmount) и возвращает в каталог.
    await router.push("/agents");
    await flushPromises();

    // Повторный вход в тот же (уже не пустой по агентам) draft.
    await router.push("/agents/new/telegram");
    await flushPromises();

    expect(wrapper.find(".tr-wizard-hint--compact").exists()).toBe(false);
    expect(wrapper.findAll("button").find((b) => b.text().trim() === "Показать подсказки")).toBeFalsy();
  });

  it("подсказки компактны для пространства, где уже есть агенты", async () => {
    const { wrapper } = await mountWizard("/agents/new");
    await flushPromises();

    expect(wrapper.find(".tr-wizard-hint--compact").exists()).toBe(true);
    expect(wrapper.findAll("button").find((b) => b.text().trim() === "Показать подсказки")).toBeTruthy();
  });

  it("переключение пространства во время мастера показывает его собственный draft", async () => {
    const { router } = await mountWizard("/agents/new");
    await flushPromises();

    // "rules" достижим только после pain/context — иначе прямой переход сам
    // был бы заблокирован гвардом достижимости (post-review fix).
    useWizardStore().updateFields("demo", {
      scenarioId: "faq",
      businessDescription: "Кофейня у моста",
      customerDescription: "Постоянные клиенты района",
      goalDescription: "Разгрузить оператора от частых вопросов",
      agentName: "Агент поддержки",
    });
    await router.push("/agents/new/rules");
    await flushPromises();

    useWorkspaceStore().activeWorkspaceId = "trickster";
    await flushPromises();

    expect(router.currentRoute.value.params.step).toBe(WIZARD_STEPS[0]);
    expect(useWizardStore().getDraft("trickster").step).toBe(WIZARD_STEPS[0]);
    // Прежний draft демо-пространства остаётся на своём шаге, не затёрт.
    expect(useWizardStore().getDraft("demo").step).toBe("rules");
  });
});
