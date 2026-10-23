<template>
  <!--
    Metric anatomy reference (Task S2-09, Issue #20). Presentation-only: label,
    icon, value, caption, delta, progress, details and the clickable /
    read-only / pending / unavailable states, plus zero versus unknown. The
    grid columns (3/2/1) follow the width of the wrapper below, so the width
    switch shows the container-aware behaviour at any viewport size.
  -->
  <section class="tr-card mb-5" data-testid="metric-reference">
    <h2 class="tr-card__title">Метрики: анатомия и колонки</h2>

    <b-field label="Ширина контейнера" class="mb-4">
      <b-select v-model="containerWidth" data-testid="metric-width">
        <option v-for="option in widths" :key="option.value" :value="option.value">
          {{ option.label }}
        </option>
      </b-select>
    </b-field>

    <div class="tr-metric-host" :style="hostStyle" data-testid="metric-host">
      <div class="tr-metric-grid">
        <div class="tr-metric-grid__items" data-testid="metric-items">
          <article
            v-for="metric in metrics"
            :key="metric.key"
            class="tr-card tr-metric"
            :class="metricClasses(metric)"
            :data-testid="`metric-${metric.key}`"
            :aria-busy="metric.state === 'pending' ? 'true' : undefined"
          >
            <div class="tr-metric__header">
              <h3 class="tr-metric__label">
                <a
                  v-if="metric.to"
                  class="tr-metric__link"
                  :href="metric.to"
                  @click.prevent
                >{{ metric.label }}</a>
                <template v-else>{{ metric.label }}</template>
              </h3>
              <span v-if="metric.icon" class="tr-icon-tile tr-icon-tile--plain" aria-hidden="true">
                <b-icon :icon="metric.icon" />
              </span>
            </div>

            <strong class="tr-metric__value">{{ metric.value }}</strong>

            <p v-if="metric.caption" class="tr-metric__caption">{{ metric.caption }}</p>

            <div v-if="metric.progress != null" class="tr-metric__progress">
              <b-progress
                :value="metric.progress"
                type="is-primary"
                size="is-small"
                :aria-label="metric.label"
              />
            </div>

            <p v-if="metric.delta || metric.secondary" class="tr-metric__details">
              <span v-if="metric.delta" class="tr-metric__delta">{{ metric.delta }}</span>
              <button
                v-if="metric.secondary"
                type="button"
                class="button is-small tr-metric__secondary"
              >
                {{ metric.secondary }}
              </button>
            </p>
          </article>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, ref } from "vue";

const widths = [
  { value: "100%", label: "Вся ширина" },
  { value: "720px", label: "720 px" },
  { value: "480px", label: "480 px" },
  { value: "320px", label: "320 px" },
];
const containerWidth = ref("100%");
const hostStyle = computed(() => ({ maxWidth: containerWidth.value }));

// Zero and unknown are different: "0" is a measured value, "—" is unknown.
const metrics = [
  {
    key: "clickable",
    label: "Диалоги",
    icon: "forum-outline",
    value: "128",
    caption: "14 активных",
    delta: "+12% за неделю",
    to: "#conversations",
    secondary: "Фильтр",
  },
  { key: "readonly", label: "Доставлено успешно", value: "97%", caption: "388 из 400 исходящих", progress: 97 },
  { key: "zero", label: "Передано оператору", value: "0", caption: "За сегодня обращений не было" },
  { key: "unknown", label: "Среднее время ответа", value: "—", caption: "Нет данных за период", state: "unavailable" },
  { key: "pending", label: "Токены за месяц", value: "…", caption: "Загрузка", state: "pending" },
  {
    key: "long",
    label: "Очень длинное название метрики для проверки переноса",
    icon: "gauge-full",
    value: "1 234 567 890 символов",
    caption: "Лимит тарифа «Корпоративный расширенный» использован на 82%",
    progress: 82,
  },
];

function metricClasses(metric) {
  return {
    "tr-metric--clickable": Boolean(metric.to),
    "tr-metric--readonly": !metric.to,
    "tr-metric--pending": metric.state === "pending",
    "tr-metric--unavailable": metric.state === "unavailable",
  };
}
</script>
