<template>
  <div>
    <section class="tr-grid tr-grid--3 mb-5">
      <article
        v-for="metric in metrics"
        :key="metric.label"
        class="tr-card tr-kpi"
      >
        <div class="tr-kpi__label">
          <span class="tr-icon-tile">
            <b-icon :icon="metric.icon" size="is-small" />
          </span>
          {{ metric.label }}
        </div>
        <div class="tr-kpi__value">{{ metric.value }}</div>
        <div class="tr-kpi__delta">
          <strong v-if="metric.delta">{{ metric.delta }}</strong>
          {{ metric.caption }}
        </div>
      </article>
    </section>

    <section class="tr-grid tr-grid--2">
      <article class="tr-card">
        <div class="tr-row tr-row--between mb-4">
          <h2 class="tr-card__title mb-0">Последние агенты</h2>
          <b-button size="is-small">Все агенты</b-button>
        </div>

        <p v-if="agents.length === 0" class="tr-dashboard-empty">
          В этом пространстве пока нет агентов.
        </p>

        <b-table v-else :data="agents" striped hoverable>
          <b-table-column field="name" label="Название" v-slot="{ row }">
            <strong>{{ row.name }}</strong>
          </b-table-column>

          <b-table-column field="status" label="Статус" v-slot="{ row }">
            <b-tag :type="row.status === 'Активен' ? 'is-primary' : undefined">
              {{ row.status }}
            </b-tag>
          </b-table-column>

          <b-table-column field="updated" label="Обновлено" v-slot="{ row }">
            {{ row.updated }}
          </b-table-column>
        </b-table>
      </article>

      <article class="tr-card">
        <h2 class="tr-card__title">Использование ресурсов</h2>

        <div class="tr-stack">
          <div v-for="limit in limits" :key="limit.label">
            <div class="tr-row tr-row--between">
              <span>{{ limit.label }}</span>
              <span class="tr-muted">{{ limit.caption }}</span>
            </div>
            <b-progress :value="limit.value" type="is-primary" />
          </div>
        </div>
      </article>
    </section>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import { computed } from "vue";

import { useWorkspaceStore } from "../stores/workspace";

const emptyDashboard = {
  metrics: [
    {
      label: "Активные агенты",
      value: "0",
      delta: "",
      caption: "нет агентов",
      icon: "robot-outline",
    },
    {
      label: "Диалоги за сегодня",
      value: "0",
      delta: "",
      caption: "нет диалогов",
      icon: "message-outline",
    },
    {
      label: "Успешные ответы",
      value: "—",
      delta: "",
      caption: "нет данных",
      icon: "check-circle-outline",
    },
  ],
  agents: [],
  limits: [
    { label: "Месячный бюджет", value: 0, caption: "0%" },
    { label: "Хранилище знаний", value: 0, caption: "0 из 500 GB" },
    { label: "API-запросы", value: 0, caption: "0 из 100 000" },
  ],
};

const dashboards = {
  demo: {
    metrics: [
      {
        label: "Активные агенты",
        value: "12",
        delta: "↑ 2",
        caption: " за неделю",
        icon: "robot-outline",
      },
      {
        label: "Диалоги за сегодня",
        value: "2 143",
        delta: "↑ 12,7%",
        caption: " ко вчера",
        icon: "message-outline",
      },
      {
        label: "Успешные ответы",
        value: "96,4%",
        delta: "↑ 1,8%",
        caption: " за неделю",
        icon: "check-circle-outline",
      },
    ],
    agents: [
      { name: "Консультант", status: "Активен", updated: "2 часа назад" },
      { name: "Sales Assistant", status: "Черновик", updated: "Вчера" },
      { name: "Support Bot", status: "Активен", updated: "3 дня назад" },
    ],
    limits: [
      { label: "Месячный бюджет", value: 38, caption: "38%" },
      { label: "Хранилище знаний", value: 51, caption: "256 из 500 GB" },
      { label: "API-запросы", value: 67, caption: "67 240 из 100 000" },
    ],
  },
  trickster: {
    metrics: [
      {
        label: "Активные агенты",
        value: "1",
        delta: "",
        caption: "активен",
        icon: "robot-outline",
      },
      {
        label: "Диалоги за сегодня",
        value: "18",
        delta: "↑ 3",
        caption: " ко вчера",
        icon: "message-outline",
      },
      {
        label: "Успешные ответы",
        value: "98,1%",
        delta: "",
        caption: "за неделю",
        icon: "check-circle-outline",
      },
    ],
    agents: [
      {
        name: "Trickster Concierge",
        status: "Активен",
        updated: "12 минут назад",
      },
    ],
    limits: [
      { label: "Месячный бюджет", value: 12, caption: "12%" },
      { label: "Хранилище знаний", value: 8, caption: "40 из 500 GB" },
      { label: "API-запросы", value: 21, caption: "21 340 из 100 000" },
    ],
  },
};

const workspaceStore = useWorkspaceStore();
const { activeWorkspaceId } = storeToRefs(workspaceStore);
const dashboard = computed(
  () => dashboards[activeWorkspaceId.value as keyof typeof dashboards]
    ?? emptyDashboard,
);
const metrics = computed(() => dashboard.value.metrics);
const agents = computed(() => dashboard.value.agents);
const limits = computed(() => dashboard.value.limits);
</script>
