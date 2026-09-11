<template>
  <AsyncState v-if="loading" variant="loading" />

  <AsyncState
    v-else-if="error"
    variant="error"
    :icon="errorIcon"
    :title="errorTitle"
    :message="errorMessage"
  >
    <template v-if="$slots['error-action']" #default>
      <slot name="error-action" />
    </template>
  </AsyncState>

  <section v-else-if="empty" class="tr-section-empty">
    <AsyncState
      v-if="emptyTitle || emptyMessage"
      variant="empty"
      :icon="emptyIcon"
      :title="emptyTitle"
      :message="emptyMessage"
    >
      <template v-if="$slots['empty-action']" #default>
        <slot name="empty-action" />
      </template>
    </AsyncState>
    <slot v-else name="empty-action" />
  </section>

  <AsyncState
    v-else-if="noResults"
    variant="no-results"
    :icon="noResultsIcon"
    :title="noResultsTitle"
    :message="noResultsMessage"
  />

  <slot v-else />
</template>

<script setup>
// Тонкая routing-обёртка над AsyncState: схлопывает повторяющуюся цепочку
// loading/error/empty/no-results v-if, дублирующуюся на списковых и
// detail-экранах, в один вызов (Task A4.4). Сама не выполняет запросов и не
// решает про permissions — вызывающая страница считает флаги и тексты сама.
// Приоритет фиксирован и не настраивается: loading > error > empty >
// no-results (см. docs/design-system.md, «Общие компоненты»).
import AsyncState from "./AsyncState.vue";

defineProps({
  loading: Boolean,
  error: Boolean,
  errorIcon: { type: String, default: null },
  errorTitle: { type: String, default: null },
  errorMessage: { type: String, default: null },
  empty: Boolean,
  emptyIcon: { type: String, default: null },
  emptyTitle: { type: String, default: null },
  emptyMessage: { type: String, default: null },
  noResults: Boolean,
  noResultsIcon: { type: String, default: null },
  noResultsTitle: { type: String, default: null },
  noResultsMessage: { type: String, default: null },
});
</script>
