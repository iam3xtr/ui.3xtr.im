import { defineStore } from "pinia";
import { reactive, ref } from "vue";

/**
 * @typedef {"mixed" | "website" | "files" | "links" | "markdown" | "faq"} CollectionType
 */
/** @typedef {"file" | "text" | "url"} KnowledgeObjectKind */
/** @typedef {"indexing" | "indexed" | "error"} KnowledgeObjectStatus */
/** @typedef {"running" | "done" | "error"} ReindexRunStatus */

/**
 * @typedef {Object} KnowledgeObject
 * @property {number} id
 * @property {string} name
 * @property {KnowledgeObjectKind} kind
 * @property {number} size Bytes; 0 for a not-yet-extracted link.
 * @property {KnowledgeObjectStatus} status
 * @property {string} updatedLabel Prebaked relative-time string (kit has no
 *   real timestamps to format — see Dashboard.vue/ChannelCard.vue for the
 *   same convention).
 * @property {string} [sourceLabel] Extra line shown under the name (URL,
 *   file kind/size, or "внутренний документ" for pasted text).
 */

/**
 * @typedef {Object} ReindexRun
 * @property {number} id
 * @property {ReindexRunStatus} status
 * @property {string} startedLabel
 * @property {number} indexedObjects
 * @property {number} totalObjects
 */

/**
 * @typedef {Object} KnowledgeCollection
 * @property {number} id
 * @property {string} name
 * @property {string} description
 * @property {CollectionType} type
 * @property {KnowledgeObject[]} objects
 * @property {ReindexRun[]} reindexRuns
 * @property {boolean} autoNamed `true` only for a collection the agent wizard
 *   created lazily for its own personal knowledge (Task A9.4): its `name`
 *   tracks `fields.agentName` (see `stores/wizard.js`'s knowledge step) until
 *   an explicit rename — through this store's own `updateCollection`, i.e.
 *   the regular collection settings screen, wizard or not — flips it back to
 *   `false`. Regular collections (fixtures, or created outside the wizard)
 *   are never auto-named.
 */

export const COLLECTION_TYPES = [
  {
    value: "mixed",
    label: "Универсальная",
    icon: "folder-multiple-outline",
    description: "Файлы, ссылки и Markdown-документы в одной коллекции.",
  },
  {
    value: "website",
    label: "Сайт",
    icon: "web",
    description: "Страницы сайта, автоматически полученные при обходе.",
  },
  {
    value: "files",
    label: "Файлы",
    icon: "file-multiple-outline",
    description: "PDF, DOCX, таблицы, презентации и другие документы.",
  },
  {
    value: "links",
    label: "Ссылки",
    icon: "link-variant",
    description: "Отдельные веб-страницы и внешние материалы.",
  },
  {
    value: "markdown",
    label: "Markdown",
    icon: "language-markdown-outline",
    description: "Текстовые документы, которые редактируются прямо в системе.",
  },
  {
    value: "faq",
    label: "FAQ",
    icon: "frequently-asked-questions",
    description: "Структурированные пары вопросов и ответов.",
  },
];

/** @type {Record<KnowledgeObjectKind, { label: string, icon: string }>} */
export const OBJECT_KINDS = {
  file: { label: "Файл", icon: "file-outline" },
  text: { label: "Markdown", icon: "language-markdown-outline" },
  url: { label: "Ссылка", icon: "link-variant" },
};

/** @type {Record<KnowledgeObjectStatus, { label: string, tagType?: string }>} */
export const OBJECT_STATUSES = {
  indexing: { label: "Индексация" },
  indexed: { label: "Проиндексирован", tagType: "is-success" },
  error: { label: "Ошибка", tagType: "is-danger" },
};

/** @type {Record<ReindexRunStatus, { label: string, tagType?: string }>} */
export const REINDEX_RUN_STATUSES = {
  running: { label: "Выполняется" },
  done: { label: "Завершена", tagType: "is-success" },
  error: { label: "Ошибка", tagType: "is-danger" },
};

/**
 * Локальные domain-фикстуры коллекций знаний по рабочим пространствам (см.
 * `src/stores/workspace.js`). Нет бэкенда — весь стор синхронный in-memory
 * state (Stage A5.2); статусы объектов и запусков переиндексации меняются по
 * таймерам, которыми владеют компоненты-потребители
 * (`components/knowledge/Files.vue`, `components/knowledge/Settings.vue`),
 * не сам стор — тот же приём, что и демо `b-upload` в `components/kit/Forms.vue`.
 *
 * @type {Record<string, KnowledgeCollection[]>}
 */
const initialCollectionsByWorkspace = {
  demo: [
    {
      id: 1,
      name: "Документация продукта",
      description: "Публичная документация и инструкции для пользователей.",
      type: "website",
      objects: [
        {
          id: 1,
          name: "Начало работы",
          kind: "url",
          size: 18_432,
          status: "indexed",
          updatedLabel: "10 мин назад",
          sourceLabel: "docs.example.com/getting-started",
        },
        {
          id: 2,
          name: "Настройка интеграций",
          kind: "url",
          size: 24_576,
          status: "indexing",
          updatedLabel: "10 мин назад",
          sourceLabel: "docs.example.com/integrations",
        },
      ],
      reindexRuns: [
        { id: 1, status: "done", startedLabel: "Вчера, 14:02", indexedObjects: 2, totalObjects: 2 },
      ],
    },
    {
      id: 2,
      name: "Материалы отдела продаж",
      description: "Презентации, тарифы и заметки для Sales Assistant.",
      type: "mixed",
      objects: [
        {
          id: 3,
          name: "Презентация продукта.pdf",
          kind: "file",
          size: 5_033_164,
          status: "indexed",
          updatedLabel: "Вчера",
          sourceLabel: "PDF",
        },
        {
          id: 4,
          name: "Актуальные тарифы",
          kind: "url",
          size: 9_216,
          status: "indexed",
          updatedLabel: "Вчера",
          sourceLabel: "example.com/pricing",
        },
        {
          id: 5,
          name: "Аргументы для переговоров",
          kind: "text",
          size: 3_072,
          status: "error",
          updatedLabel: "3 дня назад",
          sourceLabel: "Внутренний документ",
        },
      ],
      reindexRuns: [],
    },
    {
      id: 3,
      name: "Регламенты поддержки",
      description: "Внутренние инструкции службы поддержки.",
      type: "files",
      objects: [
        {
          id: 6,
          name: "Регламент первой линии.docx",
          kind: "file",
          size: 839_680,
          status: "indexed",
          updatedLabel: "5 дней назад",
          sourceLabel: "DOCX",
        },
        {
          id: 7,
          name: "Регламент эскалации инцидентов информационной безопасности "
            + "и порядок уведомления клиентов о критичных сбоях.docx",
          kind: "file",
          size: 1_992_294,
          status: "indexed",
          updatedLabel: "12 дней назад",
          sourceLabel: "DOCX · загружен вручную из внутренней базы знаний",
        },
      ],
      reindexRuns: [
        { id: 1, status: "error", startedLabel: "12 дней назад, 09:41", indexedObjects: 1, totalObjects: 2 },
      ],
    },
    {
      id: 4,
      name: "Частые вопросы",
      description: "Проверенные ответы на типовые вопросы клиентов.",
      type: "faq",
      objects: [],
      reindexRuns: [],
    },
  ],
  trickster: [
    {
      id: 1,
      name: "Trickster Docs",
      description: "Документация команды Trickster.",
      type: "website",
      objects: [
        {
          id: 1,
          name: "Рабочие пространства",
          kind: "url",
          size: 12_288,
          status: "indexed",
          updatedLabel: "Сегодня",
          sourceLabel: "docs.3xtr.im/workspaces",
        },
      ],
      reindexRuns: [],
    },
  ],
  empty: [],
};

export const useKnowledgeStore = defineStore("knowledge", () => {
  /** @type {import("vue").Ref<Record<string, KnowledgeCollection[]>>} */
  const collectionsByWorkspace = ref(structuredClone(initialCollectionsByWorkspace));
  let nextObjectId = 1000;
  let nextReindexRunId = 1000;

  /**
   * @param {string} workspaceId
   * @returns {KnowledgeCollection[]}
   */
  function listByWorkspace(workspaceId) {
    return collectionsByWorkspace.value[workspaceId] ?? [];
  }

  /**
   * Looks up a collection by id without ever issuing a request — an unknown
   * `:id` (bad param, or a collection that belongs to a different workspace)
   * simply resolves to `undefined`, which the route-driven shell
   * (`components/knowledge/CollectionDetail.vue`) turns into the same
   * not-found state as any other missing entity (see AgentDetail.vue).
   *
   * @param {string} workspaceId
   * @param {string | number} collectionId
   * @returns {KnowledgeCollection | undefined}
   */
  function getCollection(workspaceId, collectionId) {
    return listByWorkspace(workspaceId)
      .find((collection) => String(collection.id) === String(collectionId));
  }

  /**
   * @param {CollectionType} type
   */
  function getCollectionType(type) {
    return COLLECTION_TYPES.find((item) => item.value === type) ?? COLLECTION_TYPES[0];
  }

  /**
   * @param {KnowledgeObjectKind} kind
   */
  function getObjectKind(kind) {
    return OBJECT_KINDS[kind] ?? OBJECT_KINDS.file;
  }

  /**
   * @param {KnowledgeObjectStatus} status
   */
  function getObjectStatus(status) {
    return OBJECT_STATUSES[status] ?? OBJECT_STATUSES.indexed;
  }

  /**
   * @param {ReindexRunStatus} status
   */
  function getReindexRunStatus(status) {
    return REINDEX_RUN_STATUSES[status] ?? REINDEX_RUN_STATUSES.done;
  }

  /**
   * @param {string} workspaceId
   * @param {{ name: string, description?: string, type: CollectionType, autoNamed?: boolean }} input
   *   `autoNamed` is set only by the agent wizard's `ensureCollection`
   *   (Task A9.4) — everything else (fixtures, the regular "create
   *   collection" flow) leaves it `false`.
   * @returns {KnowledgeCollection}
   */
  function createCollection(workspaceId, { name, description, type, autoNamed = false }) {
    const workspaceCollections = collectionsByWorkspace.value[workspaceId]
      ?? (collectionsByWorkspace.value[workspaceId] = []);
    /** @type {KnowledgeCollection} */
    const collection = reactive({
      id: Date.now(),
      name,
      type,
      description: description?.trim() || getCollectionType(type).description,
      objects: [],
      reindexRuns: [],
      autoNamed,
    });

    workspaceCollections.push(collection);

    return collection;
  }

  /**
   * Explicit rename/description edit — the regular collection settings
   * screen (`components/knowledge/Settings.vue`) is the only caller. Clears
   * `autoNamed`: once a name is set this way, the wizard's agent-name sync
   * (`syncAutoName`) must stop overwriting it, wizard-created collection or
   * not (Task A9.4, `.plan` "Знания без внутренних структур" — "Явное
   * экспертное имя больше не перезаписывается").
   *
   * @param {string} workspaceId
   * @param {string | number} collectionId
   * @param {{ name: string, description: string }} input
   */
  function updateCollection(workspaceId, collectionId, { name, description }) {
    const collection = getCollection(workspaceId, collectionId);

    if (!collection) {
      return;
    }

    collection.name = name;
    collection.description = description;
    collection.autoNamed = false;
  }

  /**
   * Keeps an `autoNamed` collection's name mirroring the wizard's current
   * `fields.agentName` (Task A9.4) — a no-op once the collection has been
   * explicitly renamed (`autoNamed` false, see `updateCollection`) or does
   * not exist. Never called for a collection the wizard did not create
   * itself, so this never renames a user's own/shared collection.
   *
   * @param {string} workspaceId
   * @param {string | number} collectionId
   * @param {string} name
   * @returns {boolean} Whether the name was actually synced.
   */
  function syncAutoName(workspaceId, collectionId, name) {
    const collection = getCollection(workspaceId, collectionId);

    if (!collection || !collection.autoNamed || collection.name === name) {
      return false;
    }

    collection.name = name;

    return true;
  }

  /**
   * Registers a new object in `indexing` status — callers own the timer that
   * eventually flips it to `indexed`/`error` via `setObjectStatus` (kept out
   * of the store so unmounting the tab cancels the timer, same pattern as
   * `components/kit/Forms.vue`'s upload demo).
   *
   * @param {string} workspaceId
   * @param {string | number} collectionId
   * @param {{ name: string, kind: KnowledgeObjectKind, size?: number, sourceLabel?: string }} input
   * @returns {KnowledgeObject | undefined}
   */
  function addObject(workspaceId, collectionId, { name, kind, size = 0, sourceLabel = "" }) {
    const collection = getCollection(workspaceId, collectionId);

    if (!collection) {
      return undefined;
    }

    /** @type {KnowledgeObject} */
    const object = reactive({
      id: ++nextObjectId,
      name,
      kind,
      size,
      status: "indexing",
      updatedLabel: "только что",
      sourceLabel,
    });

    collection.objects.push(object);

    return object;
  }

  /**
   * @param {string} workspaceId
   * @param {string | number} collectionId
   * @param {number} objectId
   * @param {KnowledgeObjectStatus} status
   */
  function setObjectStatus(workspaceId, collectionId, objectId, status) {
    const object = getCollection(workspaceId, collectionId)
      ?.objects.find((item) => item.id === objectId);

    if (object) {
      object.status = status;
    }
  }

  /**
   * @param {string} workspaceId
   * @param {string | number} collectionId
   * @param {number} objectId
   */
  function removeObject(workspaceId, collectionId, objectId) {
    const collection = getCollection(workspaceId, collectionId);

    if (!collection) {
      return;
    }

    collection.objects = collection.objects.filter(({ id }) => id !== objectId);
  }

  /**
   * Starts a reindex run in `running` status — as with `addObject`, the
   * caller (`components/knowledge/Settings.vue`) owns the timer that settles
   * it via `settleReindexRun`.
   *
   * @param {string} workspaceId
   * @param {string | number} collectionId
   * @returns {ReindexRun | undefined}
   */
  function startReindexRun(workspaceId, collectionId) {
    const collection = getCollection(workspaceId, collectionId);

    if (!collection) {
      return undefined;
    }

    /** @type {ReindexRun} */
    const run = reactive({
      id: ++nextReindexRunId,
      status: "running",
      startedLabel: "только что",
      indexedObjects: 0,
      totalObjects: collection.objects.length,
    });

    collection.reindexRuns.unshift(run);

    return run;
  }

  /**
   * @param {string} workspaceId
   * @param {string | number} collectionId
   * @param {number} runId
   * @param {ReindexRunStatus} status
   */
  function settleReindexRun(workspaceId, collectionId, runId, status) {
    const run = getCollection(workspaceId, collectionId)
      ?.reindexRuns.find((item) => item.id === runId);

    if (!run) {
      return;
    }

    run.status = status;
    run.indexedObjects = status === "error"
      ? Math.max(0, run.totalObjects - 1)
      : run.totalObjects;
  }

  return {
    collectionsByWorkspace,
    listByWorkspace,
    getCollection,
    getCollectionType,
    getObjectKind,
    getObjectStatus,
    getReindexRunStatus,
    createCollection,
    updateCollection,
    syncAutoName,
    addObject,
    setObjectStatus,
    removeObject,
    startReindexRun,
    settleReindexRun,
  };
});
