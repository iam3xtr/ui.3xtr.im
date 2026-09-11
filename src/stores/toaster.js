import { useToast } from "buefy";
import { defineStore } from "pinia";

/**
 * Тонкий адаптер над `b-toast` (Task A4.5). Кит не заводит собственный
 * `Toaster.vue` — это прямой проброс `ToastProgrammatic` (Buefy) под общим
 * store-API, чтобы экраны вызывали уведомления одним и тем же способом
 * (`useToasterStore().success(...)`), а не импортировали `useToast` из
 * `buefy` по отдельности. Слой и позиционирование — штатные Buefy `.notices`,
 * согласованные с `--tr-z-toast` (см. docs/design-system.md#z-index-и-stacking).
 */
export const useToasterStore = defineStore("toaster", () => {
  const toast = useToast();

  /** @param {string | import("buefy").ToastOpenParams} options */
  function open(options) {
    return toast.open(options);
  }

  /** @param {string} message */
  function success(message) {
    return toast.open({ message, type: "is-success" });
  }

  /** @param {string} message */
  function error(message) {
    return toast.open({ message, type: "is-danger" });
  }

  /** @param {string} message */
  function info(message) {
    return toast.open({ message, type: "is-info" });
  }

  return {
    open,
    success,
    error,
    info,
  };
});
