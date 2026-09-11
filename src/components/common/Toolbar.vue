<template>
  <div class="tr-page-toolbar">
    <ToolbarSearch
      v-if="search !== undefined"
      v-model="query"
      class="tr-page-toolbar__search"
      :placeholder="searchPlaceholder"
      :aria-label="searchAriaLabel"
      @shortcut="emit('shortcut')"
    />

    <div v-if="$slots.filters" class="tr-action-group tr-page-toolbar__filters">
      <slot name="filters" />
    </div>

    <!-- Below the .tr-page-toolbar__filter breakpoint (trickster-buefy.scss)
         the inline filter pills above are hidden by CSS; this trigger/panel
         is the only way to reach them, so the same filters slot is rendered
         a second time here instead of wrapping to a second toolbar row. -->
    <MobileFilters v-if="$slots.filters" :active="filtersActive">
      <slot name="filters" />
    </MobileFilters>

    <div v-if="$slots.actions || $slots.default" class="tr-action-group">
      <slot name="actions">
        <slot />
      </slot>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";

import MobileFilters from "./MobileFilters.vue";
import ToolbarSearch from "./ToolbarSearch.vue";

const props = defineProps({
  search: {
    type: String,
    default: undefined,
  },
  searchPlaceholder: {
    type: String,
    default: "",
  },
  searchAriaLabel: {
    type: String,
    default: undefined,
  },
  // Lets a consumer flag the mobile filters trigger as "has active filters" —
  // Toolbar itself has no visibility into the filters slot's own state.
  filtersActive: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["update:search", "shortcut"]);

// ToolbarSearch's own v-model (defineModel) needs a real writable ref —
// proxy it onto the search prop / update:search event so v-model:search on
// <Toolbar> drives the caller's own filter state.
const query = computed({
  get: () => props.search ?? "",
  set: (value) => emit("update:search", value),
});
</script>
