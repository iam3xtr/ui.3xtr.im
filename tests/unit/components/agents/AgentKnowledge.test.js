import { describe, expect, it, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { createMemoryHistory, createRouter } from "vue-router";
import Buefy from "buefy";

import AgentKnowledge from "../../../../src/components/agents/AgentKnowledge.vue";
import { useAgentsStore } from "../../../../src/stores/agents.js";
import { useKnowledgeStore } from "../../../../src/stores/knowledge.js";
import { useModalStore } from "../../../../src/stores/modal.js";
import { useWorkspaceStore } from "../../../../src/stores/workspace.js";

// jsdom has no `matchMedia` — `Loader.vue` reads it on mount (same fix as
// ChannelsView.test.js/Agents.test.js).
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

// Task A10.3: agent-detail «Знания» tab — durable `agent.knowledgeCollectionId`
// link (не воссоздаёт коллекцию при повторном визите), lazy creation on the
// first material, и три разных действия удаления (материал / убрать из
// знаний агента / удалить коллекцию целиком).
async function mountAgentKnowledge({ workspaceId = "demo", agentId = "1", pinia } = {}) {
  // `pinia` is optional (defaults to a fresh instance) so a "revisit the same
  // tab" scenario can remount the component against the *same* store instead
  // of silently resetting fixtures back to their initial state — a real
  // remount (navigate away/back) never resets `useAgentsStore()`'s state.
  const activePinia = pinia ?? createPinia();
  setActivePinia(activePinia);

  useWorkspaceStore().activeWorkspaceId = workspaceId;

  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/agents/:id/knowledge", name: "agent-knowledge", component: AgentKnowledge },
      { path: "/agents/:id", name: "agent", component: { template: "<div />" } },
    ],
  });
  router.push(`/agents/${agentId}/knowledge`);
  await router.isReady();

  vi.useFakeTimers();
  const wrapper = mount(AgentKnowledge, {
    global: {
      plugins: [activePinia, router, Buefy],
    },
  });
  vi.advanceTimersByTime(1000);
  vi.useRealTimers();
  await flushPromises();

  return { wrapper, router, pinia: activePinia };
}

async function addTextMaterial(wrapper, name = "Аргументы для переговоров", content = "Текст материала") {
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

describe("AgentKnowledge.vue — durable-ссылка на коллекцию (Task A10.3)", () => {
  it("агент без коллекции показывает пустое состояние и не создаёт коллекцию сразу", async () => {
    const { wrapper } = await mountAgentKnowledge();
    const knowledgeStore = useKnowledgeStore();
    const before = knowledgeStore.listByWorkspace("demo").length;

    expect(wrapper.find(".tr-async-state--empty").exists()).toBe(true);
    expect(knowledgeStore.listByWorkspace("demo").length).toBe(before);
  });

  it("первый материал заводит личную коллекцию и связывает её с агентом", async () => {
    const { wrapper } = await mountAgentKnowledge();
    const agentsStore = useAgentsStore();

    vi.useFakeTimers();
    await addTextMaterial(wrapper);
    await vi.advanceTimersByTimeAsync(2000);
    await flushPromises();

    const agent = agentsStore.getAgent("demo", "1");
    expect(agent.knowledgeCollectionId).not.toBeNull();

    const knowledgeStore = useKnowledgeStore();
    const collection = knowledgeStore.getCollection("demo", agent.knowledgeCollectionId);
    expect(collection.name).toBe(agent.name);
    expect(collection.objects).toHaveLength(1);

    vi.useRealTimers();
  });

  it("повторный визит переиспользует уже связанную коллекцию агента (не создаёт вторую)", async () => {
    // trickster/agent 1 уже связан с существующей коллекцией id=1
    // ("Trickster Docs") — фикстура повторного визита.
    const { wrapper } = await mountAgentKnowledge({ workspaceId: "trickster", agentId: "1" });
    const knowledgeStore = useKnowledgeStore();
    const before = knowledgeStore.listByWorkspace("trickster").length;

    expect(wrapper.find(".tr-wizard-source-list").exists()).toBe(true);
    expect(wrapper.findAll(".tr-wizard-source")).toHaveLength(1);

    vi.useFakeTimers();
    await addTextMaterial(wrapper, "Ещё один материал", "Текст");
    await vi.advanceTimersByTimeAsync(2000);
    await flushPromises();
    vi.useRealTimers();

    // Второй материал ушёл в ту же коллекцию — общее число коллекций
    // пространства не выросло.
    expect(knowledgeStore.listByWorkspace("trickster").length).toBe(before);
    expect(knowledgeStore.getCollection("trickster", 1).objects.length).toBe(2);
  });

  it("второй визит на пустого агента после первого материала находит ту же коллекцию", async () => {
    const { wrapper: firstWrapper, pinia } = await mountAgentKnowledge({ agentId: "2" });

    vi.useFakeTimers();
    await addTextMaterial(firstWrapper);
    await vi.advanceTimersByTimeAsync(2000);
    await flushPromises();
    vi.useRealTimers();

    const agentsStore = useAgentsStore();
    const knowledgeStore = useKnowledgeStore();
    const collectionId = agentsStore.getAgent("demo", "2").knowledgeCollectionId;
    const collectionsBefore = knowledgeStore.listByWorkspace("demo").length;

    // Ремонтируем компонент заново на том же сторе — как повторный визит на
    // ту же вкладку (реальный remount не сбрасывает `useAgentsStore()`).
    firstWrapper.unmount();
    const { wrapper: secondWrapper } = await mountAgentKnowledge({ agentId: "2", pinia });

    expect(agentsStore.getAgent("demo", "2").knowledgeCollectionId).toBe(collectionId);
    expect(knowledgeStore.listByWorkspace("demo").length).toBe(collectionsBefore);
    expect(secondWrapper.findAll(".tr-wizard-source")).toHaveLength(1);
  });
});

describe("AgentKnowledge.vue — статусы материалов (Task A10.3)", () => {
  it("новый материал проходит upload → processing → ready/error", async () => {
    const { wrapper } = await mountAgentKnowledge();

    vi.useFakeTimers();
    await addTextMaterial(wrapper);
    expect(wrapper.find(".tr-wizard-source--upload").exists()).toBe(true);

    await vi.advanceTimersByTimeAsync(500);
    await flushPromises();
    expect(wrapper.find(".tr-wizard-source--processing").exists()).toBe(true);

    await vi.advanceTimersByTimeAsync(1300);
    await flushPromises();
    expect(wrapper.find(".tr-wizard-source--ready").exists()).toBe(true);

    vi.useRealTimers();
  });

  it("ошибка предлагает «Повторить», который детерминированно завершается успехом", async () => {
    const { wrapper } = await mountAgentKnowledge();

    vi.useFakeTimers();
    // Каждый третий материал уходит в ошибку — заводим три, чтобы третий гарантированно упал.
    await addTextMaterial(wrapper, "M1", "т1");
    await vi.advanceTimersByTimeAsync(2000);
    await flushPromises();
    await addTextMaterial(wrapper, "M2", "т2");
    await vi.advanceTimersByTimeAsync(2000);
    await flushPromises();
    await addTextMaterial(wrapper, "M3", "т3");
    await vi.advanceTimersByTimeAsync(2000);
    await flushPromises();

    expect(wrapper.find(".tr-wizard-source--error").exists()).toBe(true);

    const retryButton = wrapper.findAll("button").find((b) => b.text().trim() === "Повторить");
    expect(retryButton).toBeDefined();
    await retryButton.trigger("click");
    await vi.advanceTimersByTimeAsync(1300);
    await flushPromises();

    expect(wrapper.find(".tr-wizard-source--error").exists()).toBe(false);

    vi.useRealTimers();
  });
});

describe("AgentKnowledge.vue — три действия удаления (Task A10.3)", () => {
  // Fake timers stay ON for the whole test (only `vi.useRealTimers()` at the
  // very end): `@vue/test-utils`'s `trigger()` stamps the dispatched event
  // with `Date.now() + 1` to defeat Vue's "ignore events older than when the
  // listener was attached" guard — switching back to real timers between
  // mounting a button (attached under an already-advanced fake clock) and
  // clicking it makes that stamp look *older* than the attach time, and Vue
  // silently drops the click. `KnowledgeStep.test.js` follows the same rule.
  async function withMaterial(options) {
    const { wrapper } = await mountAgentKnowledge(options);
    vi.useFakeTimers();
    await addTextMaterial(wrapper);
    await vi.advanceTimersByTimeAsync(2000);
    await flushPromises();
    return wrapper;
  }

  it("«Удалить материал» — мгновенно, без confirm, не трогает коллекцию", async () => {
    const wrapper = await withMaterial();
    const agentsStore = useAgentsStore();
    const knowledgeStore = useKnowledgeStore();
    const collectionId = agentsStore.getAgent("demo", "1").knowledgeCollectionId;

    const removeButton = wrapper.findAll(".tr-wizard-source__actions button")
      .find((b) => b.attributes("aria-label")?.startsWith("Удалить материал"));
    await removeButton.trigger("click");
    await flushPromises();

    expect(knowledgeStore.getCollection("demo", collectionId)).toBeDefined();
    expect(knowledgeStore.getCollection("demo", collectionId).objects).toHaveLength(0);

    vi.useRealTimers();
  });

  it("«Убрать из знаний агента» отменённое подтверждение ничего не меняет", async () => {
    const wrapper = await withMaterial();
    const modalStore = useModalStore();
    const agentsStore = useAgentsStore();
    vi.spyOn(modalStore, "confirm").mockImplementation(() => {});

    const unlinkButton = wrapper.findAll("button").find((b) => b.text().trim() === "Убрать из знаний агента");
    await unlinkButton.trigger("click");

    expect(modalStore.confirm).toHaveBeenCalledOnce();
    expect(agentsStore.getAgent("demo", "1").knowledgeCollectionId).not.toBeNull();

    vi.useRealTimers();
  });

  it("«Убрать из знаний агента» подтверждённое — отвязывает агента, коллекция и материалы остаются", async () => {
    const wrapper = await withMaterial();
    const modalStore = useModalStore();
    const agentsStore = useAgentsStore();
    const knowledgeStore = useKnowledgeStore();
    const collectionId = agentsStore.getAgent("demo", "1").knowledgeCollectionId;
    vi.spyOn(modalStore, "confirm").mockImplementation((options) => options.onConfirm?.());

    const unlinkButton = wrapper.findAll("button").find((b) => b.text().trim() === "Убрать из знаний агента");
    await unlinkButton.trigger("click");
    await flushPromises();

    expect(agentsStore.getAgent("demo", "1").knowledgeCollectionId).toBeNull();
    // Коллекция и её материал остаются в разделе «Знания».
    expect(knowledgeStore.getCollection("demo", collectionId)).toBeDefined();
    expect(knowledgeStore.getCollection("demo", collectionId).objects).toHaveLength(1);

    vi.useRealTimers();
  });

  it("«Удалить коллекцию» подтверждённое — стирает коллекцию и отвязывает затронутых агентов", async () => {
    const wrapper = await withMaterial();
    const modalStore = useModalStore();
    const agentsStore = useAgentsStore();
    const knowledgeStore = useKnowledgeStore();
    const collectionId = agentsStore.getAgent("demo", "1").knowledgeCollectionId;
    vi.spyOn(modalStore, "confirm").mockImplementation((options) => options.onConfirm?.());

    const deleteButton = wrapper.findAll("button").find((b) => b.text().trim() === "Удалить коллекцию");
    await deleteButton.trigger("click");
    await flushPromises();

    expect(knowledgeStore.getCollection("demo", collectionId)).toBeUndefined();
    expect(agentsStore.getAgent("demo", "1").knowledgeCollectionId).toBeNull();

    vi.useRealTimers();
  });

  it("«Удалить коллекцию» называет затронутого агента по имени в подтверждении", async () => {
    const wrapper = await withMaterial();
    const modalStore = useModalStore();
    const agentsStore = useAgentsStore();
    const agentName = agentsStore.getAgent("demo", "1").name;
    const confirmSpy = vi.spyOn(modalStore, "confirm").mockImplementation(() => {});

    const deleteButton = wrapper.findAll("button").find((b) => b.text().trim() === "Удалить коллекцию");
    await deleteButton.trigger("click");

    expect(confirmSpy).toHaveBeenCalledOnce();
    expect(confirmSpy.mock.calls[0][0].message).toContain(agentName);

    vi.useRealTimers();
  });

  it("удаление не затрагивает коллекции/агентов другого пространства", async () => {
    const wrapper = await withMaterial();
    const modalStore = useModalStore();
    const agentsStore = useAgentsStore();
    const knowledgeStore = useKnowledgeStore();
    vi.spyOn(modalStore, "confirm").mockImplementation((options) => options.onConfirm?.());

    const tricksterCollectionsBefore = knowledgeStore.listByWorkspace("trickster").length;
    const tricksterAgentBefore = agentsStore.getAgent("trickster", "1").knowledgeCollectionId;

    const deleteButton = wrapper.findAll("button").find((b) => b.text().trim() === "Удалить коллекцию");
    await deleteButton.trigger("click");
    await flushPromises();

    expect(knowledgeStore.listByWorkspace("trickster").length).toBe(tricksterCollectionsBefore);
    expect(agentsStore.getAgent("trickster", "1").knowledgeCollectionId).toBe(tricksterAgentBefore);

    vi.useRealTimers();
  });
});
