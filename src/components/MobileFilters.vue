<template>
  <b-dropdown
    class="tr-mobile-filters"
    position="is-bottom-left"
    aria-role="menu"
  >
    <template #trigger>
      <b-button
        class="tr-mobile-filters__trigger"
        :class="{ 'is-active': active }"
        icon-left="filter-variant"
        aria-label="Открыть фильтры"
        title="Фильтры"
      />
    </template>

    <b-dropdown-item custom :focusable="false">
      <div class="tr-mobile-filters__content">
        <slot />
      </div>
    </b-dropdown-item>
  </b-dropdown>
</template>

<script setup>
defineProps({
  active: {
    type: Boolean,
    default: false,
  },
});
</script>
