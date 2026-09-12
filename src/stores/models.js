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
 * @property {ModelClassId} classId Which of the three wizard-facing model
 *   classes (Task A9.5) this catalog entry belongs to. Purely a kit-local
 *   grouping for the main (non-expert) wizard path — the server catalog has
 *   no such field.
 */

/**
 * @typedef {"basic" | "advanced" | "power"} ModelClassId
 */

/**
 * The three model classes the wizard's main path recommends by purpose
 * instead of a raw model id (Task A9.5, `.plan` "Основной и экспертный
 * режимы, модели и тарифы", decision 2: «Простая / Продвинутая / Сильная» с
 * пояснением назначения, относительной стоимости и доступности). Deliberately
 * carries only a stable `id` and a *relative* price tier (not a currency
 * amount, not a quality guarantee) — the actual copy (label/purpose/price
 * wording) is scoped RU/EN/ES text owned by `src/locales/wizard/**`, not this
 * store, matching the rest of the kit's "no i18n infra outside A9/A10 scoped
 * dictionaries" rule (see `.plan` "Ограничения").
 *
 * @type {ReadonlyArray<{ id: ModelClassId, relativePriceTier: 1 | 2 | 3 }>}
 */
export const MODEL_CLASSES = Object.freeze([
  { id: "basic", relativePriceTier: 1 },
  { id: "advanced", relativePriceTier: 2 },
  { id: "power", relativePriceTier: 3 },
]);

/** @type {ReadonlyArray<ModelClassId>} */
export const MODEL_CLASS_IDS = Object.freeze(MODEL_CLASSES.map((modelClass) => modelClass.id));

/**
 * Kit-wide (non-localized) short label for a model class — for screens
 * outside the wizard's own localized expert surface, currently `Agents.vue`'s
 * catalog card and its model filter (Task A9.5 post-review fix, Stage A9
 * `.plan` decision 4: "младший профиль не должен снова требовать узнавать
 * модели в соседнем экране... нужны единые подписи классов"). The wizard
 * itself keeps its own scoped RU/EN/ES copy (`locales/wizard/**`,
 * `modelClass.<id>.label`) as the source of truth inside the wizard — this
 * is only the Russian default the rest of the (not internationalized) kit
 * already uses everywhere else.
 *
 * @type {Record<ModelClassId, string>}
 */
export const MODEL_CLASS_LABELS = Object.freeze({
  basic: "Простая",
  advanced: "Продвинутая",
  power: "Сильная",
});

/**
 * @param {ModelClassId} classId
 * @returns {string}
 */
export function getModelClassLabel(classId) {
  return MODEL_CLASS_LABELS[classId] ?? classId;
}

/**
 * @typedef {Object} WizardCapabilityProfile
 * @property {"junior" | "advanced" | "single"} id Fixture-profile name from
 *   `.plan` decision 3 — not shown to the user, only used by tests/comments
 *   to name the scenario.
 * @property {ReadonlyArray<ModelClassId>} allowedClassIds Classes the main
 *   path may recommend/offer for this workspace's tariff. A profile with one
 *   entry (the "single available class" variant, `.plan` decision 3) has
 *   nothing to choose between and the picker collapses to a static line.
 * @property {boolean} allowExpertCatalog Whether "Расширенные параметры" may
 *   show the raw model catalog (`ModelSelect`) instead of only classes.
 * @property {boolean} allowByok Whether "Расширенные параметры" may show the
 *   BYOK switch/`ApiKeySelect`/`ModelSelect` at all.
 */

/**
 * Fixture tariff/capability profiles the wizard's expert disclosure reads
 * (Task A9.5), keyed by workspace like `apiKeysByWorkspace`/
 * `agentsByWorkspace` — reusing the kit's existing three demo workspaces
 * instead of inventing a separate profile switcher control:
 * - `demo` (Free tariff, `.plan` decision 3 "младший тариф"): all three
 *   classes are choosable, but the raw catalog and BYOK stay unavailable even
 *   behind "Расширенные параметры" — the main path never needs a model id.
 * - `trickster` (Superior tariff, "расширенный"): same three classes, plus
 *   the raw catalog/BYOK reachable from the expert disclosure.
 * - `empty`: the "single available class" variant (decision 3) — only
 *   `basic` is offered, matching this workspace's existing role elsewhere in
 *   the kit as the sparse/limited fixture.
 * Not a real tariff matrix — concrete pricing/BYOK rules are a product
 * decision (`.plan`: "не новые правила ... выдуманные на этапе вёрстки").
 *
 * @type {Record<string, WizardCapabilityProfile>}
 */
export const WIZARD_CAPABILITY_PROFILES = Object.freeze({
  demo: Object.freeze({
    id: "junior",
    allowedClassIds: Object.freeze(["basic", "advanced", "power"]),
    allowExpertCatalog: false,
    allowByok: false,
  }),
  trickster: Object.freeze({
    id: "advanced",
    allowedClassIds: Object.freeze(["basic", "advanced", "power"]),
    allowExpertCatalog: true,
    allowByok: true,
  }),
  empty: Object.freeze({
    id: "single",
    allowedClassIds: Object.freeze(["basic"]),
    allowExpertCatalog: false,
    allowByok: false,
  }),
});

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
    classId: "basic",
  },
  {
    id: "gpt-4.1",
    name: "GPT-4.1",
    providerId: "openai",
    recommended: true,
    classId: "advanced",
  },
  {
    id: "gpt-4o-mini",
    name: "GPT-4o mini",
    providerId: "openai",
    recommended: false,
    classId: "basic",
  },
  {
    id: "claude-sonnet-4.5",
    name: "Claude Sonnet 4.5",
    providerId: "anthropic",
    recommended: true,
    classId: "power",
  },
  {
    id: "claude-haiku-4.5",
    name: "Claude Haiku 4.5",
    providerId: "anthropic",
    recommended: false,
    classId: "basic",
  },
  {
    id: "gemini-2.5-pro",
    name: "Gemini 2.5 Pro",
    providerId: "google",
    recommended: false,
    classId: "advanced",
  },
  {
    id: "or-gpt-oss-120b",
    name: "GPT-OSS 120B (OpenRouter)",
    providerId: "openrouter",
    recommended: true,
    classId: "power",
  },
  {
    id: "or-llama-3.3-70b",
    name: "Llama 3.3 70B Instruct (OpenRouter)",
    providerId: "openrouter",
    recommended: false,
    classId: "advanced",
  },
  {
    id: "or-long-name",
    name: "Служба поддержки корпоративных клиентов enterprise-уровня: длинное "
      + "составное имя модели для проверки переноса строки в карточке и списке",
    providerId: "openrouter",
    recommended: false,
    classId: "power",
  },
  {
    id: "local-llama-3-8b",
    name: "Llama 3 8B (локальный сервер)",
    providerId: "localhost",
    recommended: false,
    classId: "basic",
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

  /**
   * @param {ModelClassId} classId
   * @returns {{ id: ModelClassId, relativePriceTier: 1 | 2 | 3 } | undefined}
   */
  function getModelClass(classId) {
    return MODEL_CLASSES.find(({ id }) => id === classId);
  }

  /**
   * Catalog scoped to one wizard model class (Task A9.5), optionally further
   * scoped by vendor (BYOK → `openrouter`, same `providerId` option as
   * `list`/`search`).
   *
   * @param {ModelClassId} classId
   * @param {{ providerId?: string }} [options]
   * @returns {Array<CatalogModel & { provider: ModelProvider | undefined }>}
   */
  function listByClass(classId, options = {}) {
    return list(options).filter((model) => model.classId === classId);
  }

  /**
   * The model the wizard's main path actually uses when a user picks a class
   * instead of a raw model id: the class's recommended model if there is
   * one, otherwise its first entry. `undefined` only if the class has no
   * catalog entries at all under the given scope (e.g. a BYOK scope with no
   * OpenRouter model of that class) — callers must not assume a result.
   *
   * @param {ModelClassId} classId
   * @param {{ providerId?: string }} [options]
   * @returns {(CatalogModel & { provider: ModelProvider | undefined }) | undefined}
   */
  function getRecommendedModelForClass(classId, options = {}) {
    const scoped = listByClass(classId, options);
    return scoped.find((model) => model.recommended) ?? scoped[0];
  }

  /**
   * @param {string} workspaceId
   * @returns {WizardCapabilityProfile}
   */
  function getCapabilityProfile(workspaceId) {
    return WIZARD_CAPABILITY_PROFILES[workspaceId] ?? WIZARD_CAPABILITY_PROFILES.demo;
  }

  return {
    providers,
    models,
    getProvider,
    getModel,
    list,
    listRecommended,
    search,
    getModelClass,
    listByClass,
    getRecommendedModelForClass,
    getCapabilityProfile,
  };
});
