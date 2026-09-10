<template>
  <component
    :is="IconComp"
    v-if="IconComp"
    :style="props.size != 24 ? { width: pxSize, height: pxSize } : ''"
    :class="['icon', 'tr-icon', $attrs.class]"
    v-bind="$attrs"
  />
  <span
    v-else
    class="icon tr-icon--placeholder"
    :style="{ width: pxSize, height: pxSize }"
    aria-hidden="true"
  />
</template>

<script setup>
import { computed } from "vue";

// Реестр кастомных SVG-иконок кита: вендоры LLM и виды моделей — то, чему
// нет эквивалента в MDI (см. docs/design-system.md#иконки). Всё остальное —
// b-icon с MDI-именем.
const props = defineProps({
  name: {
    type: String,
    required: true,
  },
  size: {
    type: [Number, String],
    default: 24,
  },
});

const registry = import.meta.glob("@/assets/icons/**/*.svg", { eager: true });

const IconComp = computed(() => {
  const mod = registry[`/src/assets/icons/${props.name}.svg`];
  return mod ? mod.default || mod : null;
});

const pxSize = computed(() => {
  return typeof props.size === "number" ? `${props.size}px` : props.size;
});
</script>
