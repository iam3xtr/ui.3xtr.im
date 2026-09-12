import { defineStore } from "pinia";
import { ref } from "vue";

/**
 * @typedef {Object} AdminUser
 * @property {number} id
 * @property {string} name
 * @property {string} email
 * @property {string} role
 * @property {number} workspaces
 * @property {"Активен" | "Заблокирован"} status
 * @property {string} lastActive
 */

/**
 * @typedef {Object} AdminProvider
 * @property {string} id
 * @property {string} name
 * @property {string} protocol
 * @property {"Подключён" | "Отключён"} status
 * @property {number} modelsCount
 */

/**
 * @typedef {Object} AdminModel
 * @property {string} id
 * @property {string} name
 * @property {string} providerName
 * @property {"Включена" | "Отключена"} status
 * @property {string} contextWindow
 */

/**
 * @typedef {Object} AdminTariff
 * @property {string} id
 * @property {string} name
 * @property {string} price
 * @property {string} membersLimit
 * @property {number} workspacesCount
 * @property {"Активен" | "Архив"} status
 */

/**
 * @typedef {Object} AdminRequest
 * @property {number} id
 * @property {string} model
 * @property {string} workspace
 * @property {"Успех" | "Ошибка"} status
 * @property {number} tokens
 * @property {string} created
 */

// Кит-only админ-реестр (Stage A8, Task A8.3): пять облегчённых каталогов
// («Администрирование» в Sidebar), покрывающих операторский навигационный
// контур get.3xtr.im (`/users/`, `/providers/`, `/models/`, `/tariffs/`) —
// см. `docs/design-system.md`, «Списки: каталог карточек или таблица»
// («участники, приглашения, пользователи, провайдеры, модели, логи
// запросов» — документированные примеры табличного паттерна). Данные —
// статичные in-memory фикстуры, не связанные ни с per-workspace fixture-
// сторами (`workspace.js`/`members.js`/`models.js`), ни друг с другом:
// экраны этого домена — намеренно самостоятельные presentation-справочники
// без CRUD-действий, permissions и сети (см. `.todo`, Task A8.3, «Уточнённые
// требования»). `requests` не имеет маршрута-аналога верхнего уровня в
// get.3xtr.im (там это `/requests/:id` — детали одного запроса, открываемые
// из `models/:id/requests`) — задокументированный кит-only пробел, см.
// `docs/design-system.md`, «Route families».
const ADMIN_USERS = [
  {
    id: 1,
    name: "Иван Петров",
    email: "ivan.petrov@example.com",
    role: "Владелец",
    workspaces: 2,
    status: "Активен",
    lastActive: "Сегодня",
  },
  {
    id: 2,
    name: "Анна Смирнова",
    email: "anna.smirnova@example.com",
    role: "Администратор",
    workspaces: 1,
    status: "Активен",
    lastActive: "Вчера",
  },
  {
    id: 3,
    name: "Служба поддержки клиентов регионального подразделения enterprise-уровня",
    email: "regional-support-desk-escalations@example-holding-company.com",
    role: "Участник",
    workspaces: 5,
    status: "Заблокирован",
    lastActive: "12 дней назад",
  },
];

/** @type {AdminProvider[]} */
const ADMIN_PROVIDERS = [
  { id: "openai", name: "OpenAI", protocol: "openai", status: "Подключён", modelsCount: 3 },
  { id: "anthropic", name: "Anthropic", protocol: "anthropic", status: "Подключён", modelsCount: 2 },
  { id: "google", name: "Google", protocol: "google", status: "Отключён", modelsCount: 1 },
  { id: "openrouter", name: "OpenRouter", protocol: "openai", status: "Подключён", modelsCount: 3 },
];

/** @type {AdminModel[]} */
const ADMIN_MODELS = [
  { id: "gpt-4.1-mini", name: "GPT-4.1 mini", providerName: "OpenAI", status: "Включена", contextWindow: "128K" },
  { id: "gpt-4.1", name: "GPT-4.1", providerName: "OpenAI", status: "Включена", contextWindow: "1M" },
  {
    id: "claude-sonnet-4.5",
    name: "Claude Sonnet 4.5",
    providerName: "Anthropic",
    status: "Включена",
    contextWindow: "200K",
  },
  {
    id: "gemini-2.5-pro",
    name: "Gemini 2.5 Pro",
    providerName: "Google",
    status: "Отключена",
    contextWindow: "1M",
  },
  {
    id: "or-gpt-oss-120b",
    name: "GPT-OSS 120B (OpenRouter)",
    providerName: "OpenRouter",
    status: "Включена",
    contextWindow: "128K",
  },
];

/** @type {AdminTariff[]} */
const ADMIN_TARIFFS = [
  { id: "free", name: "Free", price: "Бесплатно", membersLimit: "До 3", workspacesCount: 128, status: "Активен" },
  {
    id: "superior",
    name: "Superior",
    price: "2 900 ₽ / мес",
    membersLimit: "До 25",
    workspacesCount: 42,
    status: "Активен",
  },
  {
    id: "business",
    name: "Business",
    price: "По запросу",
    membersLimit: "Без ограничений",
    workspacesCount: 6,
    status: "Активен",
  },
  {
    id: "legacy",
    name: "Legacy Pro",
    price: "990 ₽ / мес",
    membersLimit: "До 10",
    workspacesCount: 3,
    status: "Архив",
  },
];

/** @type {AdminRequest[]} */
const ADMIN_REQUESTS = [
  { id: 1001, model: "GPT-4.1 mini", workspace: "Demo", status: "Успех", tokens: 842, created: "2 мин назад" },
  {
    id: 1000,
    model: "Claude Sonnet 4.5",
    workspace: "Trickster",
    status: "Ошибка",
    tokens: 0,
    created: "18 мин назад",
  },
  { id: 999, model: "Gemini 2.5 Pro", workspace: "Demo", status: "Успех", tokens: 1520, created: "1 час назад" },
  {
    id: 998,
    model: "GPT-OSS 120B (OpenRouter)",
    workspace: "Trickster",
    status: "Успех",
    tokens: 356,
    created: "Сегодня, 09:14",
  },
];

/**
 * Единый стор-реестр пяти облегчённых административных каталогов (Task
 * A8.3). Presentation-only: только чтение готового fixture-списка, без
 * записи, поиска на сервере или запросов — экраны сами фильтруют/ищут по
 * уже загруженному списку (тот же приём, что `Agents.vue`/`Knowledge.vue`).
 */
export const useAdministrationStore = defineStore("administration", () => {
  /** @type {import("vue").Ref<AdminUser[]>} */
  const users = ref(structuredClone(ADMIN_USERS));
  /** @type {import("vue").Ref<AdminProvider[]>} */
  const providers = ref(structuredClone(ADMIN_PROVIDERS));
  /** @type {import("vue").Ref<AdminModel[]>} */
  const models = ref(structuredClone(ADMIN_MODELS));
  /** @type {import("vue").Ref<AdminTariff[]>} */
  const tariffs = ref(structuredClone(ADMIN_TARIFFS));
  /** @type {import("vue").Ref<AdminRequest[]>} */
  const requests = ref(structuredClone(ADMIN_REQUESTS));

  return {
    users,
    providers,
    models,
    tariffs,
    requests,
  };
});
