import { defineStore } from "pinia";
import { ref } from "vue";

/**
 * @typedef {Object} ModelProvider
 * @property {string} id
 * @property {string} name
 * @property {string} [icon] Icon registry name (`Icon.vue`); falls back to
 *   `protocol`, then `id`, then `brain` when absent — mirrors the resolution
 *   chain used by `get.3xtr.im/src/modules/agents/components/ModelSelect.vue`.
 * @property {string} protocol
 */

/**
 * @typedef {Object} CatalogModel
 * @property {string} id UID of the catalog entry (`ModelResponse.id` in
 *   `api.3xtr.im/internal/llmcatalog/types.go`), not a provider wire-id.
 * @property {string} name
 * @property {string} providerId References `ModelProvider.id`.
 * @property {boolean} recommended
 */

/**
 * Локальный каталог моделей — fixture-эквивалент `GET /models`
 * (`api.3xtr.im/internal/llmcatalog`). Нет сети, нет персистентности: весь
 * стор — синхронный in-memory справочник (Task A6.1).
 *
 * Состояния, которые обязан покрывать каталог по Stage A6 `.plan`:
 * - несколько вендоров, включая `openrouter` (BYOK фильтрует список именно
 *   по нему);
 * - рекомендуемые и обычные модели вперемешку;
 * - длинное имя модели (проверка переноса в UI);
 * - модель без собственной иконки провайдера (проверка fallback на `brain`).
 *
 * @type {ModelProvider[]}
 */
const MODEL_PROVIDERS = [
  { id: "openai", name: "OpenAI", icon: "openai", protocol: "openai" },
  { id: "anthropic", name: "Anthropic", icon: "anthropic", protocol: "anthropic" },
  { id: "google", name: "Google", icon: "gemini", protocol: "google" },
  {
    id: "openrouter",
    name: "OpenRouter",
    icon: "openrouter",
    protocol: "openai",
  },
  // Намеренно без `icon` — проверяет fallback `provider.icon → protocol → id → brain`.
  { id: "localhost", name: "Локальный сервер", protocol: "openai" },
];

/** @type {CatalogModel[]} */
const CATALOG_MODELS = [
  {
    id: "gpt-4.1-mini",
    name: "GPT-4.1 mini",
    providerId: "openai",
    recommended: true,
  },
  {
    id: "gpt-4.1",
    name: "GPT-4.1",
    providerId: "openai",
    recommended: true,
  },
  {
    id: "gpt-4o-mini",
    name: "GPT-4o mini",
    providerId: "openai",
    recommended: false,
  },
  {
    id: "claude-sonnet-4.5",
    name: "Claude Sonnet 4.5",
    providerId: "anthropic",
    recommended: true,
  },
  {
    id: "claude-haiku-4.5",
    name: "Claude Haiku 4.5",
    providerId: "anthropic",
    recommended: false,
  },
  {
    id: "gemini-2.5-pro",
    name: "Gemini 2.5 Pro",
    providerId: "google",
    recommended: false,
  },
  {
    id: "or-gpt-oss-120b",
    name: "GPT-OSS 120B (OpenRouter)",
    providerId: "openrouter",
    recommended: true,
  },
  {
    id: "or-llama-3.3-70b",
    name: "Llama 3.3 70B Instruct (OpenRouter)",
    providerId: "openrouter",
    recommended: false,
  },
  {
    id: "or-long-name",
    name: "Служба поддержки корпоративных клиентов enterprise-уровня: длинное "
      + "составное имя модели для проверки переноса строки в карточке и списке",
    providerId: "openrouter",
    recommended: false,
  },
  {
    id: "local-llama-3-8b",
    name: "Llama 3 8B (локальный сервер)",
    providerId: "localhost",
    recommended: false,
  },
];

export const useModelsStore = defineStore("models", () => {
  /** @type {import("vue").Ref<ModelProvider[]>} */
  const providers = ref(structuredClone(MODEL_PROVIDERS));
  /** @type {import("vue").Ref<CatalogModel[]>} */
  const models = ref(structuredClone(CATALOG_MODELS));

  /**
   * @param {string} providerId
   * @returns {ModelProvider | undefined}
   */
  function getProvider(providerId) {
    return providers.value.find(({ id }) => id === providerId);
  }

  /**
   * Модель вместе с резолвленным провайдером — то, что `ModelSelect`
   * (Task A6.2) использует для выбора иконки строки.
   *
   * @param {CatalogModel} model
   * @returns {CatalogModel & { provider: ModelProvider | undefined }}
   */
  function withProvider(model) {
    return { ...model, provider: getProvider(model.providerId) };
  }

  /**
   * @param {string} modelId
   * @returns {(CatalogModel & { provider: ModelProvider | undefined }) | undefined}
   */
  function getModel(modelId) {
    const model = models.value.find(({ id }) => id === modelId);
    return model ? withProvider(model) : undefined;
  }

  /**
   * Список каталога, опционально ограниченный вендором (BYOK →
   * `openrouter`, Stage A6 решение 1).
   *
   * @param {{ providerId?: string }} [options]
   * @returns {Array<CatalogModel & { provider: ModelProvider | undefined }>}
   */
  function list({ providerId } = {}) {
    return models.value
      .filter((model) => !providerId || model.providerId === providerId)
      .map(withProvider);
  }

  /**
   * @param {{ providerId?: string }} [options]
   * @returns {Array<CatalogModel & { provider: ModelProvider | undefined }>}
   */
  function listRecommended(options = {}) {
    return list(options).filter((model) => model.recommended);
  }

  /**
   * Поиск по имени, вендору и идентификатору — раскладка «ввод текста ищет
   * по всем моделям» (Stage A6 решение 2).
   *
   * @param {string} query
   * @param {{ providerId?: string }} [options]
   * @returns {Array<CatalogModel & { provider: ModelProvider | undefined }>}
   */
  function search(query, options = {}) {
    const normalized = query.trim().toLowerCase();
    const scoped = list(options);

    if (!normalized) {
      return scoped;
    }

    return scoped.filter((model) => {
      const haystacks = [model.name, model.id, model.provider?.name, model.providerId];
      return haystacks.some((value) => value?.toLowerCase().includes(normalized));
    });
  }

  return {
    providers,
    models,
    getProvider,
    getModel,
    list,
    listRecommended,
    search,
  };
});
