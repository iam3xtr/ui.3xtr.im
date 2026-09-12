import { beforeEach, describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import {
  classifyTelegramToken,
  DEFAULT_WIZARD_LOCALE,
  generateInstructionTemplate,
  getRecommendedModelClassId,
  getSandboxNoAnswerReply,
  getWizardAgentName,
  getWizardKnowledgeCollectionName,
  isSandboxVerificationStale,
  isStepReachable,
  normalizeWizardLocale,
  useWizardStore,
  WIZARD_LOCALES,
  WIZARD_STEPS,
} from "../../../src/stores/wizard.js";
import { useAgentsStore } from "../../../src/stores/agents.js";
import { useKnowledgeStore } from "../../../src/stores/knowledge.js";
import { useChannelsStore } from "../../../src/stores/channels.js";

describe("stores/wizard — изоляция по workspace и reload", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("новый Pinia-инстанс (эквивалент reload) не содержит fixtures — стор чисто in-memory", () => {
    const store = useWizardStore();

    expect(store.draftsByWorkspace).toEqual({});
  });

  it("draft одного пространства не виден в другом", () => {
    const store = useWizardStore();

    store.startDraft("demo");

    expect(store.getDraft("demo")).toBeTruthy();
    expect(store.getDraft("trickster")).toBeUndefined();
  });

  it("ресурсы, созданные в draft'е одного workspace, не попадают в другой", () => {
    const store = useWizardStore();
    const agentsStore = useAgentsStore();

    store.startDraft("demo");
    store.ensureAgent("demo", "Демо-агент");

    store.startDraft("trickster");
    const result = store.ensureAgent("trickster", "Trickster-агент");

    expect(result.agent.name).toBe("Trickster-агент");
    expect(agentsStore.listByWorkspace("trickster").some((a) => a.id === result.agent.id)).toBe(true);
    expect(agentsStore.listByWorkspace("demo").some((a) => a.name === "Trickster-агент")).toBe(false);
  });
});

describe("stores/wizard — продолжение, новый draft и отмена", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("continueDraft без существующего draft'а — явный отказ, а не undefined", () => {
    const store = useWizardStore();

    expect(store.continueDraft("demo")).toEqual({ ok: false, reason: "no_draft" });
  });

  it("startDraft затем continueDraft находит тот же draft", () => {
    const store = useWizardStore();
    const { draft } = store.startDraft("demo");

    const result = store.continueDraft("demo");

    expect(result.ok).toBe(true);
    expect(result.draft.id).toBe(draft.id);
  });

  it("повторный startDraft заводит новый draft взамен прежнего", () => {
    const store = useWizardStore();
    const first = store.startDraft("demo").draft;

    const second = store.startDraft("demo").draft;

    expect(second.id).not.toBe(first.id);
    expect(store.getDraft("demo").id).toBe(second.id);
  });

  it("новый startDraft не удаляет ресурсы, уже созданные прежним draft'ом", () => {
    const store = useWizardStore();
    const agentsStore = useAgentsStore();

    store.startDraft("demo");
    const { agent } = store.ensureAgent("demo", "Первый агент");

    store.startDraft("demo");

    expect(agentsStore.getAgent("demo", agent.id)).toBeTruthy();
  });

  it("cancelDraft удаляет активный draft", () => {
    const store = useWizardStore();
    store.startDraft("demo");

    const result = store.cancelDraft("demo");

    expect(result).toEqual({ ok: true });
    expect(store.getDraft("demo")).toBeUndefined();
  });

  it("повторная отмена (duplicate cancel) безопасна и явно отказывает", () => {
    const store = useWizardStore();
    store.startDraft("demo");

    store.cancelDraft("demo");
    const second = store.cancelDraft("demo");

    expect(second).toEqual({ ok: false, reason: "no_draft" });
  });

  it("отмена не трогает уже созданные агента и коллекцию — общие данные остаются", () => {
    const store = useWizardStore();
    const agentsStore = useAgentsStore();
    const knowledgeStore = useKnowledgeStore();

    store.startDraft("demo");
    const { agent } = store.ensureAgent("demo", "Агент до отмены");
    const { collection } = store.ensureCollection("demo", "Агент до отмены");

    store.cancelDraft("demo");

    expect(agentsStore.getAgent("demo", agent.id)).toBeTruthy();
    expect(knowledgeStore.getCollection("demo", collection.id)).toBeTruthy();
  });

  it("отмена не трогает завершённый draft — completeDraft закрывает его для cancel/continue", () => {
    const store = useWizardStore();
    store.startDraft("demo");
    store.completeDraft("demo");

    expect(store.continueDraft("demo")).toEqual({ ok: false, reason: "no_draft" });
    expect(store.cancelDraft("demo")).toEqual({ ok: false, reason: "no_draft" });
  });
});

describe("stores/wizard — back/forward и невалидный шаг", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("новый draft начинается с первого шага", () => {
    const store = useWizardStore();
    const { draft } = store.startDraft("demo");

    expect(draft.step).toBe(WIZARD_STEPS[0]);
  });

  it("goToNextStep продвигает по порядку шагов", () => {
    const store = useWizardStore();
    store.startDraft("demo");

    const result = store.goToNextStep("demo");

    expect(result).toEqual({ ok: true, draft: store.getDraft("demo") });
    expect(store.getDraft("demo").step).toBe(WIZARD_STEPS[1]);
  });

  it("goToPreviousStep с первого шага — явный отказ, шаг не меняется", () => {
    const store = useWizardStore();
    store.startDraft("demo");

    const result = store.goToPreviousStep("demo");

    expect(result).toEqual({ ok: false, reason: "at_first_step" });
    expect(store.getDraft("demo").step).toBe(WIZARD_STEPS[0]);
  });

  it("goToNextStep с последнего шага — явный отказ", () => {
    const store = useWizardStore();
    store.startDraft("demo");
    WIZARD_STEPS.slice(1).forEach(() => store.goToNextStep("demo"));

    const result = store.goToNextStep("demo");

    expect(result).toEqual({ ok: false, reason: "at_last_step" });
    expect(store.getDraft("demo").step).toBe(WIZARD_STEPS[WIZARD_STEPS.length - 1]);
  });

  it("back сохраняет поля, введённые на следующем шаге", () => {
    const store = useWizardStore();
    store.startDraft("demo");
    store.updateFields("demo", { scenarioId: "billing-question" });
    store.goToNextStep("demo");
    store.updateFields("demo", { businessName: "Кофейня у моста" });

    store.goToPreviousStep("demo");

    expect(store.getDraft("demo").fields).toEqual({
      scenarioId: "billing-question",
      businessName: "Кофейня у моста",
    });
  });

  it("goToStep с невалидным именем — явный отказ, текущий шаг не меняется", () => {
    const store = useWizardStore();
    store.startDraft("demo");

    const result = store.goToStep("demo", "not-a-real-step");

    expect(result).toEqual({ ok: false, reason: "invalid_step" });
    expect(store.getDraft("demo").step).toBe(WIZARD_STEPS[0]);
  });

  it("goToStep на существующий шаг работает напрямую (не только по одному)", () => {
    const store = useWizardStore();
    store.startDraft("demo");

    const result = store.goToStep("demo", "telegram");

    expect(result.ok).toBe(true);
    expect(store.getDraft("demo").step).toBe("telegram");
  });
});

// Post-review fix: прямой URL не должен позволять обойти обязательные шаги
// мастера (`AgentWizard.vue#syncStepFromRoute` — единственный вызывающий
// код; `goToStep`/`goToStepDirect` сами остаются без этой проверки, см.
// `isStepReachable`'s собственный docstring).
describe("stores/wizard — isStepReachable (post-review fix)", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  function completeFields() {
    return {
      scenarioId: "faq",
      businessDescription: "Кофейня у моста",
      customerDescription: "Постоянные клиенты района",
      goalDescription: "Разгрузить оператора",
      agentName: "Агент поддержки",
      task: "Отвечать на вопросы о меню.",
      style: "friendly",
      noAnswerAction: "apologize_offer_operator",
      operatorHandoff: "on_no_answer",
    };
  }

  it("любой шаг дальше pain недостижим на пустом draft'е", () => {
    const store = useWizardStore();
    store.startDraft("demo");
    const draft = store.getDraft("demo");

    for (const step of WIZARD_STEPS.slice(1)) {
      expect(isStepReachable(draft, step)).toBe(false);
    }
    expect(isStepReachable(draft, "pain")).toBe(true);
  });

  it("шаг достижим только после того, как все предшествующие ему заполнены", () => {
    const store = useWizardStore();
    store.startDraft("demo");
    store.updateFields("demo", { scenarioId: "faq" });
    const draft = store.getDraft("demo");

    expect(isStepReachable(draft, "context")).toBe(true);
    expect(isStepReachable(draft, "rules")).toBe(false);

    store.updateFields("demo", {
      businessDescription: "Кофейня у моста",
      customerDescription: "Постоянные клиенты района",
      goalDescription: "Разгрузить оператора",
      agentName: "Агент поддержки",
    });

    expect(isStepReachable(draft, "rules")).toBe(true);
    // knowledge/sandbox/telegram/review не валидируются сами по себе
    // (`isStepComplete`'s default) — достижимы, раз pain/context/rules сданы.
    expect(isStepReachable(draft, "review")).toBe(false);

    store.updateFields("demo", {
      task: "Отвечать на вопросы о меню.",
      style: "friendly",
      noAnswerAction: "apologize_offer_operator",
      operatorHandoff: "on_no_answer",
    });

    expect(isStepReachable(draft, "review")).toBe(true);
  });

  it("шаг назад (уже пройденный) всегда достижим", () => {
    const store = useWizardStore();
    store.startDraft("demo");
    store.updateFields("demo", completeFields());
    store.goToStep("demo", "telegram");
    const draft = store.getDraft("demo");

    expect(isStepReachable(draft, "pain")).toBe(true);
    expect(isStepReachable(draft, "rules")).toBe(true);
  });

  it("завершённый draft достижим только на review", () => {
    const store = useWizardStore();
    store.startDraft("demo");
    store.updateFields("demo", completeFields());
    store.goToStep("demo", "review");
    store.completeDraft("demo");
    const draft = store.getDraft("demo");

    expect(isStepReachable(draft, "review")).toBe(true);
    for (const step of WIZARD_STEPS.filter((s) => s !== "review")) {
      expect(isStepReachable(draft, step)).toBe(false);
    }
  });
});

// Post-review fix: `ensureDraft` не должен подменять уже существующий draft
// (в любом статусе) — только заводить новый, если для пространства вообще
// нет записи. Единственное место, которое обязано завести новый draft
// поверх завершённого — явный `startDraft` (`ReviewStep.vue#startNextAgent`).
describe("stores/wizard — ensureDraft не подменяет завершённый draft (post-review fix)", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("ensureDraft возвращает уже завершённый draft, а не заводит новый", () => {
    const store = useWizardStore();
    store.startDraft("demo");
    store.completeDraft("demo");
    const completed = store.getDraft("demo");

    const ensured = store.ensureDraft("demo");

    expect(ensured).toBe(completed);
    expect(ensured.status).toBe("completed");
  });

  it("ensureDraft без единого draft'а для пространства заводит новый", () => {
    const store = useWizardStore();

    const ensured = store.ensureDraft("demo");

    expect(ensured.status).toBe("in_progress");
    expect(ensured.step).toBe(WIZARD_STEPS[0]);
  });

  it("явный startDraft всё ещё заменяет завершённый draft (startNextAgent)", () => {
    const store = useWizardStore();
    store.startDraft("demo");
    store.completeDraft("demo");
    const completed = store.getDraft("demo");

    store.startDraft("demo");

    expect(store.getDraft("demo")).not.toBe(completed);
    expect(store.getDraft("demo").status).toBe("in_progress");
  });
});

describe("stores/wizard — идемпотентное создание agent/collection/source", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("повторный ensureAgent в одном draft'е не создаёт второго агента", () => {
    const store = useWizardStore();
    const agentsStore = useAgentsStore();
    store.startDraft("demo");
    const before = agentsStore.listByWorkspace("demo").length;

    const first = store.ensureAgent("demo", "Мастер-агент");
    const second = store.ensureAgent("demo", "Мастер-агент");

    expect(first.created).toBe(true);
    expect(second.created).toBe(false);
    expect(second.agent.id).toBe(first.agent.id);
    expect(agentsStore.listByWorkspace("demo").length).toBe(before + 1);
  });

  it("isFirstAgent — снимок на момент createDraft, не пересчитывается после ensureAgent (post-review fix)", () => {
    const store = useWizardStore();
    const agentsStore = useAgentsStore();
    expect(agentsStore.listByWorkspace("empty").length).toBe(0);

    store.startDraft("empty");
    expect(store.getDraft("empty").isFirstAgent).toBe(true);

    // `ensureAgent` заводит реального агента до завершения мастера — снимок
    // не должен пересчитаться в "не первый" из-за собственного же черновика.
    store.ensureAgent("empty", "Мастер-агент");
    expect(agentsStore.listByWorkspace("empty").length).toBe(1);
    expect(store.getDraft("empty").isFirstAgent).toBe(true);
  });

  it("isFirstAgent — false для пространства, где уже есть агенты", () => {
    const store = useWizardStore();
    store.startDraft("demo");

    expect(store.getDraft("demo").isFirstAgent).toBe(false);
  });

  it("повторный ensureCollection в одном draft'е не создаёт вторую коллекцию", () => {
    const store = useWizardStore();
    const knowledgeStore = useKnowledgeStore();
    store.startDraft("demo");
    const before = knowledgeStore.listByWorkspace("demo").length;

    store.ensureCollection("demo", "Знания агента");
    const second = store.ensureCollection("demo", "Знания агента");

    expect(second.created).toBe(false);
    expect(knowledgeStore.listByWorkspace("demo").length).toBe(before + 1);
  });

  it("addKnowledgeSource без коллекции — явный отказ", () => {
    const store = useWizardStore();
    store.startDraft("demo");

    const result = store.addKnowledgeSource("demo", "source-1", { name: "faq.md", kind: "text" });

    expect(result).toEqual({ ok: false, reason: "no_collection" });
  });

  it("повтор addKnowledgeSource с тем же ключом (retry/duplicate submit) не дублирует источник", () => {
    const store = useWizardStore();
    store.startDraft("demo");
    const { collection } = store.ensureCollection("demo", "Знания агента");

    const first = store.addKnowledgeSource("demo", "upload-1", { name: "faq.md", kind: "text" });
    const second = store.addKnowledgeSource("demo", "upload-1", { name: "faq.md", kind: "text" });

    expect(first.created).toBe(true);
    expect(second.created).toBe(false);
    expect(second.object.id).toBe(first.object.id);
    expect(collection.objects.filter((o) => o.id === first.object.id).length).toBe(1);
  });

  it("разные ключи источника создают разные объекты в одной коллекции", () => {
    const store = useWizardStore();
    store.startDraft("demo");
    store.ensureCollection("demo", "Знания агента");

    const a = store.addKnowledgeSource("demo", "upload-a", { name: "a.md", kind: "text" });
    const b = store.addKnowledgeSource("demo", "upload-b", { name: "b.md", kind: "text" });

    expect(a.object.id).not.toBe(b.object.id);
  });

  it("removeKnowledgeSource убирает источник и освобождает его ключ для повторного использования", () => {
    const store = useWizardStore();
    const knowledgeStore = useKnowledgeStore();
    store.startDraft("demo");
    const { collection } = store.ensureCollection("demo", "Знания агента");
    const { object } = store.addKnowledgeSource("demo", "upload-1", { name: "a.md", kind: "text" });

    const removed = store.removeKnowledgeSource("demo", "upload-1");

    expect(removed).toEqual({ ok: true });
    expect(knowledgeStore.getCollection("demo", collection.id).objects).not.toContain(object);
  });

  it("removeKnowledgeSource без коллекции — явный отказ с отдельным reason (post-review fix)", () => {
    const store = useWizardStore();
    store.startDraft("demo");

    const result = store.removeKnowledgeSource("demo", "upload-1");

    expect(result).toEqual({ ok: false, reason: "no_collection" });
  });

  it("removeKnowledgeSource без draft'а — явный отказ с reason no_draft", () => {
    const store = useWizardStore();

    expect(store.removeKnowledgeSource("demo", "upload-1")).toEqual({ ok: false, reason: "no_draft" });
  });

  it("частичный сбой (агент создан, коллекция — ещё нет) сохраняет уже созданный agentId", () => {
    const store = useWizardStore();
    store.startDraft("demo");

    const { agent } = store.ensureAgent("demo", "Агент без знаний");

    expect(store.getDraft("demo").resources.agentId).toBe(agent.id);
    expect(store.getDraft("demo").resources.collectionId).toBeNull();
  });

  it("ensureCollection заводит коллекцию как autoNamed — имя синхронизируется с агентом (Task A9.4)", () => {
    const store = useWizardStore();
    store.startDraft("demo");

    const { collection } = store.ensureCollection("demo", "Агент по частым вопросам");

    expect(collection.autoNamed).toBe(true);
  });

  it("nextWizardSourceKey не повторяется даже после ремаунта UI-компонента (post-review fix)", () => {
    const store = useWizardStore();
    store.startDraft("demo");
    store.ensureCollection("demo", "Знания агента");

    const keyBeforeRemount = store.nextWizardSourceKey("demo");
    store.addKnowledgeSource("demo", keyBeforeRemount, { name: "a.md", kind: "text" });

    // KnowledgeStep.vue пересчитал бы ключ с нуля, будь счётчик локальным —
    // здесь имитируем именно это: снова запрашиваем "первый" ключ так, как
    // это делал бы свежесмонтированный компонент.
    const keyAfterRemount = store.nextWizardSourceKey("demo");

    expect(keyAfterRemount).not.toBe(keyBeforeRemount);

    const second = store.addKnowledgeSource("demo", keyAfterRemount, { name: "b.md", kind: "text" });
    expect(second.created).toBe(true);

    const collection = store.getDraft("demo").resources.collectionId;
    expect(useKnowledgeStore().getCollection("demo", collection).objects).toHaveLength(2);
  });

  it("nextWizardSourceKey без draft'а возвращает null", () => {
    const store = useWizardStore();

    expect(store.nextWizardSourceKey("demo")).toBeNull();
  });
});

describe("stores/wizard — getWizardKnowledgeCollectionName (Task A9.4)", () => {
  it("возвращает имя агента, если оно задано", () => {
    expect(getWizardKnowledgeCollectionName({ agentName: "Агент поддержки" }))
      .toBe("Агент поддержки");
  });

  it("падает на дефолтную подпись, если имя агента пустое", () => {
    expect(getWizardKnowledgeCollectionName({})).toBe("Личная база знаний агента");
    expect(getWizardKnowledgeCollectionName({ agentName: "   " })).toBe("Личная база знаний агента");
  });
});

describe("stores/wizard — locale экспертной зоны (Task A9.5)", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("новый draft начинается с DEFAULT_WIZARD_LOCALE", () => {
    const store = useWizardStore();
    store.startDraft("demo");

    expect(store.getDraft("demo").locale).toBe(DEFAULT_WIZARD_LOCALE);
  });

  it("normalizeWizardLocale принимает только WIZARD_LOCALES, иначе падает на дефолт", () => {
    for (const locale of WIZARD_LOCALES) {
      expect(normalizeWizardLocale(locale)).toBe(locale);
    }
    expect(normalizeWizardLocale("fr")).toBe(DEFAULT_WIZARD_LOCALE);
    expect(normalizeWizardLocale(undefined)).toBe(DEFAULT_WIZARD_LOCALE);
  });

  it("setLocale не трогает fields/resources", () => {
    const store = useWizardStore();
    store.startDraft("demo");
    store.updateFields("demo", { task: "Помогать с настройкой." });

    const result = store.setLocale("demo", "en");

    expect(result.ok).toBe(true);
    expect(store.getDraft("demo").locale).toBe("en");
    expect(store.getDraft("demo").fields.task).toBe("Помогать с настройкой.");
  });

  it("setLocale без draft'а возвращает явный отказ", () => {
    const store = useWizardStore();
    expect(store.setLocale("demo", "en")).toEqual({ ok: false, reason: "no_draft" });
  });

  it("setLocale с невалидным значением нормализует, а не отклоняет", () => {
    const store = useWizardStore();
    store.startDraft("demo");
    store.setLocale("demo", "fr");

    expect(store.getDraft("demo").locale).toBe(DEFAULT_WIZARD_LOCALE);
  });
});

describe("stores/wizard — класс модели по умолчанию (Task A9.5)", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("getRecommendedModelClassId возвращает класс для каждого известного сценария и дефолт для незнакомого", () => {
    expect(getRecommendedModelClassId("faq")).toBe("basic");
    expect(getRecommendedModelClassId("product-pick")).toBe("advanced");
    expect(getRecommendedModelClassId("unknown-scenario")).toBe("basic");
  });

  it("ensureDefaultModelClass проставляет рекомендованный класс один раз и не перезаписывает выбор", () => {
    const store = useWizardStore();
    store.startDraft("demo");
    store.updateFields("demo", { scenarioId: "product-pick" });

    store.ensureDefaultModelClass("demo");
    expect(store.getDraft("demo").fields.modelClassId).toBe("advanced");

    store.updateFields("demo", { modelClassId: "power" });
    store.ensureDefaultModelClass("demo");
    expect(store.getDraft("demo").fields.modelClassId).toBe("power");
  });

  it("на тарифе с единственным доступным классом рекомендует именно его, а не сценарный", () => {
    const store = useWizardStore();
    store.startDraft("empty");
    store.updateFields("empty", { scenarioId: "product-pick" });

    store.ensureDefaultModelClass("empty");

    expect(store.getDraft("empty").fields.modelClassId).toBe("basic");
  });

  it("ensureDefaultModelClass без draft'а возвращает явный отказ", () => {
    const store = useWizardStore();
    expect(store.ensureDefaultModelClass("demo")).toEqual({ ok: false, reason: "no_draft" });
  });
});

describe("stores/wizard — generateInstructionTemplate (Task A9.5)", () => {
  it("собирает шаблон только из заполненных полей, в фиксированном порядке", () => {
    const template = generateInstructionTemplate({
      task: "Отвечать на вопросы о меню.",
      style: "friendly",
      restrictions: "Не обсуждать цены конкурентов.",
      noAnswerAction: "apologize_offer_operator",
      operatorHandoff: "on_no_answer",
    });

    expect(template).toBe(
      "Отвечать на вопросы о меню.\n"
      + "Стиль общения: дружелюбный.\n"
      + "Ограничения: Не обсуждать цены конкурентов.\n"
      + "Если ответа нет в знаниях: извиниться и предложить связаться с оператором.\n"
      + "Предлагать связаться с оператором: когда агент не находит ответ в знаниях.",
    );
  });

  it("не падает и не вставляет пустые строки для незаполненных полей", () => {
    expect(generateInstructionTemplate({})).toBe("");
    expect(generateInstructionTemplate({ task: "Только задача." })).toBe("Только задача.");
  });
});

describe("stores/wizard — проверка в песочнице (Task A9.6)", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("никогда не проверенный draft не считается устаревшим", () => {
    const store = useWizardStore();
    store.startDraft("demo");
    store.updateFields("demo", { task: "Отвечать на вопросы." });

    expect(isSandboxVerificationStale(store.getDraft("demo"))).toBe(false);
  });

  it("markSandboxVerified фиксирует текущую подпись и снимает признак устаревания", () => {
    const store = useWizardStore();
    store.startDraft("demo");
    store.updateFields("demo", { task: "Отвечать на вопросы.", style: "friendly" });

    const result = store.markSandboxVerified("demo");

    expect(result.ok).toBe(true);
    expect(result.draft.fields.sandboxVerifiedSignature).toBeTruthy();
    expect(isSandboxVerificationStale(store.getDraft("demo"))).toBe(false);
  });

  it("правка правил после проверки помечает её устаревшей", () => {
    const store = useWizardStore();
    store.startDraft("demo");
    store.updateFields("demo", { task: "Отвечать на вопросы." });
    store.markSandboxVerified("demo");

    store.updateFields("demo", { task: "Отвечать на вопросы и оформлять заявки." });

    expect(isSandboxVerificationStale(store.getDraft("demo"))).toBe(true);
  });

  it("изменение класса модели после проверки тоже требует повторной проверки", () => {
    const store = useWizardStore();
    store.startDraft("demo");
    store.updateFields("demo", { task: "Отвечать на вопросы.", modelClassId: "basic" });
    store.markSandboxVerified("demo");

    store.updateFields("demo", { modelClassId: "advanced" });

    expect(isSandboxVerificationStale(store.getDraft("demo"))).toBe(true);
  });

  it("добавление источника знаний после проверки тоже требует повторной проверки", () => {
    const store = useWizardStore();
    store.startDraft("demo");
    store.updateFields("demo", { task: "Отвечать на вопросы.", agentName: "Агент" });
    store.markSandboxVerified("demo");

    store.ensureCollection("demo", "Агент");
    store.addKnowledgeSource("demo", "source-1", { name: "Файл", kind: "file" });

    expect(isSandboxVerificationStale(store.getDraft("demo"))).toBe(true);
  });

  it("markSandboxVerified без активного draft'а возвращает явный отказ", () => {
    const store = useWizardStore();

    expect(store.markSandboxVerified("demo")).toEqual({ ok: false, reason: "no_draft" });
  });

  it("getSandboxNoAnswerReply отдаёт реплику под выбранный вариант и fallback на неизвестный", () => {
    expect(getSandboxNoAnswerReply("ask_clarify")).toContain("Уточните");
    expect(getSandboxNoAnswerReply(undefined)).toBe(getSandboxNoAnswerReply("apologize_offer_operator"));
  });
});

// Task A9.7: Telegram step fixture helpers/store wiring.
describe("stores/wizard — Telegram шаг (Task A9.7)", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("classifyTelegramToken различает пустой/неверный/конфликтный/валидный токен", () => {
    expect(classifyTelegramToken("")).toBe("empty");
    expect(classifyTelegramToken("   ")).toBe("empty");
    expect(classifyTelegramToken("this-is-invalid-token")).toBe("invalid");
    expect(classifyTelegramToken("already-taken-token")).toBe("conflict");
    expect(classifyTelegramToken("123456:AAExampleTelegramBotToken")).toBe("ok");
  });

  it("getWizardAgentName берёт fields.agentName и откатывается на дефолт при прямом переходе на поздний шаг", () => {
    expect(getWizardAgentName({ agentName: "Мой агент" })).toBe("Мой агент");
    expect(getWizardAgentName({})).toBe("Новый агент");
    expect(getWizardAgentName({ agentName: "   " })).toBe("Новый агент");
  });

  it("ensureTelegramChannel создаёт агента (если его ещё нет) и канал, не дублируя их при повторе", () => {
    const store = useWizardStore();
    const channelsStore = useChannelsStore();
    store.startDraft("demo");
    store.updateFields("demo", { agentName: "Агент поддержки" });

    const first = store.ensureTelegramChannel("demo");
    expect(first.ok).toBe(true);
    expect(first.agent.name).toBe("Агент поддержки");
    expect(channelsStore.listByAgent("demo", first.agent.id)).toHaveLength(1);

    const second = store.ensureTelegramChannel("demo");
    expect(second.channel.id).toBe(first.channel.id);
    expect(channelsStore.listByAgent("demo", first.agent.id)).toHaveLength(1);
  });

  it("ensureTelegramChannel без активного draft'а — явный отказ", () => {
    const store = useWizardStore();

    expect(store.ensureTelegramChannel("demo")).toEqual({ ok: false, reason: "no_draft" });
  });
});

describe("stores/wizard — Проверка и запуск (Task A9.8)", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  function draftWithConfirmedChannel(fields = {}) {
    const store = useWizardStore();
    store.startDraft("demo");
    store.updateFields("demo", {
      agentName: "Агент поддержки",
      task: "Отвечать на вопросы о меню.",
      style: "friendly",
      noAnswerAction: "apologize_offer_operator",
      operatorHandoff: "on_no_answer",
      modelClassId: "basic",
      ...fields,
    });

    const { channel, agent } = store.ensureTelegramChannel("demo");
    const channelsStore = useChannelsStore();
    channelsStore.confirmChannelIdentity("demo", agent.id, channel.id, {
      username: "@support_bot",
      url: "https://t.me/support_bot",
    });

    return { store, agent, channel };
  }

  it("finalizeAgentFields без draft'а — явный отказ", () => {
    const store = useWizardStore();

    expect(store.finalizeAgentFields("demo")).toEqual({ ok: false, reason: "no_draft" });
  });

  it("finalizeAgentFields записывает инструкцию/модель/температуру, но не активирует канал", () => {
    const store = useWizardStore();
    store.startDraft("demo");
    store.updateFields("demo", {
      agentName: "Агент поддержки",
      task: "Отвечать на вопросы о меню.",
      style: "friendly",
      noAnswerAction: "apologize_offer_operator",
      operatorHandoff: "on_no_answer",
      modelClassId: "advanced",
    });

    const result = store.finalizeAgentFields("demo");

    expect(result.ok).toBe(true);
    expect(result.agent.instructions).toContain("Отвечать на вопросы о меню.");
    expect(result.agent.model).toBe("gpt-4.1");
    expect(result.agent.status).toBe("Черновик");
  });

  it("saveDraftWithoutLaunch завершает draft, не активируя ответы", () => {
    const { store, agent, channel } = draftWithConfirmedChannel();
    const channelsStore = useChannelsStore();

    const result = store.saveDraftWithoutLaunch("demo");

    expect(result.ok).toBe(true);
    expect(result.agent.status).toBe("Черновик");
    expect(store.getDraft("demo").status).toBe("completed");
    expect(channelsStore.listByAgent("demo", agent.id).find((c) => c.id === channel.id).status)
      .not.toBe("active");
  });

  it("launchAgent без подтверждённого канала — явный отказ, ничего не меняет", () => {
    const store = useWizardStore();
    store.startDraft("demo");
    store.updateFields("demo", { agentName: "Агент без канала" });

    expect(store.launchAgent("demo")).toEqual({ ok: false, reason: "no_channel" });
    expect(store.getDraft("demo").status).toBe("in_progress");
  });

  it("launchAgent активирует агента и канал только после явного вызова", () => {
    const { store, agent, channel } = draftWithConfirmedChannel();
    const channelsStore = useChannelsStore();

    const result = store.launchAgent("demo");

    expect(result.ok).toBe(true);
    expect(result.agent.status).toBe("Активен");
    const activeChannel = channelsStore.listByAgent("demo", agent.id).find((c) => c.id === channel.id);
    expect(activeChannel.status).toBe("active");
    expect(activeChannel.isEnabled).toBe(true);
    expect(store.getDraft("demo").status).toBe("completed");
  });

  it("launchAgent с конфликтующим (displaced) каналом — явный отказ, не активирует агента (post-review fix)", () => {
    const { store, agent, channel } = draftWithConfirmedChannel();
    const channelsStore = useChannelsStore();
    const liveChannel = channelsStore.listByAgent("demo", agent.id).find((c) => c.id === channel.id);
    liveChannel.status = "displaced";
    liveChannel.runtimeReason = "Бот уже активирован в другом рабочем пространстве.";

    const result = store.launchAgent("demo");

    expect(result.ok).toBe(false);
    expect(result.reason).toBe("channel_conflict");
    expect(result.conflict).toBeTruthy();
    expect(store.getDraft("demo").status).toBe("in_progress");
    expect(channelsStore.listByAgent("demo", agent.id).find((c) => c.id === channel.id).status)
      .toBe("displaced");
    expect(agent.status).not.toBe("Активен");
  });

  it("повторный launchAgent (retry) не создаёт второй канал", () => {
    const { store, agent } = draftWithConfirmedChannel();
    const channelsStore = useChannelsStore();

    store.launchAgent("demo");
    // Повтор после успеха всё ещё безопасен (та же fixture-ссылка,
    // completeDraft уже отработал) — retry-safe контракт acceptance A9.8.
    const secondAttempt = store.launchAgent("demo");

    expect(channelsStore.listByAgent("demo", agent.id)).toHaveLength(1);
    expect(secondAttempt.ok).toBe(true);
  });
});
