import { defineStore } from "pinia";
import { ref } from "vue";
import { useApiKeysStore } from "./apiKeys.js";
import { getChannelsNeedingAttention, hasWorkingChannel } from "./channels.js";

/**
 * @typedef {Object} SandboxMessage
 * @property {number} id
 * @property {string} text
 * @property {string} time
 * @property {boolean} outgoing
 */

/**
 * @typedef {Object} Agent
 * @property {number} id
 * @property {string} name
 * @property {string} description
 * @property {string} model UID каталожной модели (`src/stores/models.js`) для
 *   обычного (не-BYOK) режима, зеркалит `CreateAgentRequest.Model`
 *   (`api.3xtr.im`). Не трогается переключением BYOK — при выключении BYOK
 *   экран возвращается именно к этому значению без отдельной логики отката.
 * @property {string} status
 * @property {string} updated
 * @property {number} temperature
 * @property {string} instructions
 * @property {SandboxMessage[]} messages
 * @property {boolean} use_own_api_key Локальный BYOK-переключатель кита; на
 *   проводе такого поля нет, это состояние формы.
 * @property {boolean} has_api_key Зеркалит `AgentResponse.has_api_key`.
 * @property {string | null} api_key_provider_id Зеркалит
 *   `AgentResponse.api_key_provider_id` — вендор, под который привязан
 *   сохранённый ключ. Пока BYOK ограничен OpenRouter, при `has_api_key`
 *   всегда `"openrouter"`.
 * @property {boolean} api_key_cleared Транзитный флаг последнего
 *   `updateSettings`: true, только когда сохранение только что стёрло ключ
 *   из-за выключения BYOK (зеркалит `AgentResponse.api_key_cleared`).
 * @property {string | null} api_key_id Ссылка на сохранённый ключ из
 *   `src/stores/apiKeys.js` (workspace-level хранилище, Stage A6 fix
 *   post-review) — агент больше не хранит и не принимает сырой текст ключа,
 *   только идентификатор. На проводе такого поля ещё нет — см. комментарий
 *   на [api.3xtr.im#112](https://github.com/iam3xtr/api.3xtr.im/issues/112)
 *   и `docs/design-system.md`.
 * @property {string | null} byok_model UID каталожной модели OpenRouter,
 *   выбранной специально для BYOK-режима — отдельное поле от `model`
 *   (Stage A6 fix: раздельные контролы для обычной и BYOK-модели, см.
 *   `docs/design-system.md`). На проводе такого поля ещё нет — предложение
 *   расширить контракт Issue api.3xtr.im#112 задокументировано там же; в
 *   ките реализовано полностью как fixture, опережающая контракт (тот же
 *   приём, что и `provider_model_id`).
 * @property {string | null} provider_model_id Свободный BYOK-идентификатор
 *   вида `vendor/model`, действителен только при `use_own_api_key`, наравне с
 *   `byok_model` (выбор одного сбрасывает другой — см. `ModelSelect.vue`). В
 *   кабинете пока не сохраняется — блокировано Issue api.3xtr.im#112; в ките
 *   реализовано полностью как спецификация контракта. Не подменяет `model`.
 * @property {number | null} knowledgeCollectionId Durable-ссылка на личную
 *   коллекцию знаний агента (`src/stores/knowledge.js`), Task A10.3.
 *   Заводится либо мастером (`stores/wizard.js`'s `finalizeAgentFields`
 *   переносит `draft.resources.collectionId` сюда, как только агент точно
 *   существует), либо лениво самой вкладкой «Знания» детали агента
 *   (`components/agents/AgentKnowledge.vue`) при первом добавленном
 *   материале — в обоих случаях через `linkKnowledgeCollection` ниже, так
 *   что повторный визит всегда находит уже созданную коллекцию по этому id
 *   вместо того, чтобы завести вторую. В отличие от `draft.resources`
 *   (Stage A9), это поле переживает следующие драфты мастера в том же
 *   пространстве — `draftsByWorkspace` держит не более одного драфта на
 *   пространство и подменяет прежний, так что ссылка на коллекцию первого
 *   агента больше нигде не сохранилась бы, не будь она перенесена на сам
 *   агент.
 */

export const AGENT_STATUSES = ["Активен", "Черновик", "Приостановлен"];

/**
 * Пустое BYOK-состояние по умолчанию — примешивается к каждой fixture-записи
 * агента, у которой явно не указан собственный набор полей.
 *
 * @type {Pick<Agent, "use_own_api_key" | "has_api_key" | "api_key_provider_id" | "api_key_cleared" | "byok_model" | "provider_model_id" | "api_key_id">}
 */
const DEFAULT_BYOK_STATE = {
  use_own_api_key: false,
  has_api_key: false,
  api_key_provider_id: null,
  api_key_cleared: false,
  byok_model: null,
  provider_model_id: null,
  api_key_id: null,
};

/**
 * Пустая ссылка на личную коллекцию знаний по умолчанию (Task A10.3) —
 * примешивается к каждой fixture-записи агента наравне с `DEFAULT_BYOK_STATE`.
 *
 * @type {Pick<Agent, "knowledgeCollectionId">}
 */
const DEFAULT_KNOWLEDGE_STATE = {
  knowledgeCollectionId: null,
};

/**
 * Эффективный UID модели агента — то, что реально используется для
 * запросов/отображения, а не сырое поле `model` (которое хранит только
 * обычную, не-BYOK модель). При выключенном BYOK это `model`; при включённом —
 * свободный `provider_model_id`, если он задан, иначе каталожный `byok_model`.
 * Используется везде, где агент показывается вне формы настроек (каталог
 * `/agents`, фильтр по модели и т.п.), чтобы не дублировать эту ветку логики.
 *
 * @param {Agent | undefined | null} agent
 * @returns {string | null}
 */
export function getAgentModelId(agent) {
  if (!agent) {
    return null;
  }

  if (!agent.use_own_api_key) {
    return agent.model;
  }

  return agent.provider_model_id ?? agent.byok_model ?? null;
}

/**
 * Локальные domain-фикстуры каталога агентов, по одному набору на
 * рабочее пространство (см. `src/stores/workspace.js`). Нет бэкенда — весь
 * стор синхронный in-memory state (Stage A5.2).
 *
 * @type {Record<string, Agent[]>}
 */
const initialAgentsByWorkspace = {
  demo: [
    {
      id: 1,
      name: "Консультант",
      description: "Отвечает на вопросы клиентов о продуктах и доставке.",
      model: "gpt-4.1-mini",
      status: "Активен",
      updated: "2 ч",
      temperature: 0.4,
      instructions: "Помогай клиентам выбрать продукт. Отвечай кратко и по делу.",
      messages: [
        {
          id: 1,
          text: "Здравствуйте! Чем я могу помочь?",
          time: "10:24",
          outgoing: false,
        },
      ],
      ...DEFAULT_BYOK_STATE,
      ...DEFAULT_KNOWLEDGE_STATE,
    },
    {
      id: 2,
      name: "Sales Assistant",
      description: "Квалифицирует лиды и готовит персональные предложения.",
      model: "gpt-4.1",
      status: "Черновик",
      updated: "Вчера",
      temperature: 0.6,
      instructions: "Уточняй задачу клиента и предлагай подходящий тариф.",
      messages: [],
      ...DEFAULT_BYOK_STATE,
      ...DEFAULT_KNOWLEDGE_STATE,
    },
    {
      id: 3,
      name: "Support Bot",
      description: "Помогает решать типовые технические вопросы.",
      model: "gpt-4o-mini",
      status: "Приостановлен",
      updated: "3 д",
      temperature: 0.2,
      instructions: "Используй базу знаний и запрашивай детали ошибки.",
      messages: [],
      ...DEFAULT_BYOK_STATE,
      ...DEFAULT_KNOWLEDGE_STATE,
    },
    {
      id: 4,
      name: "Служба поддержки корпоративных клиентов enterprise-уровня",
      description: "Разбирает продолжительные обращения корпоративных клиентов "
        + "по договорам, интеграциям, биллингу и SLA — фикстура для проверки "
        + "переноса длинных названий и описаний в карточке каталога и вкладке "
        + "настроек, не помещающихся в одну строку без переноса.",
      model: "claude-sonnet-4.5",
      status: "Активен",
      updated: "5 мин",
      temperature: 0.3,
      instructions: "Запрашивай номер договора и SLA перед эскалацией.",
      messages: [],
      ...DEFAULT_BYOK_STATE,
      ...DEFAULT_KNOWLEDGE_STATE,
    },
  ],
  trickster: [
    {
      id: 1,
      name: "Trickster Concierge",
      description: "Помогает команде настраивать рабочее пространство.",
      // BYOK-фикстура: `model` — обычная модель, к которой экран вернётся,
      // если BYOK выключить (Stage A6 fix: раздельные контролы). Пока BYOK
      // включён, реально используется `provider_model_id` (свободный
      // wire-id имеет приоритет над `byok_model`, см. `getAgentModelId`) —
      // ни один из них не подменяет `model`.
      model: "gpt-4.1-mini",
      byok_model: "or-gpt-oss-120b",
      status: "Активен",
      updated: "12 мин",
      temperature: 0.3,
      instructions: "Помогай пользователям работать с продуктами Trickster.",
      messages: [
        {
          id: 1,
          text: "Готов к тестированию. Задайте вопрос о настройке пространства.",
          time: "11:02",
          outgoing: false,
        },
      ],
      use_own_api_key: true,
      has_api_key: true,
      api_key_provider_id: "openrouter",
      api_key_cleared: false,
      // Ссылка на `src/stores/apiKeys.js` ("Личный ключ", workspace
      // "trickster") — сам секрет на агенте больше не хранится.
      api_key_id: "key-1",
      provider_model_id: "meta-llama/llama-3.1-405b-instruct",
      // Task A10.3: уже связан с существующей коллекцией "Trickster Docs"
      // (`src/stores/knowledge.js`'s `trickster` workspace, id 1) — фикстура
      // повторного визита во вкладку «Знания», а не первого лениво созданного
      // контейнера.
      knowledgeCollectionId: 1,
    },
  ],
  empty: [],
};

/**
 * S2 presentation lifecycle (Task A9.6, `.plan` "Система статусов" S2 row):
 * derived from the fixture's own `agent.status` string plus draft
 * completeness — never a replacement for it, and never renamed into a new
 * server-shaped enum (`.plan`: "не переименовывать серверные enum"). There is
 * no `AGENT_STATUSES` entry for `"ready"`: it is a "Черновик" agent whose
 * task/rules are already filled in, shown apart from "nothing set up yet"
 * (`.plan`: "«Черновик» — обязательные условия ещё не выполнены... «Готов к
 * запуску» — задача и правила заданы... запуск ещё не выполнен").
 *
 * @typedef {"draft" | "ready" | "active" | "paused"} AgentLifecycleState
 */
export const AGENT_LIFECYCLE_STATES = Object.freeze(["draft", "ready", "active", "paused"]);

/**
 * Fixture proxy for "task and rules are filled in" — the kit has no separate
 * launch-readiness flag on `Agent`, and `instructions` is the one field every
 * agent (wizard-created or fixture) already carries that reflects it.
 *
 * @param {Agent} agent
 * @returns {boolean}
 */
export function isAgentReadyToLaunch(agent) {
  return Boolean(String(agent?.instructions ?? "").trim());
}

/**
 * @param {Agent} agent
 * @returns {AgentLifecycleState}
 */
export function getAgentLifecycle(agent) {
  if (agent.status === "Активен") {
    return "active";
  }
  if (agent.status === "Приостановлен") {
    return "paused";
  }

  return isAgentReadyToLaunch(agent) ? "ready" : "draft";
}

/**
 * @typedef {Object} AgentStatusProjection
 * @property {AgentLifecycleState} lifecycle
 * @property {string} badgeLabel Основная подпись карточки/детали.
 * @property {"is-primary" | "is-danger" | undefined} badgeType
 * @property {boolean} needsAttention true, когда есть существенная проблема
 *   подключения, о которой стоит явно сказать (не кодируется только цветом —
 *   `.plan`: "статус не кодируется только цветом").
 * @property {string | null} attentionMessage
 */

/** @type {Record<AgentLifecycleState, { label: string, type?: "is-primary" }>} */
const LIFECYCLE_BADGES = Object.freeze({
  draft: { label: "Черновик" },
  ready: { label: "Готов к запуску" },
  active: { label: "Активен", type: "is-primary" },
  paused: { label: "Приостановлен" },
});

/**
 * Derives the S2 card/detail projection for one agent from its own lifecycle
 * and its channels' connection state (`stores/channels.js`) — the single
 * place `.plan`'s "Система статусов" rules live, so every screen that shows
 * an agent's status reads the same decision instead of re-deriving it.
 * Never reports "Активен" as fully healthy when nothing can actually deliver
 * a response, and never hides a working lifecycle behind one channel's own
 * failure (`.plan`: "сбой одного канала не скрывает работу остальных").
 *
 * @param {Agent} agent
 * @param {import("./channels.js").Channel[]} channels
 * @returns {AgentStatusProjection}
 */
export function getAgentStatusProjection(agent, channels) {
  const lifecycle = getAgentLifecycle(agent);
  const badge = LIFECYCLE_BADGES[lifecycle];

  if (lifecycle !== "active") {
    return {
      lifecycle,
      badgeLabel: badge.label,
      badgeType: badge.type,
      needsAttention: false,
      attentionMessage: null,
    };
  }

  const failing = getChannelsNeedingAttention(channels);

  if (channels.length > 0 && !hasWorkingChannel(channels)) {
    return {
      lifecycle,
      badgeLabel: "Не отвечает: ошибка подключения",
      badgeType: "is-danger",
      needsAttention: true,
      attentionMessage: failing[0]?.runtimeReason ?? "Ни один канал сейчас не может доставить ответ.",
    };
  }

  if (failing.length > 0) {
    return {
      lifecycle,
      badgeLabel: badge.label,
      badgeType: badge.type,
      needsAttention: true,
      attentionMessage: `Канал «${failing[0].name}» требует внимания`
        + `${failing[0].runtimeReason ? `: ${failing[0].runtimeReason}` : "."}`,
    };
  }

  return {
    lifecycle,
    badgeLabel: badge.label,
    badgeType: badge.type,
    needsAttention: false,
    attentionMessage: null,
  };
}

export const useAgentsStore = defineStore("agents", () => {
  /** @type {import("vue").Ref<Record<string, Agent[]>>} */
  const agentsByWorkspace = ref(structuredClone(initialAgentsByWorkspace));

  /**
   * @param {string} workspaceId
   * @returns {Agent[]}
   */
  function listByWorkspace(workspaceId) {
    return agentsByWorkspace.value[workspaceId] ?? [];
  }

  /**
   * Резолвит агента по route-параметру `:id` (строка) внутри текущего
   * пространства — используется detail shell'ом и его вкладками
   * (Task A5.4), которые больше не держат выбор в собственном `ref`.
   *
   * @param {string} workspaceId
   * @param {string | number} id
   * @returns {Agent | undefined}
   */
  function getAgent(workspaceId, id) {
    return listByWorkspace(workspaceId)
      .find((agent) => String(agent.id) === String(id));
  }

  /**
   * @param {string} workspaceId
   * @param {string} name
   * @returns {Agent}
   */
  function createAgent(workspaceId, name) {
    const workspaceAgents = agentsByWorkspace.value[workspaceId]
      ?? (agentsByWorkspace.value[workspaceId] = []);
    /** @type {Agent} */
    const agent = {
      id: Date.now(),
      name,
      description: "Новый агент без описания.",
      model: "gpt-4.1-mini",
      status: "Черновик",
      updated: "Сейчас",
      temperature: 0.4,
      instructions: "",
      messages: [],
      ...DEFAULT_BYOK_STATE,
      ...DEFAULT_KNOWLEDGE_STATE,
    };

    workspaceAgents.push(agent);

    return agent;
  }

  /**
   * @param {string} workspaceId
   * @param {number} agentId
   * @param {string} text
   */
  function sendMessage(workspaceId, agentId, text) {
    const agent = listByWorkspace(workspaceId).find(({ id }) => id === agentId);

    if (!agent) {
      return;
    }

    const now = new Intl.DateTimeFormat("ru", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date());
    const messageId = Date.now();

    agent.messages.push({ id: messageId, text, time: now, outgoing: true });
    agent.messages.push({
      id: messageId + 1,
      text: "Тестовый ответ агента на сообщение оператора.",
      time: now,
      outgoing: false,
    });
    agent.updated = "Сейчас";
  }

  /**
   * Агенты воркспейса, реально ссылающиеся на сохранённый ключ
   * `src/stores/apiKeys.js` по `api_key_id` — используется
   * `ApiKeySelect.vue` (Task A10.2), чтобы confirm перед удалением ключа
   * называл затронутых агентов по имени, а не выдуманным каскадом.
   *
   * @param {string} workspaceId
   * @param {string} apiKeyId
   * @returns {Agent[]}
   */
  function listAgentsUsingApiKey(workspaceId, apiKeyId) {
    return listByWorkspace(workspaceId)
      .filter((agent) => agent.use_own_api_key && agent.api_key_id === apiKeyId);
  }

  /**
   * Стирает у агента ссылку на собственный ключ и связанные с ним
   * BYOK-only поля модели — то же присвоение полей, что делает
   * `updateAgentSettings` при выключении BYOK, вынесенное в отдельную
   * функцию, потому что здесь это отдельный вызов, а не побочный эффект
   * патча.
   *
   * @param {Agent} agent
   */
  function clearApiKeyFields(agent) {
    Object.assign(agent, {
      use_own_api_key: false,
      has_api_key: false,
      api_key_provider_id: null,
      api_key_cleared: true,
      api_key_id: null,
      byok_model: null,
      provider_model_id: null,
    });
    agent.updated = "Сейчас";
  }

  /**
   * Мгновенная команда «отвязать ключ от агента» (Task A10.2, `.plan` Stage
   * A10 «Явное сохранение и безопасное редактирование»): применяется сразу,
   * в обход `draft`/«Сохранить модель и ключ» в `AgentSettings.vue` —
   * отвязка одного агента не транзакция формы модели/ключа, у неё
   * собственный результат. Не удаляет сам ключ из
   * `src/stores/apiKeys.js` — он остаётся доступен другим агентам
   * воркспейса; это отличает отвязку от удаления ключа
   * (`apiKeysStore.deleteKey`), которая стирает секрет для всех.
   *
   * @param {string} workspaceId
   * @param {string | number} agentId
   * @returns {Agent | undefined}
   */
  function detachApiKey(workspaceId, agentId) {
    const agent = getAgent(workspaceId, agentId);

    if (!agent || !agent.use_own_api_key) {
      return agent;
    }

    clearApiKeyFields(agent);

    return agent;
  }

  /**
   * Сохранение названия агента (Stage A10 review fix, `.plan` Stage A10
   * «Явное сохранение и безопасное редактирование») — точка приложения
   * `AgentSettings.vue`'s независимого name-draft `useSavableForm`; больше не
   * мутируется полем напрямую из компонента.
   *
   * @param {string} workspaceId
   * @param {string | number} agentId
   * @param {string} name
   * @returns {Agent | undefined}
   */
  function renameAgent(workspaceId, agentId, name) {
    const agent = getAgent(workspaceId, agentId);

    if (!agent) {
      return undefined;
    }

    agent.name = name;
    agent.updated = "Сейчас";

    return agent;
  }

  /**
   * Мгновенная команда смены статуса агента (Stage A10 review fix, `.plan`
   * Stage A10 «Явное сохранение и безопасное редактирование» — Task A10.2's
   * own stated intent for a pause/resume-like instant command, not part of
   * any Save transaction). No-op for an unknown status or one that already
   * matches — `AgentSettings.vue`'s confirm only ever offers the other two
   * `AGENT_STATUSES` values, so this is a defensive guard, not a real path.
   *
   * @param {string} workspaceId
   * @param {string | number} agentId
   * @param {string} status One of `AGENT_STATUSES`.
   * @returns {Agent | undefined}
   */
  function setAgentStatus(workspaceId, agentId, status) {
    const agent = getAgent(workspaceId, agentId);

    if (!agent || !AGENT_STATUSES.includes(status) || agent.status === status) {
      return agent;
    }

    agent.status = status;
    agent.updated = "Сейчас";

    return agent;
  }

  /**
   * Агенты воркспейса, чья личная коллекция знаний ссылается на данный
   * `collectionId` (Task A10.3) — используется вкладкой «Знания» детали
   * агента (`components/agents/AgentKnowledge.vue`), чтобы подтверждение
   * удаления коллекции называло затронутых агентов по имени, а не тихо
   * расширяло каскад (`.plan` Stage A10 «Развести… удалить материал…
   * удалить коллекцию» — «подтверждение показывает доступных пользователю
   * затронутых агентов»). Сегодня коллекция всегда 1:1 с агентом (создаётся
   * либо мастером, либо этой же вкладкой), так что результат — максимум
   * один агент; функция намеренно общая на случай будущего сценария общих
   * коллекций (тот же экспертный раздел «Знания», не создаваемый этой
   * задачей).
   *
   * @param {string} workspaceId
   * @param {string | number} collectionId
   * @returns {Agent[]}
   */
  function listAgentsUsingCollection(workspaceId, collectionId) {
    return listByWorkspace(workspaceId)
      .filter((agent) => agent.knowledgeCollectionId != null
        && String(agent.knowledgeCollectionId) === String(collectionId));
  }

  /**
   * Идемпотентно связывает агента с его личной коллекцией знаний
   * (Task A10.3): повторный вызов с уже установленной ссылкой ничего не
   * меняет — вызывающая сторона (`stores/wizard.js`'s `finalizeAgentFields`,
   * `AgentKnowledge.vue`'s ленивое создание при первом материале) не должна
   * сама проверять, связан ли уже агент, прежде чем звать эту функцию.
   *
   * @param {string} workspaceId
   * @param {string | number} agentId
   * @param {number} collectionId
   * @returns {Agent | undefined}
   */
  function linkKnowledgeCollection(workspaceId, agentId, collectionId) {
    const agent = getAgent(workspaceId, agentId);

    if (!agent || agent.knowledgeCollectionId != null) {
      return agent;
    }

    agent.knowledgeCollectionId = collectionId;

    return agent;
  }

  /**
   * «Убрать из знаний агента» (Task A10.3): агент перестаёт использовать
   * коллекцию в ответах немедленно, но сама коллекция и её материалы
   * остаются в общем разделе «Знания» — в отличие от удаления коллекции
   * (`knowledgeStore.deleteCollection`), которое стирает её для всех
   * связанных агентов безвозвратно. Безопасна для агента без коллекции —
   * не создаёт ошибку, просто не находит что убирать.
   *
   * @param {string} workspaceId
   * @param {string | number} agentId
   * @returns {Agent | undefined}
   */
  function unlinkKnowledgeCollection(workspaceId, agentId) {
    const agent = getAgent(workspaceId, agentId);

    if (agent) {
      agent.knowledgeCollectionId = null;
    }

    return agent;
  }

  /**
   * BYOK-состояние валидно для сохранения тогда и только тогда, когда либо
   * BYOK выключен, либо выбраны И ключ (`api_key_id`, ссылка на
   * `src/stores/apiKeys.js`), И модель (`byok_model` или свободный
   * `provider_model_id`) — иначе получится агент с включённым переключателем,
   * но без реального способа его выполнить. Экспортируется отдельно, чтобы
   * `AgentSettings.vue` могла блокировать кнопку «Сохранить» и показывать
   * те же field-ошибки, что применяет эта функция как последний рубеж.
   *
   * @param {{ useOwnApiKey: boolean, apiKeyId: string | null, byokModel: string | null, providerModelId: string | null }} state
   * @returns {boolean}
   */
  function isByokSaveValid({ useOwnApiKey, apiKeyId, byokModel, providerModelId }) {
    if (!useOwnApiKey) {
      return true;
    }

    return Boolean(apiKeyId) && Boolean(byokModel || providerModelId);
  }

  /**
   * Fixture-эквивалент `PATCH /agents/:id` для полей модели и BYOK. Модель и
   * BYOK-модель — раздельные контролы (Stage A6 fix для Task A6.3): `model`
   * хранит обычную модель и не трогается переключением BYOK, поэтому
   * выключение BYOK автоматически возвращает её без отдельной логики отката.
   * Ключ больше не принимается сырым текстом — только `api_key_id`, ссылка
   * на сохранённый в `src/stores/apiKeys.js` ключ воркспейса (Stage A6 fix
   * post-review, по решению пользователя 2026-09-11: ключи хранятся в
   * профиле воркспейса, а не вводятся заново на каждом агенте).
   * Моделирует серверные правила `agent_handlers.go`:
   * - если результат патча оставляет `use_own_api_key: true` без
   *   `api_key_id` или без модели (`byok_model`/`provider_model_id`), патч
   *   отклоняется целиком и агент возвращается без изменений —
   *   `AgentSettings.vue` не должна была допустить нажатие «Сохранить» в
   *   этом состоянии (см. `isByokSaveValid`), это защитный, а не основной
   *   рубеж;
   * - при переданном `api_key_id` ключ привязывается к провайдеру
   *   выбранного ключа (обычно `"openrouter"` — единственный провайдер,
   *   которым сегодня ограничен BYOK-каталог) и `api_key_cleared` не
   *   выставляется;
   * - выключение BYOK стирает ключ, `byok_model` и `provider_model_id`
   *   (Stage A6 решение 3: они действительны только вместе с BYOK).
   *
   * @param {string} workspaceId
   * @param {string | number} agentId
   * @param {{
   *   model?: string,
   *   byok_model?: string | null,
   *   temperature?: number,
   *   instructions?: string,
   *   use_own_api_key?: boolean,
   *   api_key_id?: string | null,
   *   provider_model_id?: string | null,
   * }} patch
   * @returns {Agent | undefined} Агент без изменений, если патч не прошёл
   *   `isByokSaveValid`; `undefined`, только если агент не найден.
   */
  function updateAgentSettings(workspaceId, agentId, patch) {
    const agent = getAgent(workspaceId, agentId);

    if (!agent) {
      return undefined;
    }

    const nextModel = patch.model ?? agent.model;
    const nextUseOwnApiKey = patch.use_own_api_key ?? agent.use_own_api_key;
    const nextByokModel = patch.byok_model !== undefined ? patch.byok_model : agent.byok_model;
    const nextProviderModelId = patch.provider_model_id !== undefined
      ? patch.provider_model_id
      : agent.provider_model_id;
    const nextApiKeyId = patch.api_key_id !== undefined ? patch.api_key_id : agent.api_key_id;

    if (!isByokSaveValid({
      useOwnApiKey: nextUseOwnApiKey,
      apiKeyId: nextApiKeyId,
      byokModel: nextByokModel,
      providerModelId: nextProviderModelId,
    })) {
      return agent;
    }

    let hasApiKey = agent.has_api_key;
    let apiKeyProviderId = agent.api_key_provider_id;
    let apiKeyId = agent.api_key_id;
    let byokModel = agent.byok_model;
    let providerModelId = agent.provider_model_id;
    let apiKeyCleared = false;

    if (!nextUseOwnApiKey) {
      // Stage A6 решение 3/4: выключение BYOK стирает ключ и оба
      // BYOK-only поля модели — они действительны только вместе с BYOK.
      apiKeyCleared = hasApiKey;
      hasApiKey = false;
      apiKeyProviderId = null;
      apiKeyId = null;
      byokModel = null;
      providerModelId = null;
    } else {
      // `isByokSaveValid` above already guarantees `apiKeyId` is truthy on
      // any patch that reaches this branch, so binding always succeeds here
      // — there is no "stale provider" case left to clear defensively
      // anymore now that the key is a reference, not typed text.
      if (patch.api_key_id !== undefined) {
        apiKeyId = patch.api_key_id;
      }

      const apiKeysStore = useApiKeysStore();
      hasApiKey = true;
      apiKeyProviderId = apiKeysStore.getKey(workspaceId, apiKeyId)?.providerId ?? "openrouter";

      if (patch.byok_model !== undefined) {
        byokModel = patch.byok_model;
      }
      if (patch.provider_model_id !== undefined) {
        providerModelId = patch.provider_model_id;
      }
    }

    Object.assign(agent, {
      model: nextModel,
      use_own_api_key: nextUseOwnApiKey,
      has_api_key: hasApiKey,
      api_key_provider_id: apiKeyProviderId,
      api_key_cleared: apiKeyCleared,
      api_key_id: apiKeyId,
      byok_model: byokModel,
      provider_model_id: providerModelId,
    });

    if (patch.temperature !== undefined) {
      agent.temperature = patch.temperature;
    }
    if (patch.instructions !== undefined) {
      agent.instructions = patch.instructions;
    }

    agent.updated = "Сейчас";

    return agent;
  }

  return {
    agentsByWorkspace,
    listByWorkspace,
    getAgent,
    createAgent,
    sendMessage,
    isByokSaveValid,
    updateAgentSettings,
    listAgentsUsingApiKey,
    detachApiKey,
    renameAgent,
    setAgentStatus,
    listAgentsUsingCollection,
    linkKnowledgeCollection,
    unlinkKnowledgeCollection,
  };
});
