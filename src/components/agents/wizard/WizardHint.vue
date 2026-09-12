<template>
  <p v-if="!expanded" class="tr-wizard-hint tr-wizard-hint--compact">
    <b-icon icon="lightbulb-on-outline" size="is-small" />
    <span><slot name="compact" /></span>
  </p>
  <div v-else class="tr-wizard-hint">
    <b-icon icon="lightbulb-on-outline" size="is-small" />
    <div class="tr-wizard-hint__body">
      <slot />
    </div>
  </div>
</template>

<script setup>
// Общая контекстная подсказка шага мастера (Task A9.3, Stage A9 `.plan`,
// «Общий вход и жизненный цикл мастера»): первый агент получает развёрнутый
// текст (`expanded`, слот по умолчанию), последующий — компактную строку
// (именованный слот `compact`) с возможностью снова раскрыть все подсказки —
// сам переключатель живёт в `AgentWizard.vue` и управляет `expanded` сразу
// для всех шагов, а не по отдельности на каждом.
defineProps({
  expanded: {
    type: Boolean,
    default: true,
  },
});
</script>
