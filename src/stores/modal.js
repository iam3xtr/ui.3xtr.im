import { useDialog } from "buefy";
import { defineStore } from "pinia";
import { reactive } from "vue";

/**
 * Тонкий адаптер над Buefy-оверлеями (Task A4.5). Кит не заводит собственных
 * `Modal.vue`/`ConfirmDialog.vue` — экраны продолжают рендерить штатные
 * `b-modal`/`b-sidebar` в своей разметке, но их открытым/закрытым состоянием
 * управляет этот store по строковому ключу, а не локальный `ref` на каждом
 * экране. Escape, focus-trap/return и scroll-lock остаются на стороне Buefy;
 * слои соответствуют `--tr-z-modal`/`--tr-z-sidebar`
 * (см. docs/design-system.md#z-index-и-stacking).
 *
 * Подтверждение опасного действия не привязано к ключу — это отдельный
 * программный вызов `b-dialog` (`DialogProgrammatic.confirm`), у него нет
 * декларативной разметки на экране.
 */
export const useModalStore = defineStore("modal", () => {
  /** @type {Record<string, boolean>} ключ оверлея → открыт/закрыт */
  const overlays = reactive({});

  /**
   * @param {string} id
   * @returns {boolean}
   */
  function isOpen(id) {
    return Boolean(overlays[id]);
  }

  /** @param {string} id */
  function open(id) {
    overlays[id] = true;
  }

  /** @param {string} id */
  function close(id) {
    overlays[id] = false;
  }

  /** @param {string} id */
  function toggle(id) {
    overlays[id] = !overlays[id];
  }

  const dialog = useDialog();

  /**
   * Программное подтверждение через `b-dialog`.
   * @param {import("buefy").DialogOpenParams} options
   */
  function confirm(options) {
    return dialog.confirm(options);
  }

  return {
    isOpen,
    open,
    close,
    toggle,
    confirm,
  };
});
