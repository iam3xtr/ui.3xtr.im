<template>
  <nav class="tr-toolbar-tabs" :aria-label="ariaLabel">
    <RouterLink
      v-for="item in items"
      :key="item.label"
      :to="item.to"
      class="tr-toolbar-tabs__link"
    >
      {{ item.label }}
    </RouterLink>
  </nav>
</template>

<script setup lang="ts">
import { RouterLink, type RouteLocationRaw } from "vue-router";

export interface ToolbarTabItem {
  label: string;
  to: RouteLocationRaw;
}

withDefaults(defineProps<{
  items: ToolbarTabItem[];
  ariaLabel?: string;
}>(), {
  ariaLabel: "Навигационные вкладки",
});
</script>
