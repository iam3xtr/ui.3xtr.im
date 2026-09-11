import { defineStore } from "pinia";
import { ref } from "vue";

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
 * @property {string} model
 * @property {string} status
 * @property {string} updated
 * @property {number} temperature
 * @property {string} instructions
 * @property {SandboxMessage[]} messages
 */

export const AGENT_STATUSES = ["Активен", "Черновик", "Приостановлен"];
export const AGENT_MODELS = ["GPT-4.1 mini", "GPT-4.1", "GPT-4o mini"];

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
      model: "GPT-4.1 mini",
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
    },
    {
      id: 2,
      name: "Sales Assistant",
      description: "Квалифицирует лиды и готовит персональные предложения.",
      model: "GPT-4.1",
      status: "Черновик",
      updated: "Вчера",
      temperature: 0.6,
      instructions: "Уточняй задачу клиента и предлагай подходящий тариф.",
      messages: [],
    },
    {
      id: 3,
      name: "Support Bot",
      description: "Помогает решать типовые технические вопросы.",
      model: "GPT-4o mini",
      status: "Приостановлен",
      updated: "3 д",
      temperature: 0.2,
      instructions: "Используй базу знаний и запрашивай детали ошибки.",
      messages: [],
    },
    {
      id: 4,
      name: "Служба поддержки корпоративных клиентов enterprise-уровня",
      description: "Разбирает продолжительные обращения корпоративных клиентов "
        + "по договорам, интеграциям, биллингу и SLA — фикстура для проверки "
        + "переноса длинных названий и описаний в карточке каталога и вкладке "
        + "настроек, не помещающихся в одну строку без переноса.",
      model: "GPT-4.1",
      status: "Активен",
      updated: "5 мин",
      temperature: 0.3,
      instructions: "Запрашивай номер договора и SLA перед эскалацией.",
      messages: [],
    },
  ],
  trickster: [
    {
      id: 1,
      name: "Trickster Concierge",
      description: "Помогает команде настраивать рабочее пространство.",
      model: "GPT-4.1",
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
    },
  ],
  empty: [],
};

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
      model: "GPT-4.1 mini",
      status: "Черновик",
      updated: "Сейчас",
      temperature: 0.4,
      instructions: "",
      messages: [],
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

  return {
    agentsByWorkspace,
    listByWorkspace,
    getAgent,
    createAgent,
    sendMessage,
  };
});
