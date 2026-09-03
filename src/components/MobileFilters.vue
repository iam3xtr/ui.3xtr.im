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

<script setup lang="ts">
withDefaults(defineProps<{
  active?: boolean;
}>(), {
  active: false,
});
</script>

<style scoped lang="scss">
.tr-mobile-filters {
  display: none;
}

@media (max-width: 768px) {
  .tr-mobile-filters {
    display: block;
    flex: 0 0 auto;
    margin-inline-start: auto;
  }

  .tr-mobile-filters__trigger.button {
    width: 36px;
    min-width: 36px;
    height: 36px;
    padding: 0;
  }

  .tr-mobile-filters__trigger.button.is-active {
    color: var(--tr-primary);
    background: var(--tr-primary-soft);
    border-color: var(--tr-primary-border);
  }

  .tr-mobile-filters__content {
    width: min(280px, calc(100vw - 2rem));
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 0.25rem;
  }

  .tr-mobile-filters__content :deep(.field) {
    margin-bottom: 0;
  }

  .tr-mobile-filters__content :deep(.label) {
    font-size: 0.75rem;
  }
}
</style>
