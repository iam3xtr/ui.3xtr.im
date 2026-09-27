<template>
  <b-dropdown
    :key="placement"
    ref="dropdownRef"
    v-bind="$attrs"
    :position="positionRef"
    :append-to-body="appendToBody"
    @active-change="onActiveChange"
  >
    <template v-for="(_, name) in $slots" #[name]="slotProps">
      <slot :name="name" v-bind="slotProps ?? {}" />
    </template>
  </b-dropdown>
</template>

<script setup>
import { computed, nextTick, onMounted, ref, useTemplateRef, watch } from "vue";
import { resolveDropdownPlacement, useDropdownOverlay } from "@iam3xtr/vue";

/**
 * Demo adapter that binds the public `@iam3xtr/vue` `useDropdownOverlay`
 * composable to a plain Buefy `b-dropdown`, for the audited demo dropdowns
 * whose markup is owned by the demo (`ApiKeySelect`, Navbar desktop menus,
 * knowledge `Files`, kit table row actions). Package components
 * (`ToolbarDropdown`, `MobileFilters`, `ModelSelect`) wire the same
 * composable internally; this file only repeats that wiring for demo
 * markup and adds no styles or behaviour of its own.
 *
 * - `position` seeds the preferred Buefy position; the composable flips
 *   `is-bottom-*` ↔ `is-top-*` at the viewport edge and on scroll/resize.
 * - The placement is resolved once mounted (`resolveDropdownPlacement`):
 *   inline by default, a body portal when an ancestor clips overflow, and
 *   an in-place fixed menu inside a clipping modal/drawer. Switching it
 *   remounts `b-dropdown` through `key`, because Buefy creates its body
 *   wrapper only in `mounted()`.
 * - Every other attribute, `v-model` and all slots pass through to
 *   `b-dropdown`; `active-change` is re-emitted. Buefy keeps its own
 *   Escape, outside-click, focus trap and mobile-modal handling.
 * - Exposes `close()` for custom items that open a modal, and `dropdown`
 *   (the Buefy instance) for callers that need its rendered menu.
 */
defineOptions({ inheritAttrs: false });

const props = defineProps({
  position: {
    type: String,
    default: "is-bottom-left",
  },
});

const emit = defineEmits(["active-change"]);

const dropdownRef = useTemplateRef("dropdownRef");
const triggerRef = ref(/** @type {HTMLElement|null} */ (null));
const wrapperRef = ref(/** @type {HTMLElement|null} */ (null));
const menuRef = ref(/** @type {HTMLElement|null} */ (null));
const isActive = ref(false);
const positionRef = ref(props.position);

watch(() => props.position, (next) => {
  positionRef.value = next;
});

const placement = ref(/** @type {"inline"|"fixed"|"portal"} */ ("inline"));
const appendToBody = computed(() => placement.value === "portal");
const pinnedInPlace = computed(() => placement.value === "fixed");

onMounted(() => {
  placement.value = resolveDropdownPlacement(dropdownRef.value?.$el ?? null);
});

// Buefy does not expose its trigger/menu nodes publicly beyond
// `$refs.dropdownMenu`; in portal mode that node is moved into a body-side
// `.dropdown` wrapper, which is where the portal marker belongs.
function refreshRefs() {
  const instance = dropdownRef.value;
  if (!instance) return;
  const rootEl = instance.$el;
  const trigger = rootEl?.querySelector?.(".dropdown-trigger");
  if (trigger) triggerRef.value = trigger;
  const menu = instance.$refs?.dropdownMenu
    ?? rootEl?.querySelector?.(".dropdown-menu")
    ?? null;
  menuRef.value = menu;
  wrapperRef.value = menu?.closest?.(".dropdown") ?? rootEl ?? null;
}

useDropdownOverlay({
  triggerRef,
  menuRef,
  wrapperRef,
  activeRef: isActive,
  positionRef,
  appendToBody,
  fixed: pinnedInPlace,
});

async function onActiveChange(next) {
  emit("active-change", next);
  // Refresh the element refs after Buefy's own `nextTick`-deferred DOM
  // work, before the composable measures on its next ticks.
  await nextTick();
  refreshRefs();
  isActive.value = !!next;
}

function close() {
  const instance = dropdownRef.value;
  if (instance?.isActive) {
    instance.isActive = false;
  }
}

defineExpose({
  close,
  dropdown: dropdownRef,
});
</script>
