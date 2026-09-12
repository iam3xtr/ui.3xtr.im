import { defineStore } from "pinia";
import { ref } from "vue";

/**
 * @typedef {Object} WorkspaceNotification
 * @property {string} id
 * @property {string} title
 * @property {string} description
 * @property {string} time
 * @property {boolean} read
 */

/**
 * Fixture-уведомления по id рабочего пространства (Task A8.2) —
 * изолированный store, не привязанный к `useWorkspaceStore()`: `Navbar.vue`
 * сам передаёт активный `workspace.value` в геттеры/действия ниже. Рабочее
 * пространство, для которого нет записи (в т.ч. любое созданное
 * `createWorkspace()` в `stores/workspace.js`), по умолчанию не несёт
 * уведомлений — см. `notificationsFor`.
 * @type {Record<string, WorkspaceNotification[]>}
 */
const FIXTURE_NOTIFICATIONS_BY_WORKSPACE = {
  demo: [
    {
      id: "demo-1",
      title: "Новый диалог",
      description: "Анна начала диалог с агентом «Консультант».",
      time: "5 минут назад",
      read: false,
    },
    {
      id: "demo-2",
      title: "Агент обновлён",
      description: "Настройки агента «Sales Assistant» сохранены.",
      time: "1 час назад",
      read: false,
    },
    {
      id: "demo-3",
      title: "Участник приглашён",
      description: "В пространство отправлено новое приглашение.",
      time: "Вчера",
      read: true,
    },
  ],
  trickster: [
    {
      id: "trickster-1",
      title: "Тариф обновлён",
      description: "Пространство «Trickster Team» перешло на план Superior.",
      time: "2 часа назад",
      read: false,
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
   * @returns {WorkspaceNotification[]}
   */
  function notificationsFor(workspaceId) {
    return notificationsByWorkspace.value[workspaceId] ?? [];
  }

  /**
   * @param {string} workspaceId
   * @returns {number}
   */
  function unreadCountFor(workspaceId) {
    return notificationsFor(workspaceId).filter((item) => !item.read).length;
  }

  /**
   * @param {string} workspaceId
   * @param {string} notificationId
   */
  function markRead(workspaceId, notificationId) {
    const notification = notificationsFor(workspaceId)
      .find((item) => item.id === notificationId);

    if (notification) {
      notification.read = true;
    }
  }

  /** @param {string} workspaceId */
  function markAllRead(workspaceId) {
    notificationsFor(workspaceId).forEach((item) => {
      item.read = true;
    });
  }

  return {
    notificationsByWorkspace,
    notificationsFor,
    unreadCountFor,
    markRead,
    markAllRead,
  };
});
