import { computed, ref, watch } from "vue";

const STORAGE_PREFIX = "trickster-ui-kit:dashboard-attention:dismissed:";

function readDismissedKeys(workspaceId) {
  if (typeof window === "undefined" || !workspaceId) {
    return new Set();
  }
  try {
    const raw = window.sessionStorage.getItem(`${STORAGE_PREFIX}${workspaceId}`);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function writeDismissedKeys(workspaceId, keys) {
  if (typeof window === "undefined" || !workspaceId) {
    return;
  }
  try {
    window.sessionStorage.setItem(`${STORAGE_PREFIX}${workspaceId}`, JSON.stringify([...keys]));
  } catch {
    // sessionStorage may be unavailable (private mode/quota) — a dismiss
    // then simply doesn't survive a reload within this tab, it still works
    // for the current in-memory session.
  }
}

/**
 * Session-scoped attention queue (Issue #13.1, `.todo` "Dashboard attention
 * queue"): turns the S2 "Требует внимания" derivation (`Dashboard.vue`'s
 * `attentionItems`) into a single active card with manual previous/next and
 * a temporary dismiss, without touching how a reason itself is derived or
 * resolved — this composable only ever filters/reorders the list it is
 * given.
 *
 * Isolation is `workspace + browser session`: a distinct `sessionStorage`
 * key per workspace, and `sessionStorage` itself already scopes to the
 * current tab/browser session (cleared when that session ends) — so a
 * dismiss in one workspace, or in one browser tab, never hides anything in
 * another.
 *
 * Active item selection is key-stable, not index-stable: as long as the
 * currently active item's `key` is still present after a source update, it
 * stays active even if its position in the list moved. Only when that key
 * disappears (source removal or a dismiss) does the queue fall back to the
 * neighbour at the same list position (clamped to the new length) — this is
 * the "после этого выбирается соседний" requirement.
 *
 * Navigation is boundary-disabled, not wrapping: `hasPrevious`/`hasNext` are
 * `false` at the ends instead of cycling back around, so the exposed
 * position ("N из M") always matches a real linear step and never jumps.
 *
 * @param {import("vue").Ref<Array<{ key: string }>>} itemsRef Source items,
 *   untouched — this composable never mutates or reorders it.
 * @param {import("vue").Ref<string>} workspaceIdRef
 */
export function useDashboardAttentionQueue(itemsRef, workspaceIdRef) {
  const dismissedKeys = ref(readDismissedKeys(workspaceIdRef.value));
  const activeKey = ref(null);
  let lastIndex = 0;

  watch(workspaceIdRef, (workspaceId) => {
    dismissedKeys.value = readDismissedKeys(workspaceId);
    activeKey.value = null;
    lastIndex = 0;
  });

  const visibleItems = computed(
    () => itemsRef.value.filter((item) => !dismissedKeys.value.has(item.key)),
  );

  // Resolve/repair the active key whenever the visible list changes,
  // whether that's a source update, a dismiss or a restore.
  watch(visibleItems, (list) => {
    if (list.length === 0) {
      activeKey.value = null;
      lastIndex = 0;
      return;
    }
    const idx = list.findIndex((item) => item.key === activeKey.value);
    if (idx !== -1) {
      lastIndex = idx;
      return;
    }
    const fallbackIndex = Math.min(lastIndex, list.length - 1);
    activeKey.value = list[fallbackIndex].key;
    lastIndex = fallbackIndex;
  }, { immediate: true });

  const activeIndex = computed(
    () => visibleItems.value.findIndex((item) => item.key === activeKey.value),
  );
  const activeItem = computed(() => {
    const idx = activeIndex.value;
    return idx === -1 ? null : visibleItems.value[idx];
  });

  const total = computed(() => visibleItems.value.length);
  const position = computed(() => (activeIndex.value === -1 ? 0 : activeIndex.value + 1));
  const hasPrevious = computed(() => activeIndex.value > 0);
  const hasNext = computed(() => activeIndex.value !== -1 && activeIndex.value < total.value - 1);

  // Only counts dismissed keys that still correspond to a real source item
  // — a collection/channel/conversation that disappeared on its own while
  // dismissed doesn't linger in the "N скрыто" count.
  const hiddenCount = computed(
    () => itemsRef.value.filter((item) => dismissedKeys.value.has(item.key)).length,
  );

  function goPrevious() {
    if (!hasPrevious.value) {
      return;
    }
    const targetIndex = activeIndex.value - 1;
    activeKey.value = visibleItems.value[targetIndex].key;
    lastIndex = targetIndex;
  }

  function goNext() {
    if (!hasNext.value) {
      return;
    }
    const targetIndex = activeIndex.value + 1;
    activeKey.value = visibleItems.value[targetIndex].key;
    lastIndex = targetIndex;
  }

  function dismissActive() {
    const item = activeItem.value;
    if (!item) {
      return;
    }
    const next = new Set(dismissedKeys.value);
    next.add(item.key);
    dismissedKeys.value = next;
    writeDismissedKeys(workspaceIdRef.value, next);
  }

  function restoreHidden() {
    dismissedKeys.value = new Set();
    writeDismissedKeys(workspaceIdRef.value, new Set());
  }

  return {
    activeItem,
    position,
    total,
    hasPrevious,
    hasNext,
    hiddenCount,
    goPrevious,
    goNext,
    dismissActive,
    restoreHidden,
  };
}
