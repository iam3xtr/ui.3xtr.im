import { defineStore } from "pinia";
import { ref } from "vue";

/**
 * @typedef {Object} ProfileInfo
 * @property {number} id Task A10.5: the current operator's identity for
 *   `stores/conversations.js`'s handoff owner/lease commands
 *   (`claimHandoff`/`releaseHandoff`/`sendMessage`'s guard) — matches
 *   `members.js`'s `demo` workspace owner entry (id 1, same name/email),
 *   the one workspace whose handoff fixtures model a real operator identity.
 * @property {string} name
 * @property {string} email
 * @property {boolean} emailVerified
 * @property {string} timezone
 * @property {string} language
 */

/**
 * @typedef {Object} ProfileSession
 * @property {number} id
 * @property {string} device
 * @property {string} location
 * @property {string} lastActive
 * @property {boolean} current
 */

/**
 * @typedef {Object} ProfileNotification
 * @property {number} id
 * @property {string} title
 * @property {string} message
 * @property {string} time
 * @property {boolean} read
 */

/**
 * @typedef {Object} ProfileNotificationPreference
 * @property {string} id
 * @property {string} label
 * @property {string} description
 * @property {boolean} enabled
 */

/**
 * Фикстуры личного профиля, сессий и уведомлений — потребитель:
 * `src/components/profile/{Settings,Security}.vue` (Task A5.9). Нет
 * бэкенда — синхронный in-memory state (Stage A5.2).
 */
const initialProfile = {
  id: 1,
  name: "Иван Петров",
  email: "ivan.petrov@example.com",
  emailVerified: true,
  timezone: "Europe/Moscow",
  language: "Русский",
};

/** Варианты для `b-select` на `/profile` (`Settings.vue`). */
export const PROFILE_TIMEZONES = [
  "Europe/Moscow",
  "Europe/Kaliningrad",
  "Asia/Yekaterinburg",
  "Asia/Novosibirsk",
];

/** @type {string[]} */
export const PROFILE_LANGUAGES = ["Русский", "English"];

/** @type {ProfileSession[]} */
const initialSessions = [
  {
    id: 1,
    device: "Chrome · Windows 11",
    location: "Москва, Россия",
    lastActive: "Сейчас",
    current: true,
  },
  {
    id: 2,
    device: "Safari · iPhone",
    location: "Санкт-Петербург, Россия",
    lastActive: "Вчера",
    current: false,
  },
  {
    id: 3,
    device: "Корпоративный VPN-клиент удалённого рабочего стола на "
      + "виртуальной машине филиала",
    location: "Новосибирск, Россия",
    lastActive: "12 дней назад",
    current: false,
  },
];

/** @type {ProfileNotification[]} */
const initialNotifications = [
  {
    id: 1,
    title: "Конфигурация агента сохранена",
    message: "Изменения инструкций «Консультанта» вступили в силу.",
    time: "10 мин",
    read: false,
  },
  {
    id: 2,
    title: "Лимит хранилища знаний использован на 82%",
    message: "Освободите место или расширьте тариф пространства.",
    time: "Вчера",
    read: false,
  },
  {
    id: 3,
    title: "Новый участник присоединился к пространству",
    message: "Анна Смирнова приняла приглашение и получила роль "
      + "«Администратор».",
    time: "3 дня назад",
    read: true,
  },
];

/**
 * Переключатели уведомлений на `/profile` (`Settings.vue`) — отдельная
 * фикстура от `notifications` (лента событий; фикстура заведена в Task A5.2
 * для ещё не собранного потребителя и пока не используется нигде в `src/` —
 * `Navbar.vue`'s bell dropdown рендерит свой собственный локальный массив, а
 * не этот стор). `initialNotificationPreferences` — первый реальный
 * потребитель `.tr-settings__panel-header`/`.tr-settings__option*` (см.
 * `docs/design-system.md`, «Допустимые исключения из «нет tr-* без
 * потребителя»»); `.tr-settings__header`/`.tr-settings__panel-footer` так и
 * не нашли потребителя за Stage A5 и удалены из стилей (Task A5.11).
 * @type {ProfileNotificationPreference[]}
 */
const initialNotificationPreferences = [
  {
    id: "weekly-digest",
    label: "Еженедельный дайджест",
    description: "Сводка активности агентов и диалогов по понедельникам.",
    enabled: true,
  },
  {
    id: "agent-alerts",
    label: "Оповещения об ошибках агентов",
    description: "Письмо при сбое доставки сообщения или ошибке канала.",
    enabled: true,
  },
  {
    id: "product-updates",
    label: "Новости продукта",
    description: "Анонсы новых функций и изменений тарифов.",
    enabled: false,
  },
];

export const useProfileStore = defineStore("profile", () => {
  /** @type {import("vue").Ref<ProfileInfo>} */
  const profile = ref({ ...initialProfile });
  /** @type {import("vue").Ref<ProfileSession[]>} */
  const sessions = ref(structuredClone(initialSessions));
  /** @type {import("vue").Ref<ProfileNotification[]>} */
  const notifications = ref(structuredClone(initialNotifications));
  /** @type {import("vue").Ref<ProfileNotificationPreference[]>} */
  const notificationPreferences = ref(structuredClone(initialNotificationPreferences));

  /**
   * @param {Partial<ProfileInfo>} patch
   */
  function updateProfile(patch) {
    Object.assign(profile.value, patch);
  }

  /**
   * @param {number} sessionId
   */
  function revokeSession(sessionId) {
    sessions.value = sessions.value.filter(
      (session) => session.current || session.id !== sessionId,
    );
  }

  /**
   * @param {number} notificationId
   */
  function markNotificationRead(notificationId) {
    const notification = notifications.value.find(({ id }) => id === notificationId);

    if (notification) {
      notification.read = true;
    }
  }

  function markAllNotificationsRead() {
    notifications.value.forEach((notification) => {
      notification.read = true;
    });
  }

  /**
   * @param {string} preferenceId
   */
  function toggleNotificationPreference(preferenceId) {
    const preference = notificationPreferences.value.find(
      ({ id }) => id === preferenceId,
    );

    if (preference) {
      preference.enabled = !preference.enabled;
    }
  }

  return {
    profile,
    sessions,
    notifications,
    notificationPreferences,
    updateProfile,
    revokeSession,
    markNotificationRead,
    markAllNotificationsRead,
    toggleNotificationPreference,
  };
});
