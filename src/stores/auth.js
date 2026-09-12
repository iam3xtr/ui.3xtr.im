import { defineStore } from "pinia";
import { ref } from "vue";

/**
 * @typedef {Object} PendingInvite
 * @property {string} token
 * @property {"workspace" | "registration"} kind
 * @property {string} workspaceName
 */

/**
 * Фикстурный auth-стор для Task A5.10 (`/auth/*`). Кит не имеет бэкенда и
 * сессии (см. `AGENTS.md`/`CLAUDE.md`, «Backend changes»), поэтому
 * `login`/`signup` — промисы с искусственной задержкой
 * (`window.setTimeout`, без `fetch`/`axios`) вместо реального запроса, а не
 * заглушки, которые сразу резолвятся: это даёт формам показать состояние
 * загрузки, как и остальной кит (см. `useSimulatedLoading`).
 *
 * `pendingInvite` — упрощённый аналог in-memory continuation кабинета
 * (`get.3xtr.im/src/modules/auth/store.js`, `pendingInviteToken/Kind/Workspace`):
 * тот же принцип «токен живёт только в памяти», но без localStorage/cookie —
 * кит и так ничего не сохраняет между перезагрузками.
 */
export const useAuthStore = defineStore("auth", () => {
  /** Единственный демо-аккаунт, с которым `LoginView` признаёт вход успешным. */
  const DEMO_CREDENTIALS = {
    email: "demo@3xtr.im",
    password: "trickster123",
  };

  /** @type {import("vue").Ref<PendingInvite | null>} */
  const pendingInvite = ref(null);

  /** @param {Partial<PendingInvite>} patch */
  function setPendingInvite(patch) {
    pendingInvite.value = { ...pendingInvite.value, ...patch };
  }

  function clearPendingInvite() {
    pendingInvite.value = null;
  }

  /**
   * Fixture logout (Task A8.7): the kit has no session to invalidate, so this
   * only clears the in-memory continuation state a real logout would also
   * drop — no API call, no token, no persistence. `App.vue`'s `@logout`
   * handler calls this before navigating to `auth-login`.
   */
  function logout() {
    clearPendingInvite();
  }

  /**
   * @param {{ email: string, password: string }} credentials
   * @returns {Promise<void>}
   */
  function login({ email, password }) {
    return new Promise((resolve, reject) => {
      window.setTimeout(() => {
        if (email === DEMO_CREDENTIALS.email && password === DEMO_CREDENTIALS.password) {
          resolve();
        } else {
          reject(new Error(
            `Неверный email или пароль. Демо-доступ: ${DEMO_CREDENTIALS.email} / ${DEMO_CREDENTIALS.password}`,
          ));
        }
      }, 500);
    });
  }

  /**
   * Регистрация всегда «успешна» — кит не хранит пользователей, поэтому
   * подтверждать уникальность email не с чем.
   * @param {Record<string, unknown>} _payload
   * @returns {Promise<void>}
   */
  function signup(_payload) {
    return new Promise((resolve) => {
      window.setTimeout(resolve, 500);
    });
  }

  return {
    DEMO_CREDENTIALS,
    pendingInvite,
    setPendingInvite,
    clearPendingInvite,
    login,
    signup,
    logout,
  };
});
