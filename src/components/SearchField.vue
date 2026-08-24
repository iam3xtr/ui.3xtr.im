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

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from "vue";

type SearchPriority = "navbar" | "page";

const props = withDefaults(defineProps<{
  placeholder: string;
  ariaLabel?: string;
  priority?: SearchPriority;
}>(), {
  ariaLabel: undefined,
  priority: "page",
});

const emit = defineEmits<{
  shortcut: [];
}>();

const model = defineModel<string>({ required: true });
const searchInput = ref<{ focus: () => void } | null>(null);
const shortcutLabel = ref("Ctrl K");

function handleSearchShortcut(event: KeyboardEvent): void {
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
