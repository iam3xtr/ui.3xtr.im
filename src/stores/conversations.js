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
 * @typedef {Object} HandoffOwner
 * @property {number} id
 * @property {string} name
 */

/**
 * @typedef {Object} ConversationHandoff Task A10.5 owner/lease shape for the
 *   existing `awaitingOperator` signal (Task A10.4) — mirrors get.3xtr.im's
 *   `chat.operator_lease` contract (`modules/conversations/views/Conversation.vue`'s
 *   `iOwnLease`/`canInterfere`/`canReturnControl`) closely enough to port,
 *   without a real clock: this store has no `setInterval` anywhere (see
 *   `MessageDeliveryStatus.vue`'s own comment on why the delivery pipeline
 *   isn't simulated over time either), so `leaseExpired` is a plain fixture
 *   flag set directly on the conversation instead of an `expiresAt`
 *   timestamp compared against `Date.now()`.
 * @property {HandoffOwner | null} owner Operator currently (or most
 *   recently) holding the lease; `null` while nobody has ever claimed the
 *   dialog. Kept set even once `leaseExpired` becomes true, so the UI can
 *   still say who last held it.
 * @property {boolean} leaseExpired `true` simulates a stale lease: `owner`
 *   is retained for display but the lease itself is no longer active, so
 *   any operator — including the previous owner — can reclaim it without a
 *   conflict (`ownsHandoff` below returns `false` for its own owner in this
 *   state, on purpose).
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
 * @property {boolean} [awaitingOperator] Task A10.4 fixture S2 signal, kept
 *   as the "escalated" gate for Task A10.5's owner/lease model below: true
 *   while the conversation needs a human operator (agent couldn't answer,
 *   handed off per its wizard-configured rule). Set back to `false` by
 *   `releaseHandoff` ("Вернуть агенту" — the dialog stops needing a human
 *   at all, not just this operator), so it also gates the dashboard's
 *   "attention" section (Task A10.4) automatically.
 * @property {string} [operatorNote] Human-readable reason shown alongside
 *   `awaitingOperator`; only meaningful when that flag is true.
 * @property {ConversationHandoff} [handoff] Task A10.5 owner/lease state;
 *   only meaningful while `awaitingOperator` is true. Defaults to
 *   `{ owner: null, leaseExpired: false }` (`DEFAULT_HANDOFF`) when absent.
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
      // Task A10.4 fixture: agent couldn't resolve a follow-up question and
      // handed the conversation off — the dashboard's one non-empty
      // "handoff" attention scenario for the default `demo` workspace.
      awaitingOperator: true,
      operatorNote: "Агент не смог ответить на уточняющий вопрос — требуется оператор.",
      // Task A10.5: escalated and still unclaimed — the queue's "Требует
      // участия" scenario. `owner: null` means "Взять диалог" is available
      // to any operator; there is nothing to conflict with yet.
      handoff: { owner: null, leaseExpired: false },
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
      handoff: { owner: null, leaseExpired: false },
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
      handoff: { owner: null, leaseExpired: false },
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
      handoff: { owner: null, leaseExpired: false },
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
    // Task A10.5: three more escalated fixtures below, each pinned to a
    // different point of the owner/lease state machine so `claimHandoff`/
    // `releaseHandoff`/the composer's send-guard all have a deterministic
    // (not race-dependent) scenario to exercise — a real two-tab race is not
    // reproducible in a synchronous, backend-less store.
    {
      id: 5,
      agentId: 1,
      contact: "Дмитрий Фролов",
      initials: "ДФ",
      email: "d.frolov@example.com",
      channel: "Виджет",
      agent: "Консультант",
      status: "Активен",
      updated: "3 мин",
      created: "Сегодня, 11:40",
      preview: "Жду ответа по возврату средств.",
      awaitingOperator: true,
      operatorNote: "Клиент настаивает на возврате — агенту запрещено обещать возврат без оператора.",
      // Claimed by another operator (Анна Смирнова, `members.js` id 2) with
      // an active lease — the "Взять диалог"/send conflict scenario: this
      // operator cannot claim or send until the owner releases or the lease
      // expires (see conversation 7 below for the expired case).
      handoff: { owner: { id: 2, name: "Анна Смирнова" }, leaseExpired: false },
      messages: [
        {
          id: 1,
          text: "Жду ответа по возврату средств, заказ #48213.",
          time: "11:40",
          outgoing: false,
        },
        {
          id: 2,
          text: "Подключаюсь к диалогу, уточняю статус возврата.",
          time: "11:41",
          outgoing: true,
          delivery: { status: "queued" },
        },
      ],
    },
    {
      id: 6,
      agentId: 3,
      contact: "Елена Кузнецова",
      initials: "ЕК",
      email: "e.kuznecova@example.com",
      channel: "Email",
      agent: "Support Bot",
      status: "Активен",
      updated: "1 мин",
      created: "Сегодня, 12:02",
      preview: "Уточните, пожалуйста, номер тикета.",
      awaitingOperator: true,
      operatorNote: "Повторное обращение по открытому тикету — агент передал оператору.",
      // Claimed by the current operator (`profile.js`, id 1) with an active
      // lease — the "Вернуть агенту" and allowed-send scenario.
      handoff: { owner: { id: 1, name: "Иван Петров" }, leaseExpired: false },
      messages: [
        {
          id: 1,
          text: "Уточните, пожалуйста, номер тикета по моему обращению.",
          time: "12:02",
          outgoing: false,
        },
        {
          id: 2,
          text: "Номер тикета — 10432, разбираюсь.",
          time: "12:03",
          outgoing: true,
          delivery: { status: "cancelled" },
        },
      ],
    },
    {
      id: 7,
      agentId: 2,
      contact: "Игорь Соколов",
      initials: "ИС",
      email: "i.sokolov@example.com",
      channel: "Telegram",
      agent: "Sales Assistant",
      status: "Активен",
      updated: "38 мин",
      created: "Сегодня, 10:50",
      preview: "Всё ещё жду расчёт по контракту.",
      awaitingOperator: true,
      operatorNote: "Оператор не ответил в течение согласованного времени — владение диалогом истекло.",
      // Owner is set (Анна Смирнова) but `leaseExpired: true` — a stale
      // lease anyone, including the previous owner, can reclaim without a
      // conflict (`ownsHandoff` deliberately returns `false` here).
      handoff: { owner: { id: 2, name: "Анна Смирнова" }, leaseExpired: true },
      messages: [
        {
          id: 1,
          text: "Всё ещё жду расчёт по контракту, вы обещали в течение часа.",
          time: "10:50",
          outgoing: false,
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
      handoff: { owner: null, leaseExpired: false },
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

/**
 * S2 per-conversation attention check (Task A10.4): a pure read of the
 * fixture's own `awaitingOperator` flag, mirroring
 * `getChannelsNeedingAttention` in `stores/channels.js` — never a second
 * source of truth.
 *
 * @param {Conversation} conversation
 * @returns {boolean}
 */
export function needsOperatorAttention(conversation) {
  return Boolean(conversation.awaitingOperator);
}

/** @type {ConversationHandoff} */
const DEFAULT_HANDOFF = { owner: null, leaseExpired: false };

/**
 * Whether `operatorId` currently holds an active lease on `conversation` —
 * the single ownership predicate every Task A10.5 guard below is built on
 * (mirrors get.3xtr.im's `iOwnLease` computed). Reads only
 * `awaitingOperator`/`handoff.owner`/`handoff.leaseExpired` — never message
 * timestamps, so lease state can't be spoofed by a stale `updated`/message
 * `time` string.
 *
 * @param {Conversation} conversation
 * @param {number | undefined} operatorId
 * @returns {boolean}
 */
export function ownsHandoff(conversation, operatorId) {
  const handoff = conversation.handoff ?? DEFAULT_HANDOFF;

  return Boolean(
    conversation.awaitingOperator
      && handoff.owner
      && operatorId !== undefined
      && handoff.owner.id === operatorId
      && !handoff.leaseExpired,
  );
}

/**
 * Whether the dialog can be claimed right now by *any* operator: it's
 * escalated, and either nobody holds the lease or the existing one is
 * stale. `false` while a different operator holds an active lease (the
 * conflict case) and `false` while the dialog isn't escalated at all
 * (nothing to claim).
 *
 * @param {Conversation} conversation
 * @returns {boolean}
 */
export function isHandoffClaimable(conversation) {
  const handoff = conversation.handoff ?? DEFAULT_HANDOFF;

  return Boolean(conversation.awaitingOperator) && (!handoff.owner || handoff.leaseExpired);
}

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
   * @typedef {Object} HandoffCommandResult
   * @property {boolean} ok
   * @property {"not-found" | "owned-by-another" | "lease-missing"} [reason]
   *   Absent when `ok` is `true`.
   * @property {ConversationHandoff} [handoff] Current (post-command) handoff
   *   state — present whenever the conversation was found, so a caller can
   *   render "who owns it right now" even on a conflict, without a second
   *   lookup (there is nothing to re-fetch: this store has no backend).
   */

  /**
   * Отправка сообщения (Task A5.7), Task A10.5: guarded by the handoff
   * lease when the dialog is escalated (`awaitingOperator`) — an operator
   * who doesn't currently own the lease gets `ok: false` instead of the
   * message being pushed, so a conflict never sends text under someone
   * else's name. Sending in a non-escalated dialog is unaffected (`ok:
   * true`, same push as before Task A10.5).
   *
   * @param {string} workspaceId
   * @param {number} conversationId
   * @param {string} text
   * @param {HandoffOwner} [operator] The acting operator — required only to
   *   evaluate the lease guard on an escalated dialog; a non-escalated
   *   dialog ignores it.
   * @returns {HandoffCommandResult}
   */
  function sendMessage(workspaceId, conversationId, text, operator) {
    const conversation = listByWorkspace(workspaceId)
      .find(({ id }) => id === conversationId);

    if (!conversation) {
      return { ok: false, reason: "not-found" };
    }

    if (conversation.awaitingOperator && !ownsHandoff(conversation, operator?.id)) {
      const handoff = conversation.handoff ?? DEFAULT_HANDOFF;
      const reason = handoff.owner && !handoff.leaseExpired ? "owned-by-another" : "lease-missing";

      return { ok: false, reason, handoff };
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

    return { ok: true };
  }

  /**
   * Переотправка сообщения со статусом `failed` — сбрасывает статус на
   * `delivered`, как и подобает фикстуре без сети (Task A5.7). Task A10.5:
   * only a message that is actually `failed` *and* `retryable` is retried —
   * the same guard `MessageDeliveryStatus.vue`'s button already applies,
   * repeated here so a direct store call can't bypass it and mutate a
   * `queued`/`sending`/`delivered`/`read`/`cancelled`, or non-retryable
   * `failed`, message.
   *
   * @param {string} workspaceId
   * @param {number} conversationId
   * @param {number} messageId
   */
  function retryMessageDelivery(workspaceId, conversationId, messageId) {
    const conversation = listByWorkspace(workspaceId)
      .find(({ id }) => id === conversationId);
    const message = conversation?.messages.find(({ id }) => id === messageId);

    if (!message?.delivery || message.delivery.status !== "failed" || !message.delivery.retryable) {
      return;
    }

    message.delivery = { status: "delivered" };
  }

  /**
   * «Взять диалог» (Task A10.5) — claims the handoff lease for `operator`.
   * A no-op success when `operator` already owns it; a conflict
   * (`ok: false, reason: "owned-by-another"`) when a *different* operator
   * holds an active (non-expired) lease — claiming never overwrites another
   * operator's active ownership. Also escalates the dialog
   * (`awaitingOperator = true`) if it wasn't already — mirrors
   * get.3xtr.im's `interfere()`, which escalates and acquires the lease in
   * one step.
   *
   * @param {string} workspaceId
   * @param {number} conversationId
   * @param {HandoffOwner} operator
   * @returns {HandoffCommandResult}
   */
  function claimHandoff(workspaceId, conversationId, operator) {
    const conversation = listByWorkspace(workspaceId)
      .find(({ id }) => id === conversationId);

    if (!conversation) {
      return { ok: false, reason: "not-found" };
    }

    if (ownsHandoff(conversation, operator.id)) {
      return { ok: true, handoff: conversation.handoff };
    }

    // Stage A10 review fix: a dialog that isn't escalated yet has nothing
    // to conflict with — `isHandoffClaimable` below deliberately returns
    // `false` for it (it's the *claim button's visibility* gate, unrelated
    // to whether claiming should succeed), so this must be checked first,
    // separately, to actually deliver the escalate-and-claim-in-one-step
    // behavior this function's own doc comment promises.
    if (!conversation.awaitingOperator) {
      conversation.awaitingOperator = true;
      conversation.handoff = { owner: { id: operator.id, name: operator.name }, leaseExpired: false };

      return { ok: true, handoff: conversation.handoff };
    }

    if (!isHandoffClaimable(conversation)) {
      return { ok: false, reason: "owned-by-another", handoff: conversation.handoff ?? DEFAULT_HANDOFF };
    }

    conversation.handoff = { owner: { id: operator.id, name: operator.name }, leaseExpired: false };

    return { ok: true, handoff: conversation.handoff };
  }

  /**
   * «Вернуть агенту» (Task A10.5) — releases the handoff lease back to the
   * agent (`awaitingOperator = false`, `owner: null`): the dialog is no
   * longer escalated at all, not merely unclaimed, mirroring get.3xtr.im's
   * `returnControl()`. Only the current active owner may release — a
   * conflict (`owned-by-another`) when someone else's active lease is in
   * place, `lease-missing` when the dialog isn't escalated or the caller's
   * own lease already expired.
   *
   * @param {string} workspaceId
   * @param {number} conversationId
   * @param {HandoffOwner} operator
   * @returns {HandoffCommandResult}
   */
  function releaseHandoff(workspaceId, conversationId, operator) {
    const conversation = listByWorkspace(workspaceId)
      .find(({ id }) => id === conversationId);

    if (!conversation) {
      return { ok: false, reason: "not-found" };
    }

    if (!ownsHandoff(conversation, operator.id)) {
      const handoff = conversation.handoff ?? DEFAULT_HANDOFF;
      const reason = conversation.awaitingOperator && handoff.owner && !handoff.leaseExpired
        ? "owned-by-another"
        : "lease-missing";

      return { ok: false, reason, handoff };
    }

    conversation.awaitingOperator = false;
    conversation.handoff = { owner: null, leaseExpired: false };

    return { ok: true, handoff: conversation.handoff };
  }

  return {
    conversationsByWorkspace,
    listByWorkspace,
    listByAgent,
    getConversation,
    sendMessage,
    retryMessageDelivery,
    claimHandoff,
    releaseHandoff,
  };
});
