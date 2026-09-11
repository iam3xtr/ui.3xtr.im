<template>
  <nav class="tr-navbar-tabs" :aria-label="ariaLabel">
    <RouterLink
      v-for="item in items"
      :key="item.label"
      :to="item.to"
      class="tr-navbar-tabs__link"
    >
      {{ item.label }}
    </RouterLink>
  </nav>
</template>

<script setup>
import { RouterLink } from "vue-router";

/**
 * @typedef {Object} NavbarTabItem
 * @property {string} label
 * @property {import("vue-router").RouteLocationRaw} to
 */

defineProps({
  /** @type {import("vue").PropType<NavbarTabItem[]>} */
  items: {
    type: Array,
    required: true,
  },
  ariaLabel: {
    type: String,
    default: "Навигационные вкладки",
  },
});
</script>
