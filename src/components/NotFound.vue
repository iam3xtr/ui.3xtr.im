<template>
  <section class="tr-section-empty">
    <AsyncState
      variant="empty"
      icon="compass-off-outline"
      title="Страница не найдена"
      message="Такой страницы не существует или она была перемещена."
    >
      <RouterLink :to="{ name: 'dashboard' }" class="button is-primary">
        На главную
      </RouterLink>
    </AsyncState>
  </section>
</template>

<script setup>
import { RouterLink } from "vue-router";

import AsyncState from "./common/AsyncState.vue";

// `/404` and the catch-all fallback (see router.js) both render this screen
// instead of the generic SectionPlaceholder — Task A5.3 requires a useful
// way back rather than a silent redirect to the dashboard. Reuses the same
// `.tr-async-state` contract (Task A3.7) as every other empty/no-results
// state in the kit, with an "empty" variant and a RouterLink action, rather
// than introducing a dedicated 404 layout.
</script>
