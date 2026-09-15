import { defineStore } from "pinia";
import { ref } from "vue";

/**
 * @typedef {Object} ApiKey
 * @property {string} id
 * @property {string} label Пользовательское имя ключа — как он выбирается в
 *   `ApiKeySelect.vue` (агент ссылается на ключ по `id`, не хранит сам
 *   секрет).
 * @property {string} providerId Вендор ключа — сейчас всегда `"openrouter"`,
 *   единственный провайдер, с которым работает BYOK (Stage A6 `.plan`,
 *   решение 1).
 * @property {string} secret Значение ключа. Кит хранит его в открытом виде
 *   во fixture-сторе — нет бэкенда и нет реальных секретов; в UI ключ всегда
 *   показывается замаскированным (`maskSecret`), не в открытом виде.
 * @property {string} created Отображаемая дата добавления — тот же формат
 *   строки, что `updated` у агентов/каналов (Stage A5.2), а не ISO-дата.
 */

/**
 * Сохранённые ключи OpenRouter на уровне рабочего пространства (Stage A6 fix
 * post-review, по решению пользователя 2026-09-11): вместо разового ввода
 * ключа в форме каждого агента ключ добавляется один раз в профиль
 * воркспейса и переиспользуется всеми BYOK-агентами — `ApiKeySelect.vue`
 * встраивает выбор из списка и модалку добавления нового ключа в
 * `AgentSettings.vue`. Нет бэкенда — синхронный in-memory fixture-стор, как
 * и остальные домены кита (Stage A5.2).
 *
 * Такого хранилища нет ни в кабинете `get.3xtr.im`, ни в контракте
 * `api.3xtr.im` — это, наравне с `provider_model_id`/`byok_model` в
 * `src/stores/agents.js`, спецификация для будущего серверного контракта, а
 * не отражение уже существующего API. См. `docs/design-system.md` ("Ключи
 * API (`ApiKeySelect`)") и комментарий, оставленный на
 * [api.3xtr.im#112](https://github.com/iam3xtr/api.3xtr.im/issues/112).
 *
 * @type {Record<string, ApiKey[]>}
 */
const initialApiKeysByWorkspace = {
  demo: [],
  trickster: [
    {
      id: "key-1",
      label: "Личный ключ",
      providerId: "openrouter",
      secret: "sk-or-v1-8f2c1a9b3d4e5f60718293a4b5c6d7e8",
      created: "3 д",
    },
  ],
  empty: [],
};

export const useApiKeysStore = defineStore("apiKeys", () => {
  /** @type {import("vue").Ref<Record<string, ApiKey[]>>} */
  const apiKeysByWorkspace = ref(structuredClone(initialApiKeysByWorkspace));

  /**
   * @param {string} workspaceId
   * @returns {ApiKey[]}
   */
  function listByWorkspace(workspaceId) {
    return apiKeysByWorkspace.value[workspaceId] ?? [];
  }

  /**
   * @param {string} workspaceId
   * @param {string} id
   * @returns {ApiKey | undefined}
   */
  function getKey(workspaceId, id) {
    return listByWorkspace(workspaceId).find((key) => key.id === id);
  }

  /**
   * Добавляет ключ в хранилище воркспейса — вызывается из модалки
   * `ApiKeySelect.vue` «Добавить ключ». Провайдер константен: сегодня BYOK
   * работает только с OpenRouter (Stage A6 `.plan`, решение 1), поэтому
   * добавлять ключи других вендоров пока негде и незачем.
   *
   * @param {string} workspaceId
   * @param {{ label: string, secret: string }} input
   * @returns {ApiKey}
   */
  function createKey(workspaceId, { label, secret }) {
    const workspaceKeys = apiKeysByWorkspace.value[workspaceId]
      ?? (apiKeysByWorkspace.value[workspaceId] = []);

    /** @type {ApiKey} */
    const key = {
      id: `key-${Date.now()}`,
      label,
      providerId: "openrouter",
      secret,
      created: "Сейчас",
    };

    workspaceKeys.push(key);

    return key;
  }

  /**
   * Замаскированное представление ключа для списков/выбора — вендор-хвост
   * из 4 символов, остальное скрыто. Не криптографическая маскировка:
   * fixture-демо без реальных секретов и без бэкенда.
   *
   * @param {ApiKey} key
   * @returns {string}
   */
  function maskSecret(key) {
    const tail = key.secret.slice(-4);
    return `••••${tail}`;
  }

  /**
   * Удаляет ключ из хранилища воркспейса безвозвратно (Task A10.2) — отдельная
   * мгновенная команда от «отвязать ключ от агента»
   * (`stores/agents.js#detachApiKey`): удаление стирает сам сохранённый
   * секрет и затрагивает любого агента, который на него ссылается, тогда как
   * отвязка меняет только один агент, оставляя ключ в воркспейсе для
   * остальных. Вызывающая сторона (`ApiKeySelect.vue`) обязана сначала
   * отвязать всех ссылающихся агентов через `agentsStore.detachApiKey` —
   * этот стор ничего не знает о `stores/agents.js`, чтобы не заводить
   * цикл импортов (`agents.js` уже импортирует `apiKeys.js`).
   *
   * @param {string} workspaceId
   * @param {string} id
   */
  function deleteKey(workspaceId, id) {
    const workspaceKeys = apiKeysByWorkspace.value[workspaceId];

    if (!workspaceKeys) {
      return;
    }

    const index = workspaceKeys.findIndex((key) => key.id === id);

    if (index !== -1) {
      workspaceKeys.splice(index, 1);
    }
  }

  return {
    apiKeysByWorkspace,
    listByWorkspace,
    getKey,
    createKey,
    maskSecret,
    deleteKey,
  };
});
