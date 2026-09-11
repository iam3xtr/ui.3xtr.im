import { defineStore } from "pinia";
import { ref } from "vue";

/**
 * @typedef {"queued" | "sending" | "delivered" | "failed" | "cancelled" | "read"} DeliveryStatus
 */

/**
 * @typedef {Object} MessageDelivery
 * @property {DeliveryStatus} status
 * @property {boolean} [retryable]
 * @property {string} [errorMessage]
 */

/**
 * @typedef {Object} ChatMessage
 * @property {number} id
 * @property {string} text
 * @property {string} time
 * @property {boolean} outgoing
 * @property {MessageDelivery} [delivery] Только у исходящих сообщений (Task A5.7).
 */

/**
 * @typedef {Object} Conversation
 * @property {number} id
 * @property {number} agentId Ссылается на `Agent.id` того же рабочего
 *   пространства (`src/stores/agents.js`) — используется маршрутом
 *   `/conversations/:agentId/:conversationId` (Task A5.7) для резолва
 *   диалога; `agent` ниже остаётся отдельным полем отображаемого имени и не
 *   синхронизируется с ним автоматически при смене в настройках диалога.
 * @property {string} contact
 * @property {string} initials
 * @property {string} [avatarUrl]
 * @property {string} email
 * @property {string} channel
 * @property {string} agent
 * @property {string} status
 * @property {string} updated
 * @property {string} created
 * @property {string} preview
 * @property {ChatMessage[]} messages
 */

export const CONVERSATION_STATUSES = ["Активен", "Завершён"];
export const CONVERSATION_CHANNELS = ["Telegram", "Виджет", "Email"];

/**
 * Локальные domain-фикстуры диалогов по рабочим пространствам (см.
 * `src/stores/workspace.js`). Нет бэкенда — весь стор синхронный in-memory
 * state (Stage A5.2).
 *
 * @type {Record<string, Conversation[]>}
 */
const initialConversationsByWorkspace = {
  demo: [
    {
      id: 1,
      agentId: 1,
      contact: "Анна Смирнова",
      initials: "АС",
      email: "anna@example.com",
      channel: "Telegram",
      agent: "Консультант",
      status: "Активен",
      updated: "5 мин",
      created: "Сегодня, 10:24",
      preview: "Спасибо! Тогда оформляем доставку.",
      messages: [
        {
          id: 1,
          text: "Здравствуйте! Подскажите, есть ли доставка по Москве?",
          time: "10:24",
          outgoing: false,
        },
        {
          id: 2,
          text: "Здравствуйте! Да, доставляем курьером в течение двух дней.",
          time: "10:25",
          outgoing: true,
          delivery: { status: "read" },
        },
        {
          id: 3,
          text: "Спасибо! Тогда оформляем доставку.",
          time: "10:27",
          outgoing: false,
        },
      ],
    },
    {
      id: 2,
      agentId: 2,
      contact: "Михаил Орлов",
      initials: "МО",
      email: "m.orlov@example.com",
      channel: "Виджет",
      agent: "Sales Assistant",
      status: "Завершён",
      updated: "42 мин",
      created: "Сегодня, 09:41",
      preview: "Получил презентацию, вернусь с ответом.",
      messages: [
        {
          id: 1,
          text: "Можно получить презентацию продукта?",
          time: "09:41",
          outgoing: false,
        },
        {
          id: 2,
          text: "Конечно. Отправил ссылку на указанную почту.",
          time: "09:43",
          outgoing: true,
          delivery: { status: "delivered" },
        },
      ],
    },
    {
      id: 3,
      agentId: 3,
      contact: "support@example.com",
      initials: "SE",
      email: "support@example.com",
      channel: "Email",
      agent: "Support Bot",
      status: "Завершён",
      updated: "Вчера",
      created: "Вчера, 18:12",
      preview: "Проблема решена, благодарю за помощь.",
      messages: [
        {
          id: 1,
          text: "Не получается войти в личный кабинет.",
          time: "18:12",
          outgoing: false,
        },
        {
          id: 2,
          text: "Сбросил активные сессии. Попробуйте войти ещё раз.",
          time: "18:15",
          outgoing: true,
          delivery: { status: "read" },
        },
      ],
    },
    {
      id: 4,
      agentId: 2,
      contact: "Отдел закупок ООО «Северная Логистическая Компания»",
      initials: "ОЗ",
      email: "procurement@severnaya-logisticheskaya-kompaniya.example.com",
      channel: "Email",
      agent: "Sales Assistant",
      status: "Активен",
      updated: "2 д",
      created: "3 дня назад, 14:02",
      preview: "Нужен расчёт стоимости на годовой контракт с ежемесячной "
        + "отгрузкой на 12 регионов, приложите, пожалуйста, актуальный "
        + "прайс-лист и условия отсрочки платежа.",
      messages: [
        {
          id: 1,
          text: "Нужен расчёт стоимости на годовой контракт с ежемесячной "
            + "отгрузкой на 12 регионов, приложите, пожалуйста, актуальный "
            + "прайс-лист и условия отсрочки платежа.",
          time: "14:02",
          outgoing: false,
        },
        {
          id: 2,
          text: "Отправили расчёт на почту, но провайдер вернул письмо — "
            + "проверьте, пожалуйста, адрес.",
          time: "14:10",
          outgoing: true,
          delivery: {
            status: "failed",
            retryable: true,
            errorMessage: "Почтовый сервер получателя отклонил сообщение (550).",
          },
        },
      ],
    },
  ],
  trickster: [
    {
      id: 1,
      agentId: 1,
      contact: "Мария Волкова",
      initials: "МВ",
      email: "maria@trickster.team",
      channel: "Виджет",
      agent: "Trickster Concierge",
      status: "Активен",
      updated: "12 мин",
      created: "Сегодня, 11:08",
      preview: "Подскажите, как подключить новый канал?",
      messages: [
        {
          id: 1,
          text: "Подскажите, как подключить новый канал?",
          time: "11:08",
          outgoing: false,
        },
        {
          id: 2,
          text: "Откройте раздел «Интеграции» и выберите нужный сервис.",
          time: "11:09",
          outgoing: true,
          delivery: { status: "sending" },
        },
      ],
    },
  ],
  empty: [],
};

export const useConversationsStore = defineStore("conversations", () => {
  /** @type {import("vue").Ref<Record<string, Conversation[]>>} */
  const conversationsByWorkspace = ref(structuredClone(initialConversationsByWorkspace));

  /**
   * @param {string} workspaceId
   * @returns {Conversation[]}
   */
  function listByWorkspace(workspaceId) {
    return conversationsByWorkspace.value[workspaceId] ?? [];
  }

  /**
   * Диалоги конкретного агента — используется агент-скоуп-маршрутом
   * `/conversations/:agentId` (Task A5.7).
   *
   * @param {string} workspaceId
   * @param {string | number} agentId
   * @returns {Conversation[]}
   */
  function listByAgent(workspaceId, agentId) {
    return listByWorkspace(workspaceId)
      .filter((conversation) => String(conversation.agentId) === String(agentId));
  }

  /**
   * Резолвит диалог по route-параметрам `:agentId/:conversationId` — не
   * делает запросов, несуществующий или принадлежащий другому агенту диалог
   * просто резолвится в `undefined`, что route-driven shell
   * (`components/conversations/ConversationDetail.vue`) превращает в то же
   * not-found состояние, что и у `AgentDetail.vue`/`CollectionDetail.vue`.
   *
   * @param {string} workspaceId
   * @param {string | number} agentId
   * @param {string | number} conversationId
   * @returns {Conversation | undefined}
   */
  function getConversation(workspaceId, agentId, conversationId) {
    return listByWorkspace(workspaceId).find(
      (conversation) => String(conversation.agentId) === String(agentId)
        && String(conversation.id) === String(conversationId),
    );
  }

  /**
   * @param {string} workspaceId
   * @param {number} conversationId
   * @param {string} text
   */
  function sendMessage(workspaceId, conversationId, text) {
    const conversation = listByWorkspace(workspaceId)
      .find(({ id }) => id === conversationId);

    if (!conversation) {
      return;
    }

    conversation.messages.push({
      id: Date.now(),
      text,
      time: new Intl.DateTimeFormat("ru", {
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date()),
      outgoing: true,
      delivery: { status: "delivered" },
    });
    conversation.preview = text;
    conversation.updated = "Сейчас";
  }

  /**
   * Переотправка сообщения со статусом `failed` — сбрасывает статус на
   * `delivered`, как и подобает фикстуре без сети (Task A5.7).
   *
   * @param {string} workspaceId
   * @param {number} conversationId
   * @param {number} messageId
   */
  function retryMessageDelivery(workspaceId, conversationId, messageId) {
    const conversation = listByWorkspace(workspaceId)
      .find(({ id }) => id === conversationId);
    const message = conversation?.messages.find(({ id }) => id === messageId);

    if (!message?.delivery) {
      return;
    }

    message.delivery = { status: "delivered" };
  }

  return {
    conversationsByWorkspace,
    listByWorkspace,
    listByAgent,
    getConversation,
    sendMessage,
    retryMessageDelivery,
  };
});
