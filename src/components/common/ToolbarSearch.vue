<template>
  <div
    class="tr-search-field"
    :data-search-priority="priority"
  >
    <b-input
      ref="searchInput"
      v-model="model"
      icon="magnify"
      :placeholder="placeholder"
      :aria-label="ariaLabel ?? placeholder"
    />
    <kbd class="tr-search-field__shortcut">{{ shortcutLabel }}</kbd>
  </div>
</template>

<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref } from "vue";

/** @typedef {"navbar" | "page"} SearchPriority */

const props = defineProps({
  placeholder: {
    type: String,
    required: true,
  },
  ariaLabel: {
    type: String,
    default: undefined,
  },
  /** @type {import("vue").PropType<SearchPriority>} */
  priority: {
    type: String,
    default: "page",
  },
});

const emit = defineEmits(["shortcut"]);

const model = defineModel({ required: true });
const searchInput = ref(null);
const shortcutLabel = ref("Ctrl K");

function handleSearchShortcut(event) {
  if (
    !(event.ctrlKey || event.metaKey)
    || event.key.toLocaleLowerCase() !== "k"
  ) {
    return;
  }

  if (
    props.priority === "navbar"
    && document.querySelector('[data-search-priority="page"]')
  ) {
    return;
  }

  event.preventDefault();
  emit("shortcut");
  void nextTick(() => searchInput.value?.focus());
}

onMounted(() => {
  if (/Mac|iPhone|iPad|iPod/.test(navigator.platform)) {
    shortcutLabel.value = "⌘ K";
  }

  window.addEventListener("keydown", handleSearchShortcut);
});

onBeforeUnmount(() => {
  window.removeEventListener("keydown", handleSearchShortcut);
});
</script>
