<template>
  <header class="tr-page-header">
    <div class="page-header__main is-flex">
      <RouterLink
        v-if="back"
        :to="back?.to || './'"
        class="page-header__back"
        :title="back?.title"
      >
        <b-icon icon="chevron-left" />
      </RouterLink>
      <div>
        <h1 v-if="title" class="page-header__title">{{ title }}</h1>
        <div
          v-else-if="loading"
          class="page-header__skeleton--title tr-skeleton-block"
        ></div>

        <p v-if="subtitle" class="page-header__subtitle">{{ subtitle }}</p>
        <div
          v-else-if="loading"
          class="page-header__skeleton--subtitle tr-skeleton-block"
        ></div>
      </div>
    </div>
    <div v-if="$slots.default" class="buttons"><slot></slot></div>
  </header>
</template>

<script setup>
import { computed } from "vue";
import { RouterLink } from "vue-router";

// Контракт кабинета (get.3xtr.im/src/modules/common/components/PageHeader.vue):
// нет отдельного prop `loading` — вызывающий код рендерит <PageHeader> ещё до
// прихода данных, просто не передавая title/subtitle, и "ни то ни другое не
// задано" само по себе служит сигналом загрузки. Как только title появился, а
// subtitle закономерно отсутствует (например список без подзаголовка) — это
// обычное состояние, а не загрузка, и скелет подзаголовка не показывается.
const props = defineProps({
  title: {
    type: String,
    default: "",
  },
  subtitle: {
    type: String,
    default: "",
  },
  /** @type {import("vue").PropType<{ to: import("vue-router").RouteLocationRaw, title?: string }>} */
  back: {
    type: Object,
    default: null,
  },
});

const loading = computed(() => !props.title && !props.subtitle);
</script>
