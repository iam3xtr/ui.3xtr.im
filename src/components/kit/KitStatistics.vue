<template>
  <!--
    Statistics section (Task S2-11, Issue #21). Read-only: stat cards, a stat
    grid sized by its container, and breakdowns. Not the clickable `.tr-metric`
    card: values are plain text, nothing in it is focusable. Fixture-driven and
    presentation-only: no fetching, aggregation, pricing or RBAC.
  -->
  <section
    class="tr-card tr-stats"
    :data-testid="`stats-${context}`"
    :aria-busy="state === 'loading' ? 'true' : undefined"
    :aria-labelledby="titleId"
  >
    <div class="tr-stats__header">
      <h2 :id="titleId" class="tr-card__title tr-stats__title mb-0">{{ title }}</h2>
      <p class="tr-stats__help">Демонстрационные данные, не живая статистика.</p>
    </div>

    <p v-if="state === 'loading'" class="tr-stats__note" role="status">Загрузка статистики…</p>
    <p v-else-if="state === 'unavailable'" class="tr-stats__note tr-stats__note--warning" role="status">
      Статистика недоступна.
    </p>
    <p v-else-if="state === 'partial'" class="tr-stats__note tr-stats__note--warning" role="status">
      Часть данных недоступна: показаны только полученные значения.
    </p>
    <p v-else-if="state === 'zero'" class="tr-stats__note" data-testid="stats-zero">
      Запросов за период не было.
    </p>

    <template v-for="group in groups" :key="group.key">
      <h3 class="tr-breakdown__title">{{ group.title }}</h3>
      <div class="tr-stat-grid">
        <dl class="tr-stat-grid__items" :data-testid="`stats-${context}-${group.key}`">
          <div
            v-for="stat in group.stats"
            :key="stat.key"
            class="tr-stat"
            :class="{ 'tr-stat--unavailable': stat.unavailable, 'tr-stat--pending': state === 'loading' }"
          >
            <dt class="tr-stat__label">{{ stat.label }}</dt>
            <dd class="tr-stat__value">
              {{ stat.value }}<span v-if="stat.unit" class="tr-stat__unit"> {{ stat.unit }}</span>
              <span v-if="stat.unavailable" class="tr-stat__unit"> (недоступно)</span>
            </dd>
            <dd v-if="stat.help" class="tr-stat__help">{{ stat.help }}</dd>
          </div>
        </dl>
      </div>
    </template>

    <div v-for="breakdown in breakdowns" :key="breakdown.key" class="tr-breakdown">
      <h3 class="tr-breakdown__title">{{ breakdown.title }}</h3>
      <ul class="tr-breakdown__list">
        <li v-for="row in breakdown.rows" :key="row.name" class="tr-breakdown__row">
          <span class="tr-breakdown__name">{{ row.name }}</span>
          <span class="tr-breakdown__figure">{{ row.figure }}</span>
        </li>
      </ul>
    </div>
  </section>
</template>

<script setup>
import { computed, useId } from "vue";

import { formatCount, formatLatency, statisticsFixtures } from "./statisticsFixtures.js";

const props = defineProps({
  /** "workspace" shows LLM + RAG; "agent" shows the Agent / Model / Knowledge / Requests summary. */
  context: { type: String, default: "workspace" },
  /** "tenant" or "admin" fixture figures (workspace context only). */
  variant: { type: String, default: "tenant" },
  /** ready | loading | partial | unavailable | zero */
  state: { type: String, default: "ready" },
});

const titleId = `stats-title-${useId()}`;
const title = computed(() => (props.context === "agent" ? "Сводка по агенту" : "Статистика LLM и RAG"));

const data = computed(() => {
  if (props.state === "zero") return statisticsFixtures.zero;
  if (props.context === "agent") return statisticsFixtures.agent;
  return props.variant === "admin" ? statisticsFixtures.admin : statisticsFixtures.workspace;
});

// Loading and unavailable show no figures; partial withholds the RAG half only.
function withheld(section) {
  return props.state === "loading" || props.state === "unavailable" || (props.state === "partial" && section === "rag");
}

function stat(section, key, label, raw, { latency = false, text = false, help = "" } = {}) {
  const missing = withheld(section);
  let shown = { value: "—", unit: "" };
  if (!missing) shown = text ? { value: raw, unit: "" } : latency ? formatLatency(raw) : { value: formatCount(raw), unit: "" };
  // While loading the placeholder is announced by the section status, not per value.
  return { key, label, help, unavailable: missing && props.state !== "loading", ...shown };
}

const groups = computed(() => {
  const d = data.value;
  if (props.context === "agent") {
    return [
      {
        key: "summary",
        title: "Агент, модель, знания, запросы",
        stats: [
          stat("llm", "agent", "Агент", d.agentName, { text: true }),
          stat("llm", "model", "Модель", d.modelName, { text: true }),
          stat("rag", "knowledge", "Знания", d.rag.calls, { help: "Обращений к базе знаний" }),
          stat("llm", "requests", "Запросы", d.llm.total),
        ],
      },
    ];
  }
  const { llm, rag } = d;
  return [
    {
      key: "llm",
      title: "LLM",
      stats: [
        stat("llm", "total", "Всего запросов", llm.total),
        stat("llm", "success", "Успешно", llm.success),
        stat("llm", "failure", "С ошибкой", llm.failure),
        stat("llm", "running", "Выполняются", llm.running),
        stat("llm", "tokens", "Токены", llm.tokens, { help: "Входные и выходные вместе" }),
        stat("llm", "avg", "Среднее время", llm.avgMs, { latency: true }),
        stat("llm", "p95", "p95", llm.p95Ms, { latency: true, help: "95% запросов быстрее" }),
      ],
    },
    {
      key: "rag",
      title: "RAG",
      stats: [
        stat("rag", "calls", "Обращения", rag.calls),
        stat("rag", "success", "Успешно", rag.success),
        stat("rag", "failure", "С ошибкой", rag.failure),
        stat("rag", "degraded", "Деградация", rag.degraded, { help: "Ответ без части источников" }),
        stat("rag", "tokens", "Токены", rag.tokens),
        stat("rag", "avg", "Среднее время", rag.avgMs, { latency: true }),
        stat("rag", "p95", "p95", rag.p95Ms, { latency: true }),
      ],
    },
  ];
});

const breakdowns = computed(() => {
  if (props.state === "loading" || props.state === "unavailable") return [];
  const b = data.value.breakdowns;
  const defs = [
    ["source", "По источникам"],
    ["provider", "По провайдерам"],
    ["model", "По моделям"],
    ["kind", "По типам"],
  ];
  return defs
    .filter(([key]) => b[key].length)
    .map(([key, title]) => ({
      key,
      title,
      rows: b[key].map((row) => ({ name: row.name, figure: formatCount(row.figure) })),
    }));
});
</script>
