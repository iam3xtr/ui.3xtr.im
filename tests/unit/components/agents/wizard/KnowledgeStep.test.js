import { describe, expect, it, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { createMemoryHistory, createRouter, RouterView } from "vue-router";
import Buefy from "buefy";

import AgentWizard from "../../../../../src/components/agents/AgentWizard.vue";
import { useWizardStore } from "../../../../../src/stores/wizard.js";
import { useKnowledgeStore } from "../../../../../src/stores/knowledge.js";
import { useWorkspaceStore } from "../../../../../src/stores/workspace.js";

// Task A9.4: шаг «Знания» — лениво создаваемая личная коллекция, статусы
// источников (loading/processing/ready/error) с retry/remove, и синхронизация
// имени коллекции с именем агента до первого явного переименования. Тот же
// real-`<RouterView>` harness, что `WizardSteps.test.js` (Task A9.3).
const Host = { components: { RouterView }, template: "<RouterView />" };

async function mountWizardAtKnowledge() {
  const pinia = createPinia();
  setActivePinia(pinia);

  useWorkspaceStore().activeWorkspaceId = "demo";
  const wizardStore = useWizardStore();
  wizardStore.startDraft("demo");
  wizardStore.updateFields("demo", { agentName: "Агент по частым вопросам" });
  wizardStore.goToStep("demo", "knowledge");

  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/agents", name: "agents", component: { template: "<div />" } },
      { path: "/agents/new/:step?", name: "agent-wizard", component: AgentWizard },
    ],
  });
  router.push({ name: "agent-wizard", params: { step: "knowledge" } });
  await router.isReady();

  const wrapper = mount(Host, {
    global: {
      plugins: [pinia, router, Buefy],
    },
  });
  await flushPromises();

  return { wrapper, router, wizardStore };
}

async function addTextSource(wrapper, name = "Аргументы для переговоров", content = "Текст источника") {
  const addTextButton = wrapper.findAll("button").find((b) => b.text().trim() === "Добавить текст");
  await addTextButton.trigger("click");
  await flushPromises();

  const nameInput = wrapper.find(".tr-wizard-source-form input");
  await nameInput.setValue(name);
  const contentTextarea = wrapper.find(".tr-wizard-source-form textarea");
  await contentTextarea.setValue(content);

  const submitButton = wrapper.findAll(".tr-wizard-source-form button")
    .find((b) => b.text().trim() === "Добавить");
  await submitButton.trigger("click");
  await flushPromises();
}

describe("AgentWizard.vue — шаг «Знания» (Task A9.4)", () => {
  it("без источников коллекция не создаётся и «Далее» доступна", async () => {
    const { wrapper, wizardStore } = await mountWizardAtKnowledge();

    expect(wizardStore.getDraft("demo").resources.collectionId).toBeNull();
    const nextButton = wrapper.findAll("button").find((b) => b.text().trim() === "Далее");
    expect(nextButton.attributes("disabled")).toBeUndefined();
  });

  it("добавление источника проходит loading → processing → ready и лениво заводит коллекцию", async () => {
    vi.useFakeTimers();
    const { wrapper, wizardStore } = await mountWizardAtKnowledge();

    await addTextSource(wrapper);

    expect(wrapper.find(".tr-wizard-source--loading").exists()).toBe(true);

    await vi.advanceTimersByTimeAsync(500);
    await flushPromises();

    const collectionId = wizardStore.getDraft("demo").resources.collectionId;
    expect(collectionId).not.toBeNull();
    const knowledgeStore = useKnowledgeStore();
    expect(knowledgeStore.getCollection("demo", collectionId).name).toBe("Агент по частым вопросам");
    expect(wrapper.find(".tr-wizard-source--processing").exists()).toBe(true);

    await vi.advanceTimersByTimeAsync(1300);
    await flushPromises();

    expect(wrapper.find(".tr-wizard-source--ready").exists()).toBe(true);
    vi.useRealTimers();
  });

  it("второй источник переиспользует уже созданную коллекцию", async () => {
    vi.useFakeTimers();
    const { wrapper, wizardStore } = await mountWizardAtKnowledge();
    const knowledgeStore = useKnowledgeStore();

    await addTextSource(wrapper, "Источник 1", "Текст 1");
    await vi.advanceTimersByTimeAsync(500);
    await flushPromises();

    const firstCollectionId = wizardStore.getDraft("demo").resources.collectionId;

    await addTextSource(wrapper, "Источник 2", "Текст 2");
    await vi.advanceTimersByTimeAsync(500);
    await flushPromises();

    expect(wizardStore.getDraft("demo").resources.collectionId).toBe(firstCollectionId);
    expect(knowledgeStore.listByWorkspace("demo").filter((c) => c.id === firstCollectionId).length).toBe(1);

    vi.useRealTimers();
  });

  it("уход на другой шаг и возврат не приводит к потере второго источника (post-review fix)", async () => {
    vi.useFakeTimers();
    const { wrapper, wizardStore, router } = await mountWizardAtKnowledge();
    const knowledgeStore = useKnowledgeStore();

    await addTextSource(wrapper, "Источник 1", "Текст 1");
    await vi.advanceTimersByTimeAsync(2000);
    await flushPromises();

    const collectionId = wizardStore.getDraft("demo").resources.collectionId;
    expect(knowledgeStore.getCollection("demo", collectionId).objects).toHaveLength(1);

    // Уходим на «Правила» и возвращаемся на «Знания» — KnowledgeStep.vue
    // размонтируется и монтируется заново (v-else-if в AgentWizard.vue).
    await router.push({ name: "agent-wizard", params: { step: "rules" } });
    await flushPromises();
    await router.push({ name: "agent-wizard", params: { step: "knowledge" } });
    await flushPromises();

    await addTextSource(wrapper, "Источник 2", "Текст 2");
    await vi.advanceTimersByTimeAsync(2000);
    await flushPromises();

    // Второй источник — не тот же объект, что первый, а его собственная
    // запись: без фикса `addKnowledgeSource` молча вернула бы уже
    // существующий объект по совпавшему после ремаунта sourceKey, и второй
    // элемент списка/объект коллекции просто не появился бы.
    const objects = knowledgeStore.getCollection("demo", collectionId).objects;
    expect(objects.map((object) => object.name).sort()).toEqual(["Источник 1", "Источник 2"]);
    expect(objects.map((object) => object.id)[0]).not.toBe(objects.map((object) => object.id)[1]);
    expect(wrapper.findAll(".tr-wizard-source")).toHaveLength(2);

    vi.useRealTimers();
  });

  it("удаление источника из draft'а не трогает другие коллекции пространства", async () => {
    vi.useFakeTimers();
    const { wrapper, wizardStore } = await mountWizardAtKnowledge();
    const knowledgeStore = useKnowledgeStore();
    const otherCollectionsBefore = knowledgeStore.listByWorkspace("demo").length;

    await addTextSource(wrapper);
    await vi.advanceTimersByTimeAsync(2000);
    await flushPromises();

    const removeButton = wrapper.findAll(".tr-wizard-source__actions button")
      .find((b) => b.attributes("aria-label")?.startsWith("Удалить источник"));
    await removeButton.trigger("click");
    await flushPromises();

    const collectionId = wizardStore.getDraft("demo").resources.collectionId;
    expect(knowledgeStore.getCollection("demo", collectionId).objects.length).toBe(0);
    // Никакая другая коллекция пространства не пропала.
    expect(knowledgeStore.listByWorkspace("demo").length).toBe(otherCollectionsBefore + 1);

    vi.useRealTimers();
  });

  it("изменение имени агента синхронизирует имя коллекции, пока она не переименована явно", async () => {
    vi.useFakeTimers();
    const { wrapper, wizardStore } = await mountWizardAtKnowledge();
    const knowledgeStore = useKnowledgeStore();

    await addTextSource(wrapper);
    await vi.advanceTimersByTimeAsync(500);
    await flushPromises();

    const collectionId = wizardStore.getDraft("demo").resources.collectionId;

    wizardStore.updateFields("demo", { agentName: "Новое имя агента" });
    await flushPromises();
    expect(knowledgeStore.getCollection("demo", collectionId).name).toBe("Новое имя агента");

    // Явное переименование (обычный экран настроек коллекции) останавливает
    // дальнейшую автоподстановку.
    knowledgeStore.updateCollection("demo", collectionId, { name: "Имя от пользователя", description: "" });
    wizardStore.updateFields("demo", { agentName: "Третье имя" });
    await flushPromises();

    expect(knowledgeStore.getCollection("demo", collectionId).name).toBe("Имя от пользователя");

    vi.useRealTimers();
  });
});
