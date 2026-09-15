import { beforeEach, describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import {
  getAgentLifecycle,
  getAgentModelId,
  getAgentStatusProjection,
  isAgentReadyToLaunch,
  useAgentsStore,
} from "../../../src/stores/agents.js";
import { useApiKeysStore } from "../../../src/stores/apiKeys.js";

describe("stores/agents — BYOK save flow", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("фикстуры хранят каталожный UID модели, а не отображаемое имя", () => {
    const store = useAgentsStore();
    const agent = store.getAgent("demo", 1);

    expect(agent.model).toBe("gpt-4.1-mini");
  });

  it("BYOK-фикстура несёт раздельные обычную и BYOK-модель и ссылку на сохранённый ключ", () => {
    const store = useAgentsStore();
    const agent = store.getAgent("trickster", 1);

    expect(agent.use_own_api_key).toBe(true);
    expect(agent.has_api_key).toBe(true);
    expect(agent.api_key_provider_id).toBe("openrouter");
    // Stage A6 fix (post-review): сам ключ больше не хранится на агенте —
    // только ссылка на запись в `src/stores/apiKeys.js`.
    expect(agent.api_key_id).toBe("key-1");
    // Обычная модель — отдельное поле, не тронутое BYOK.
    expect(agent.model).toBe("gpt-4.1-mini");
    expect(agent.byok_model).toBe("or-gpt-oss-120b");
    // Свободный идентификатор не подменяет ни то, ни другое поле.
    expect(agent.provider_model_id).toBe("meta-llama/llama-3.1-405b-instruct");
  });

  it("сохранение с api_key_id привязывает ключ к провайдеру сохранённого ключа", () => {
    const agentsStore = useAgentsStore();
    const apiKeysStore = useApiKeysStore();
    const key = apiKeysStore.createKey("demo", { label: "Ключ", secret: "sk-or-v1-test-key" });

    const result = agentsStore.updateAgentSettings("demo", 1, {
      use_own_api_key: true,
      byok_model: "or-gpt-oss-120b",
      api_key_id: key.id,
    });

    expect(result.has_api_key).toBe(true);
    expect(result.api_key_provider_id).toBe("openrouter");
    expect(result.api_key_id).toBe(key.id);
    expect(result.api_key_cleared).toBe(false);
  });

  it("включение BYOK не трогает и не теряет обычную (не-BYOK) модель", () => {
    const agentsStore = useAgentsStore();
    const apiKeysStore = useApiKeysStore();
    const key = apiKeysStore.createKey("demo", { label: "Ключ", secret: "sk-or-v1-test-key" });

    const result = agentsStore.updateAgentSettings("demo", 1, {
      use_own_api_key: true,
      byok_model: "or-gpt-oss-120b",
      api_key_id: key.id,
    });

    // Регрессия из ревью Stage A6: включение BYOK раньше могло сохранить
    // агента с моделью не из OpenRouter без предупреждения — теперь `model`
    // просто не входит в BYOK-ветку патча и остаётся как был.
    expect(result.model).toBe("gpt-4.1-mini");
    expect(result.byok_model).toBe("or-gpt-oss-120b");
  });

  it("смена обычной модели во время включённого BYOK не трогает сохранённый ключ", () => {
    const store = useAgentsStore();

    // Trickster Concierge уже сохранён с ключом OpenRouter и BYOK-моделью.
    const result = store.updateAgentSettings("trickster", 1, {
      model: "claude-sonnet-4.5", // обычная модель — не участвует в BYOK-правилах
      use_own_api_key: true,
    });

    expect(result.model).toBe("claude-sonnet-4.5");
    expect(result.byok_model).toBe("or-gpt-oss-120b");
    expect(result.has_api_key).toBe(true);
    expect(result.api_key_id).toBe("key-1");
    expect(result.api_key_cleared).toBe(false);
  });

  it("смена BYOK-модели на другую модель OpenRouter не трогает сохранённый ключ", () => {
    const store = useAgentsStore();

    const result = store.updateAgentSettings("trickster", 1, {
      byok_model: "or-llama-3.3-70b", // тоже openrouter
      use_own_api_key: true,
    });

    expect(result.byok_model).toBe("or-llama-3.3-70b");
    expect(result.has_api_key).toBe(true);
    expect(result.api_key_id).toBe("key-1");
    expect(result.api_key_cleared).toBe(false);
  });

  it("выбор другого сохранённого ключа перепривязывает has_api_key без очистки", () => {
    const agentsStore = useAgentsStore();
    const apiKeysStore = useApiKeysStore();
    const otherKey = apiKeysStore.createKey("trickster", {
      label: "Второй ключ",
      secret: "sk-or-v1-second-key",
    });

    const result = agentsStore.updateAgentSettings("trickster", 1, {
      use_own_api_key: true,
      api_key_id: otherKey.id,
    });

    expect(result.api_key_id).toBe(otherKey.id);
    expect(result.has_api_key).toBe(true);
    expect(result.api_key_provider_id).toBe("openrouter");
    expect(result.api_key_cleared).toBe(false);
  });

  it("выключение BYOK сбрасывает ключ, byok_model и provider_model_id, но сохраняет обычную модель", () => {
    const store = useAgentsStore();

    const result = store.updateAgentSettings("trickster", 1, {
      use_own_api_key: false,
    });

    expect(result.use_own_api_key).toBe(false);
    expect(result.has_api_key).toBe(false);
    expect(result.api_key_provider_id).toBeNull();
    expect(result.api_key_id).toBeNull();
    expect(result.byok_model).toBeNull();
    expect(result.provider_model_id).toBeNull();
    expect(result.api_key_cleared).toBe(true);
    // Регрессия из ревью Stage A6: обычная модель не была связана с BYOK,
    // поэтому выключение ничего в ней не портит.
    expect(result.model).toBe("gpt-4.1-mini");
  });

  it("полный цикл включения и выключения BYOK возвращает исходную обычную модель без потерь", () => {
    const agentsStore = useAgentsStore();
    const apiKeysStore = useApiKeysStore();
    const key = apiKeysStore.createKey("demo", { label: "Ключ", secret: "sk-or-v1-test-key" });

    agentsStore.updateAgentSettings("demo", 1, {
      use_own_api_key: true,
      byok_model: "or-gpt-oss-120b",
      api_key_id: key.id,
    });

    const result = agentsStore.updateAgentSettings("demo", 1, {
      use_own_api_key: false,
    });

    expect(result.model).toBe("gpt-4.1-mini");
    expect(result.byok_model).toBeNull();
    expect(result.api_key_id).toBeNull();
    expect(result.has_api_key).toBe(false);
  });

  it("выключение BYOK без ранее сохранённого ключа не сообщает api_key_cleared", () => {
    const store = useAgentsStore();

    const result = store.updateAgentSettings("demo", 1, {
      use_own_api_key: false,
    });

    expect(result.has_api_key).toBe(false);
    expect(result.api_key_cleared).toBe(false);
  });

  it("updateAgentSettings возвращает undefined для несуществующего агента", () => {
    const store = useAgentsStore();

    expect(store.updateAgentSettings("demo", 9999, { use_own_api_key: false })).toBeUndefined();
  });

  it("createAgent заводит новый BYOK-контракт с выключенным ключом и каталожной моделью", () => {
    const store = useAgentsStore();
    const agent = store.createAgent("demo", "Новый агент");

    expect(agent.model).toBe("gpt-4.1-mini");
    expect(agent.byok_model).toBeNull();
    expect(agent.use_own_api_key).toBe(false);
    expect(agent.has_api_key).toBe(false);
    expect(agent.api_key_provider_id).toBeNull();
    expect(agent.api_key_id).toBeNull();
    expect(agent.provider_model_id).toBeNull();
  });
});

describe("stores/agents — isByokSaveValid / нельзя сохранить BYOK без ключа и модели", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("BYOK выключен — валиден при любых полях", () => {
    const store = useAgentsStore();

    expect(store.isByokSaveValid({
      useOwnApiKey: false, apiKeyId: null, byokModel: null, providerModelId: null,
    })).toBe(true);
  });

  it("BYOK включён без ключа и без модели — невалиден", () => {
    const store = useAgentsStore();

    expect(store.isByokSaveValid({
      useOwnApiKey: true, apiKeyId: null, byokModel: null, providerModelId: null,
    })).toBe(false);
  });

  it("BYOK включён с ключом, но без модели — невалиден", () => {
    const store = useAgentsStore();

    expect(store.isByokSaveValid({
      useOwnApiKey: true, apiKeyId: "key-1", byokModel: null, providerModelId: null,
    })).toBe(false);
  });

  it("BYOK включён с моделью, но без ключа — невалиден", () => {
    const store = useAgentsStore();

    expect(store.isByokSaveValid({
      useOwnApiKey: true, apiKeyId: null, byokModel: "or-gpt-oss-120b", providerModelId: null,
    })).toBe(false);
  });

  it("BYOK включён с ключом и каталожной моделью — валиден", () => {
    const store = useAgentsStore();

    expect(store.isByokSaveValid({
      useOwnApiKey: true, apiKeyId: "key-1", byokModel: "or-gpt-oss-120b", providerModelId: null,
    })).toBe(true);
  });

  it("BYOK включён с ключом и свободным идентификатором (без каталожной модели) — валиден", () => {
    const store = useAgentsStore();

    expect(store.isByokSaveValid({
      useOwnApiKey: true, apiKeyId: "key-1", byokModel: null, providerModelId: "vendor/model",
    })).toBe(true);
  });

  it("updateAgentSettings отклоняет патч, оставляющий BYOK включённым без ключа и модели", () => {
    const store = useAgentsStore();
    const before = { ...store.getAgent("demo", 1) };

    const result = store.updateAgentSettings("demo", 1, { use_own_api_key: true });

    // Агент возвращается БЕЗ мутации — защитный, а не основной рубеж
    // (основной — `AgentSettings.vue` блокирует кнопку «Сохранить» раньше).
    expect(result).toMatchObject({ use_own_api_key: before.use_own_api_key, model: before.model });
    expect(store.getAgent("demo", 1).use_own_api_key).toBe(false);
    expect(store.getAgent("demo", 1).has_api_key).toBe(false);
  });

  it("updateAgentSettings отклоняет патч с ключом, но без модели", () => {
    const agentsStore = useAgentsStore();
    const apiKeysStore = useApiKeysStore();
    const key = apiKeysStore.createKey("demo", { label: "Ключ", secret: "sk-or-v1-test-key" });

    const result = agentsStore.updateAgentSettings("demo", 1, {
      use_own_api_key: true,
      api_key_id: key.id,
    });

    expect(result.use_own_api_key).toBe(false);
    expect(result.has_api_key).toBe(false);
  });
});

describe("stores/agents — getAgentModelId (эффективная модель агента)", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("для обычного (не-BYOK) агента возвращает model", () => {
    const store = useAgentsStore();
    const agent = store.getAgent("demo", 1);

    expect(getAgentModelId(agent)).toBe("gpt-4.1-mini");
  });

  it("для BYOK-агента со свободным идентификатором отдаёт приоритет provider_model_id", () => {
    const store = useAgentsStore();
    const agent = store.getAgent("trickster", 1);

    expect(getAgentModelId(agent)).toBe("meta-llama/llama-3.1-405b-instruct");
  });

  it("для BYOK-агента без свободного идентификатора отдаёт byok_model", () => {
    const store = useAgentsStore();
    const agent = store.getAgent("trickster", 1);
    agent.provider_model_id = null;

    expect(getAgentModelId(agent)).toBe("or-gpt-oss-120b");
  });

  it("для BYOK-агента без обеих BYOK-моделей возвращает null", () => {
    const store = useAgentsStore();
    const agent = store.getAgent("trickster", 1);
    agent.provider_model_id = null;
    agent.byok_model = null;

    expect(getAgentModelId(agent)).toBeNull();
  });

  it("возвращает null для отсутствующего агента", () => {
    expect(getAgentModelId(undefined)).toBeNull();
    expect(getAgentModelId(null)).toBeNull();
  });
});

// Task A9.6: S2 presentation-lifecycle и карточная проекция. `AGENT_STATUSES`
// (Активен/Черновик/Приостановлен) остаётся серверным enum — эти тесты
// проверяют только derived-слой поверх него.
describe("stores/agents — S2 presentation-статус (Task A9.6)", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("isAgentReadyToLaunch: пусто/пробелы — не готов, заполненная инструкция — готов", () => {
    expect(isAgentReadyToLaunch({ instructions: "" })).toBe(false);
    expect(isAgentReadyToLaunch({ instructions: "   " })).toBe(false);
    expect(isAgentReadyToLaunch({ instructions: "Отвечай кратко." })).toBe(true);
    expect(isAgentReadyToLaunch(undefined)).toBe(false);
  });

  it("getAgentLifecycle: черновик без инструкции — draft, с инструкцией — ready", () => {
    expect(getAgentLifecycle({ status: "Черновик", instructions: "" })).toBe("draft");
    expect(getAgentLifecycle({ status: "Черновик", instructions: "Задача агента." })).toBe("ready");
  });

  it("getAgentLifecycle: активен/приостановлен всегда возвращают свой lifecycle независимо от инструкции", () => {
    expect(getAgentLifecycle({ status: "Активен", instructions: "" })).toBe("active");
    expect(getAgentLifecycle({ status: "Приостановлен", instructions: "Есть инструкция." })).toBe("paused");
  });

  it("getAgentStatusProjection: draft/ready/paused не проверяют каналы", () => {
    const draft = getAgentStatusProjection({ status: "Черновик", instructions: "" }, []);
    expect(draft).toEqual({
      lifecycle: "draft",
      badgeLabel: "Черновик",
      badgeType: undefined,
      needsAttention: false,
      attentionMessage: null,
    });

    const ready = getAgentStatusProjection({ status: "Черновик", instructions: "Задача." }, []);
    expect(ready.lifecycle).toBe("ready");
    expect(ready.badgeLabel).toBe("Готов к запуску");
    expect(ready.needsAttention).toBe(false);
  });

  it("активен без каналов — обычный статус без предупреждения (нет канала ещё не значит сбой)", () => {
    const projection = getAgentStatusProjection({ status: "Активен", instructions: "x" }, []);

    expect(projection.badgeLabel).toBe("Активен");
    expect(projection.needsAttention).toBe(false);
  });

  it("активен, все каналы нерабочие — «Не отвечает: ошибка подключения», lifecycle остаётся active", () => {
    const channels = [
      { name: "Бот", status: "error", runtimeReason: "Токен отозван." },
    ];
    const projection = getAgentStatusProjection({ status: "Активен", instructions: "x" }, channels);

    expect(projection.lifecycle).toBe("active");
    expect(projection.badgeLabel).toBe("Не отвечает: ошибка подключения");
    expect(projection.badgeType).toBe("is-danger");
    expect(projection.needsAttention).toBe(true);
    expect(projection.attentionMessage).toBe("Токен отозван.");
  });

  it("активен, один канал в ошибке из нескольких — статус остаётся «Активен» с отдельным предупреждением", () => {
    const channels = [
      { name: "Основной", status: "active", runtimeReason: null },
      { name: "Резервный", status: "error", runtimeReason: "Токен отозван провайдером." },
    ];
    const projection = getAgentStatusProjection({ status: "Активен", instructions: "x" }, channels);

    expect(projection.badgeLabel).toBe("Активен");
    expect(projection.badgeType).toBe("is-primary");
    expect(projection.needsAttention).toBe(true);
    expect(projection.attentionMessage).toContain("Резервный");
    expect(projection.attentionMessage).toContain("Токен отозван провайдером.");
  });

  it("активен, единственный канал приостановлен пользователем — тоже «не отвечает», а не тихий «Активен»", () => {
    const channels = [{ name: "Бот", status: "paused", runtimeReason: null }];
    const projection = getAgentStatusProjection({ status: "Активен", instructions: "x" }, channels);

    expect(projection.badgeLabel).toBe("Не отвечает: ошибка подключения");
    expect(projection.needsAttention).toBe(true);
  });
});

// Task A10.2: мгновенная отвязка агента от собственного ключа — отдельная
// команда от `updateAgentSettings` (форма модели/ключа) и от удаления самого
// ключа (`stores/apiKeys.js#deleteKey`).
describe("stores/agents — detachApiKey / listAgentsUsingApiKey (Task A10.2)", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("detachApiKey стирает BYOK-only поля у BYOK-агента и не трогает обычную модель", () => {
    const store = useAgentsStore();

    const agent = store.detachApiKey("trickster", 1);

    expect(agent.use_own_api_key).toBe(false);
    expect(agent.has_api_key).toBe(false);
    expect(agent.api_key_provider_id).toBe(null);
    expect(agent.api_key_id).toBe(null);
    expect(agent.byok_model).toBe(null);
    expect(agent.provider_model_id).toBe(null);
    expect(agent.api_key_cleared).toBe(true);
    // Обычная модель — отдельное поле, отвязка её не трогает.
    expect(agent.model).toBe("gpt-4.1-mini");
  });

  it("detachApiKey на агенте без собственного ключа не меняет запись", () => {
    const store = useAgentsStore();
    const before = { ...store.getAgent("demo", 1) };

    const agent = store.detachApiKey("demo", 1);

    expect(agent).toMatchObject(before);
  });

  it("detachApiKey для несуществующего агента возвращает undefined", () => {
    const store = useAgentsStore();

    expect(store.detachApiKey("demo", 9999)).toBeUndefined();
  });

  it("listAgentsUsingApiKey находит только агентов, реально ссылающихся на ключ", () => {
    const store = useAgentsStore();

    expect(store.listAgentsUsingApiKey("trickster", "key-1")).toHaveLength(1);
    expect(store.listAgentsUsingApiKey("trickster", "key-1")[0].id).toBe(1);
    expect(store.listAgentsUsingApiKey("trickster", "unknown-key")).toEqual([]);
    // Ключ существует в trickster, но не виден из другого воркспейса.
    expect(store.listAgentsUsingApiKey("demo", "key-1")).toEqual([]);
  });

  it("listAgentsUsingApiKey перестаёт находить агента после detachApiKey", () => {
    const store = useAgentsStore();

    store.detachApiKey("trickster", 1);

    expect(store.listAgentsUsingApiKey("trickster", "key-1")).toEqual([]);
  });
});

// Stage A10 review fix: name/status больше не мутируются напрямую из
// AgentSettings.vue — renameAgent — точка приложения независимого
// name-draft Save, setAgentStatus — мгновенная lifecycle-команда.
describe("stores/agents — renameAgent / setAgentStatus (Stage A10 review fix)", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("renameAgent меняет имя и не трогает другие поля", () => {
    const store = useAgentsStore();
    const before = { ...store.getAgent("demo", 1) };

    const agent = store.renameAgent("demo", 1, "Новое имя");

    expect(agent.name).toBe("Новое имя");
    expect(agent.model).toBe(before.model);
    expect(agent.status).toBe(before.status);
  });

  it("renameAgent для несуществующего агента возвращает undefined", () => {
    const store = useAgentsStore();

    expect(store.renameAgent("demo", 9999, "Имя")).toBeUndefined();
  });

  it("setAgentStatus меняет статус на один из AGENT_STATUSES", () => {
    const store = useAgentsStore();

    const agent = store.setAgentStatus("demo", 1, "Приостановлен");

    expect(agent.status).toBe("Приостановлен");
  });

  it("setAgentStatus — неизвестный статус не меняет запись", () => {
    const store = useAgentsStore();
    const before = { ...store.getAgent("demo", 1) };

    const agent = store.setAgentStatus("demo", 1, "Не статус");

    expect(agent.status).toBe(before.status);
  });

  it("setAgentStatus для несуществующего агента возвращает undefined", () => {
    const store = useAgentsStore();

    expect(store.setAgentStatus("demo", 9999, "Активен")).toBeUndefined();
  });
});

// Task A10.3: durable-ссылка агента на личную коллекцию знаний, переживающая
// смену draft'а мастера (`stores/wizard.js` держит не более одного draft'а
// на пространство).
describe("stores/agents — linkKnowledgeCollection / unlinkKnowledgeCollection / listAgentsUsingCollection (Task A10.3)", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("новый агент не связан ни с одной коллекцией", () => {
    const store = useAgentsStore();
    const agent = store.createAgent("demo", "Новый агент");

    expect(agent.knowledgeCollectionId).toBeNull();
  });

  it("фикстура trickster уже связана с существующей коллекцией (повторный визит)", () => {
    const store = useAgentsStore();

    expect(store.getAgent("trickster", 1).knowledgeCollectionId).toBe(1);
  });

  it("linkKnowledgeCollection связывает агента и идемпотентна — повтор с другим id ничего не меняет", () => {
    const store = useAgentsStore();

    const first = store.linkKnowledgeCollection("demo", 1, 42);
    expect(first.knowledgeCollectionId).toBe(42);

    const second = store.linkKnowledgeCollection("demo", 1, 999);
    expect(second.knowledgeCollectionId).toBe(42);
  });

  it("linkKnowledgeCollection для несуществующего агента возвращает undefined", () => {
    const store = useAgentsStore();

    expect(store.linkKnowledgeCollection("demo", 9999, 1)).toBeUndefined();
  });

  it("unlinkKnowledgeCollection стирает ссылку без ошибки на агенте без коллекции", () => {
    const store = useAgentsStore();

    store.linkKnowledgeCollection("demo", 1, 42);
    const agent = store.unlinkKnowledgeCollection("demo", 1);

    expect(agent.knowledgeCollectionId).toBeNull();
    expect(store.unlinkKnowledgeCollection("demo", 2)).toBeDefined();
    expect(store.getAgent("demo", 2).knowledgeCollectionId).toBeNull();
  });

  it("listAgentsUsingCollection находит только агентов, реально ссылающихся на коллекцию", () => {
    const store = useAgentsStore();

    expect(store.listAgentsUsingCollection("trickster", 1)).toHaveLength(1);
    expect(store.listAgentsUsingCollection("trickster", 1)[0].id).toBe(1);
    expect(store.listAgentsUsingCollection("trickster", 999)).toEqual([]);
    // Коллекция id=1 у demo — другая запись в другом workspace, не должна найтись здесь.
    expect(store.listAgentsUsingCollection("demo", 1)).toEqual([]);
  });

  it("listAgentsUsingCollection перестаёт находить агента после unlinkKnowledgeCollection", () => {
    const store = useAgentsStore();

    store.unlinkKnowledgeCollection("trickster", 1);

    expect(store.listAgentsUsingCollection("trickster", 1)).toEqual([]);
  });
});
