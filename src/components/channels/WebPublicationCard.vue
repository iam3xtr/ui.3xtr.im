<template>
  <article
    class="tr-card tr-entity-card"
    aria-label="Веб-чат агента"
    :data-state="publication.runtime"
  >
    <header class="tr-entity-card__header">
      <span class="tr-icon-tile tr-icon-tile--plain tr-entity-card__icon">
        <b-icon icon="web" size="is-medium" />
      </span>
      <b-switch
        :key="`web-lifecycle-${lifecycle.syncKey}`"
        class="tr-entity-card__lifecycle"
        :model-value="lifecycle.checked"
        :disabled="lifecycle.disabled"
        :aria-busy="lifecycle.pending ? 'true' : undefined"
        :title="enabledLabel"
        @update:model-value="emit('toggle', $event)"
      >
        <span class="is-sr-only">Веб-чат: </span>{{ enabledLabel }}
      </b-switch>
    </header>

    <strong class="tr-entity-card__title">Веб-чат</strong>

    <p class="tr-entity-card__description">
      Публичная страница чата агента. Один веб-вход на агента, отдельный канал не создаётся.
    </p>

    <p v-if="publication.runtime === 'error'" class="tr-entity-card__description has-text-danger">
      {{ publication.runtimeReason }}
    </p>
    <p v-if="lifecycle.reason" class="tr-entity-card__description tr-muted">
      {{ lifecycle.reason }}
    </p>
    <p v-if="lifecycle.error" class="tr-entity-card__description has-text-danger" role="alert">
      {{ lifecycle.error }}
      <b-button size="is-small" type="is-text" @click="emit('retry')">
        Повторить
      </b-button>
    </p>

    <footer class="tr-entity-card__footer tr-entity-card__footer--wrap">
      <a
        v-if="publication.publicUrl && publication.enabled"
        :href="publication.publicUrl"
        target="_blank"
        rel="noopener noreferrer"
        class="button is-small is-info is-light"
      >
        Открыть чат
      </a>
    </footer>
  </article>
</template>

<script setup>
import { computed } from "vue";

// Task S2-16: ограниченная демонстрация Web-публикации агента. Переключатель —
// сохранённое `enabled`; readiness/runtime остаются отдельной диагностикой.
const props = defineProps({
  publication: { type: Object, required: true },
  lifecycle: { type: Object, required: true },
});

const emit = defineEmits(["toggle", "retry"]);

const enabledLabel = computed(() => (props.lifecycle.checked ? "Включён" : "Выключен"));
</script>
