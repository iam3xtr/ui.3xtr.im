import { defineStore } from "pinia";
import { ref } from "vue";

/**
 * @typedef {Object} NotificationTarget
 * @property {boolean} available `false` models a deleted/unavailable target
 *   (e.g. the agent/conversation the notification pointed at is gone) — the
 *   consuming screen (`profile/NotificationHistory.vue`) renders that case as
 *   plain text instead of a link, never a broken navigation.
 * @property {import("vue-router").RouteLocationRaw} [to] Present only when
 *   `available` is `true`.
 */

/**
 * @typedef {Object} WorkspaceNotification
 * @property {string} id
 * @property {string} title
 * @property {string} description
 * @property {string} time
 * @property {string[]} readBy Recipient ids that have read this entry — see
 *   `DEFAULT_RECIPIENT_ID` below. Read is per-recipient and never deletes the
 *   entry (Task A10.8 acceptance: "read не удаляет запись").
 * @property {NotificationTarget | null} [target] `null`/absent — a purely
 *   informational entry with no linked object.
 */

/**
 * Default recipient every existing caller (`Navbar.vue`'s bell,
 * `profile/NotificationHistory.vue`) reads/marks as when it does not pass its
 * own id — models "the current user" without a real auth/session store. A
 * second, explicit recipient id (e.g. `"colleague"`) is only ever passed by
 * tests to prove one recipient's read does not change another's — see
 * `tests/unit/stores/notifications.test.js`.
 * @type {string}
 */
export const DEFAULT_RECIPIENT_ID = "me";

/**
 * Fixture-уведомления по id рабочего пространства (Task A8.2, extended Task
 * A10.8 with per-recipient read state, deleted/unavailable targets and a
 * longer `demo` list for pagination) — изолированный store, не привязанный к
 * `useWorkspaceStore()`: `Navbar.vue`/`profile/NotificationHistory.vue` сами
 * передают активный `workspace.value` (и, для History, получателя) в
 * геттеры/действия ниже. Рабочее пространство, для которого нет записи (в
 * т.ч. любое созданное `createWorkspace()` в `stores/workspace.js`), по
 * умолчанию не несёт уведомлений — см. `notificationsFor`.
 * @type {Record<string, WorkspaceNotification[]>}
 */
const FIXTURE_NOTIFICATIONS_BY_WORKSPACE = {
  demo: [
    {
      id: "demo-1",
      title: "Новый диалог",
      description: "Анна начала диалог с агентом «Консультант».",
      time: "5 минут назад",
      readBy: [],
      target: { available: true, to: { name: "conversations" } },
    },
    {
      id: "demo-2",
      title: "Агент обновлён",
      description: "Настройки агента «Sales Assistant» сохранены.",
      time: "1 час назад",
      readBy: [],
      target: { available: true, to: { name: "agents" } },
    },
    {
      id: "demo-3",
      title: "Участник приглашён",
      description: "В пространство отправлено новое приглашение.",
      time: "Вчера",
      readBy: [DEFAULT_RECIPIENT_ID],
      target: { available: true, to: { name: "workspace-members" } },
    },
    {
      id: "demo-4",
      title: "Материал знаний удалён",
      description: "Файл «Тарифы 2025.pdf» больше недоступен — его удалил владелец коллекции.",
      time: "2 дня назад",
      readBy: [],
      // Deleted target (Task A10.8 acceptance): the source collection this
      // notification pointed at no longer exists — History renders this as
      // plain text, never a dangling link.
      target: { available: false },
    },
    {
      id: "demo-5",
      title: "Канал недоступен",
      description: "Канал «Telegram» агента «Консультант» потерял соединение.",
      time: "3 дня назад",
      readBy: [DEFAULT_RECIPIENT_ID],
      target: { available: true, to: { name: "agent-channels", params: { id: "1" } } },
    },
    {
      id: "demo-6",
      title: "Лимит диалогов почти исчерпан",
      description: "Использовано 92% месячного лимита активных диалогов пространства.",
      time: "4 дня назад",
      readBy: [],
      target: { available: true, to: { name: "workspace-plans" } },
    },
    {
      id: "demo-7",
      title: "Диалог передан оператору",
      description: "Агент «Консультант» передал диалог с Ольгой оператору.",
      time: "5 дней назад",
      readBy: [DEFAULT_RECIPIENT_ID],
      target: { available: true, to: { name: "conversations" } },
    },
    {
      id: "demo-8",
      title: "Настройки пространства изменены",
      description: "Название пространства обновлено владельцем.",
      time: "Неделю назад",
      readBy: [DEFAULT_RECIPIENT_ID],
      target: { available: true, to: { name: "workspace-settings" } },
    },
  ],
  trickster: [
    {
      id: "trickster-1",
      title: "Тариф обновлён",
      description: "Пространство «Trickster Team» перешло на план Superior.",
      time: "2 часа назад",
      readBy: [],
      target: { available: true, to: { name: "workspace-plans" } },
    },
  ],
  empty: [],
};

/**
 * Уведомления Navbar (Task A8.2): kit-only fixture-состояние, отдельное от
 * `stores/workspace.js`. Колокольчик в `Navbar.vue` существует только пока у
 * активного пространства есть хотя бы одно непрочитанное уведомление —
 * поэтому store отдаёт не только сам список, но и производный
 * `unreadCountFor`, и действие прочтения (`markRead`/`markAllRead`),
 * которое реактивно обновляет это же fixture-состояние без обращения к
 * сети — см. `docs/design-system.md`, «Уведомления Navbar (только кит)».
 *
 * Task A10.8 добавляет постоянную route-backed «Историю уведомлений»
 * (`profile/NotificationHistory.vue`) над тем же fixture-состоянием: read
 * стал per-recipient (`readBy`), запись никогда не удаляется при read, а
 * `markAllRead` — snapshot-операция (затрагивает только уже загруженный на
 * момент вызова список, а не будущие уведомления, добавленные позже, — см.
 * `receiveNotification`, используемый только тестами/демо-сценарием).
 */
export const useNotificationsStore = defineStore("notifications", () => {
  // Глубокая копия на каждый стор (а не общая ссылка на модульную константу)
  // — иначе `markRead`/`markAllRead` одного теста/сессии портили бы фикстуру
  // для следующего инстанса стора.
  const notificationsByWorkspace = ref(
    JSON.parse(JSON.stringify(FIXTURE_NOTIFICATIONS_BY_WORKSPACE)),
  );

  /**
   * @param {string} workspaceId
   * @returns {WorkspaceNotification[]} Raw fixture entries (`readBy` intact).
   */
  function rawNotificationsFor(workspaceId) {
    return notificationsByWorkspace.value[workspaceId] ?? [];
  }

  /**
   * @param {string} workspaceId
   * @param {string} [recipientId]
   * @returns {(WorkspaceNotification & { read: boolean })[]} Same entries,
   *   projected with a `read` flag for the given recipient — the shape every
   *   consumer (`Navbar.vue`, `profile/NotificationHistory.vue`) renders.
   */
  function notificationsFor(workspaceId, recipientId = DEFAULT_RECIPIENT_ID) {
    return rawNotificationsFor(workspaceId).map((item) => ({
      ...item,
      read: item.readBy.includes(recipientId),
    }));
  }

  /**
   * @param {string} workspaceId
   * @param {string} [recipientId]
   * @returns {number}
   */
  function unreadCountFor(workspaceId, recipientId = DEFAULT_RECIPIENT_ID) {
    return notificationsFor(workspaceId, recipientId)
      .filter((item) => !item.read).length;
  }

  /**
   * @param {string} workspaceId
   * @param {string} notificationId
   * @param {string} [recipientId]
   */
  function markRead(workspaceId, notificationId, recipientId = DEFAULT_RECIPIENT_ID) {
    const notification = rawNotificationsFor(workspaceId)
      .find((item) => item.id === notificationId);

    if (notification && !notification.readBy.includes(recipientId)) {
      notification.readBy.push(recipientId);
    }
  }

  /**
   * Read-all — a snapshot operation over the entries loaded at call time
   * only (Task A10.8 acceptance: "read-all относится к увиденному snapshot;
   * новое уведомление остаётся непрочитанным"). Any entry added afterwards
   * via `receiveNotification` is untouched by this call, since it iterates
   * the array as it stands right now.
   * @param {string} workspaceId
   * @param {string} [recipientId]
   */
  function markAllRead(workspaceId, recipientId = DEFAULT_RECIPIENT_ID) {
    rawNotificationsFor(workspaceId).forEach((item) => {
      if (!item.readBy.includes(recipientId)) {
        item.readBy.push(recipientId);
      }
    });
  }

  /**
   * Appends a brand-new, always-unread entry — kit-only helper used to
   * exercise the read-all snapshot guarantee above (no real push mechanism
   * exists in this repository). Not wired to any UI trigger.
   * @param {string} workspaceId
   * @param {Omit<WorkspaceNotification, "readBy">} notification
   */
  function receiveNotification(workspaceId, notification) {
    if (!notificationsByWorkspace.value[workspaceId]) {
      notificationsByWorkspace.value[workspaceId] = [];
    }

    notificationsByWorkspace.value[workspaceId].unshift({ ...notification, readBy: [] });
  }

  return {
    notificationsByWorkspace,
    notificationsFor,
    unreadCountFor,
    markRead,
    markAllRead,
    receiveNotification,
  };
});
