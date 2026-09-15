import { onBeforeUnmount, onMounted, ref } from "vue";
import { onBeforeRouteLeave } from "vue-router";

/**
 * Dirty-exit guard for route navigation and tab close (Task A10.1). A dirty
 * form must never lose input on a route change, workspace switch or locale
 * change without an explicit choice — «Сохранить / Выйти без сохранения /
 * Остаться» (`.todo`, Stage A10 «Явное сохранение и безопасное
 * редактирование»). This composable owns only the three-way decision and
 * the two exit points (in-app navigation, `beforeunload`); the actual
 * confirm dialog markup is the shared `common/DirtyExitModal.vue`, and the
 * save/discard actions themselves stay with the form (usually
 * `useSavableForm`'s `save`/`reset`).
 *
 * @param {object} options
 * @param {import("vue").Ref<boolean> | (() => boolean)} options.isDirty
 * @param {() => (Promise<{ ok: boolean }> | { ok: boolean })} options.onSave
 *   Must resolve `{ ok: true }` only once the save actually succeeded —
 *   an error/conflict result keeps the guard open rather than leaving.
 * @param {() => void} options.onDiscard
 */
export function useDirtyExitGuard({ isDirty, onSave, onDiscard }) {
  const active = ref(false);
  let resolveLeave = null;

  function dirty() {
    return typeof isDirty === "function" ? isDirty() : isDirty.value;
  }

  function requestLeave() {
    return new Promise((resolve) => {
      resolveLeave = resolve;
      active.value = true;
    });
  }

  function settle(canLeave) {
    active.value = false;
    const resolve = resolveLeave;
    resolveLeave = null;
    resolve?.(canLeave);
  }

  async function confirmSave() {
    const result = await onSave();
    settle(Boolean(result?.ok));
  }

  function confirmDiscard() {
    onDiscard?.();
    settle(true);
  }

  function stay() {
    settle(false);
  }

  onBeforeRouteLeave(() => {
    if (!dirty()) {
      return true;
    }
    return requestLeave();
  });

  function handleBeforeUnload(event) {
    if (!dirty()) {
      return;
    }
    event.preventDefault();
    // Chrome requires `returnValue` to be set for the native prompt to show.
    event.returnValue = "";
  }

  onMounted(() => {
    if (typeof window !== "undefined") {
      window.addEventListener("beforeunload", handleBeforeUnload);
    }
  });

  onBeforeUnmount(() => {
    if (typeof window !== "undefined") {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    }
  });

  return {
    active,
    confirmSave,
    confirmDiscard,
    stay,
  };
}
