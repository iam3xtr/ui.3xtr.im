<template>
  <div>
    <Loader v-if="isLoading" size="section" class="tr-loader--standalone" />

    <RouterLink
      v-else-if="agents.length === 0"
      :to="{ name: 'agents', query: { create: '1' } }"
      class="tr-card tr-card--interactive tr-dashboard-create"
    >
      <span class="tr-icon-tile tr-icon-tile--plain tr-dashboard-create__icon">
        <b-icon icon="robot-excited-outline" size="is-large" />
      </span>
      <strong>Создать первого агента</strong>
      <span>Настройте агента и начните тестирование в песочнице</span>
    </RouterLink>

    <template v-else>
      <section class="tr-grid tr-grid--3 tr-dashboard-grid mb-5">
        <RouterLink
          v-for="item in dashboardNavigationItems"
          :key="item.routeName"
          :to="{ name: item.routeName }"
          class="tr-card tr-card--interactive tr-dashboard-link"
        >
          <div class="tr-dashboard-link__header">
            <div>
              <h2 class="tr-card__title mb-0">{{ item.label }}</h2>
            </div>

            <span class="tr-icon-tile tr-icon-tile--plain tr-dashboard-icon">
              <b-icon :icon="item.icon" size="is-medium" />
            </span>
          </div>

          <div class="tr-dashboard-link__metric">
            <strong>{{ item.value }}</strong>
            <span v-if="item.caption">{{ item.caption }}</span>
          </div>

          <b-progress
            v-if="item.progress !== null"
            :value="item.progress"
            type="is-primary"
            size="is-small"
          />

          <div class="tr-dashboard-link__details">
            <span v-if="item.delta" class="tr-dashboard-link__delta">
              {{ item.delta }}
            </span>
            <span v-if="item.secondaryLabel">
              {{ item.secondaryLabel }}
              <strong>{{ item.secondaryValue }}</strong>
            </span>
          </div>
        </RouterLink>
      </section>

      <section class="tr-grid tr-grid--2">
        <article class="tr-card">
          <div class="tr-row tr-row--between mb-4">
            <h2 class="tr-card__title mb-0">Последние агенты</h2>
            <b-button size="is-small">Все агенты</b-button>
          </div>

          <b-table :data="agents" hoverable mobile-cards>
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
    </template>
  </div>
</template>

<script setup>
import { storeToRefs } from "pinia";
import { computed } from "vue";
import { RouterLink } from "vue-router";

import { useSimulatedLoading } from "../composables/useSimulatedLoading";
import { useWorkspaceStore } from "../stores/workspace";

import Loader from "./common/Loader.vue";

const { isLoading } = useSimulatedLoading();

const dashboardSections = [
  {
    routeName: "conversations",
    dataKey: "conversations",
    label: "Диалоги",
    icon: "forum-outline",
  },
  {
    routeName: "agents",
    dataKey: "agents",
    label: "Агенты",
    icon: "robot-outline",
  },
  {
    routeName: "channels",
    dataKey: "channels",
    label: "Интеграции",
    icon: "puzzle-outline",
  },
  {
    routeName: "knowledge",
    dataKey: "knowledge",
    label: "Знания",
    icon: "book-open-page-variant-outline",
  },
  {
    routeName: "workspace-settings",
    dataKey: "settings",
    label: "Пространство",
    icon: "office-building-cog-outline",
  },
  {
    routeName: "workspace-plan",
    dataKey: "plan",
    label: "Тариф",
    icon: "credit-card-outline",
  },
];

const emptyDashboard = {
  sections: {
    conversations: {
      value: "0",
      caption: "за сегодня",
      delta: "",
      secondaryLabel: "Успешные ответы",
      secondaryValue: "—",
      progress: null,
    },
    agents: {
      value: "0",
      caption: "активных",
      delta: "",
      secondaryLabel: "",
      secondaryValue: "",
      progress: null,
    },
    knowledge: {
      value: "0 GB",
      caption: "из 500 GB",
      delta: "",
      secondaryLabel: "Использовано",
      secondaryValue: "0%",
      progress: 0,
    },
    channels: {
      value: "0",
      caption: "подключено",
      delta: "",
      secondaryLabel: "Статус",
      secondaryValue: "Нет интеграций",
      progress: null,
    },
    settings: {
      value: "Новое пространство",
      caption: "",
      delta: "",
      secondaryLabel: "Ваша роль",
      secondaryValue: "Участник",
      progress: null,
    },
    plan: {
      value: "Free",
      caption: "текущий тариф",
      delta: "",
      secondaryLabel: "Возможности",
      secondaryValue: "Базовые",
      progress: null,
    },
  },
  agents: [],
  limits: [
    { label: "Месячный бюджет", value: 0, caption: "0%" },
    { label: "API-запросы", value: 0, caption: "0 из 100 000" },
  ],
};

const dashboards = {
  demo: {
    sections: {
      conversations: {
        value: "2 143",
        caption: "за сегодня",
        delta: "↑ 12,7% ко вчера",
        secondaryLabel: "Успешные ответы",
        secondaryValue: "96,4%",
        progress: null,
      },
      agents: {
        value: "12",
        caption: "активных",
        delta: "↑ 2 за неделю",
        secondaryLabel: "",
        secondaryValue: "",
        progress: null,
      },
      knowledge: {
        value: "256 GB",
        caption: "из 500 GB",
        delta: "",
        secondaryLabel: "Использовано",
        secondaryValue: "51%",
        progress: 51,
      },
      channels: {
        value: "3",
        caption: "подключено",
        delta: "",
        secondaryLabel: "Статус",
        secondaryValue: "Все работают",
        progress: null,
      },
      settings: {
        value: "Демо-пространство",
        caption: "",
        delta: "",
        secondaryLabel: "Ваша роль",
        secondaryValue: "Владелец",
        progress: null,
      },
      plan: {
        value: "Free",
        caption: "текущий тариф",
        delta: "",
        secondaryLabel: "Возможности",
        secondaryValue: "Базовые",
        progress: null,
      },
    },
    agents: [
      { name: "Консультант", status: "Активен", updated: "2 часа назад" },
      { name: "Sales Assistant", status: "Черновик", updated: "Вчера" },
      { name: "Support Bot", status: "Активен", updated: "3 дня назад" },
    ],
    limits: [
      { label: "Месячный бюджет", value: 38, caption: "38%" },
      { label: "API-запросы", value: 67, caption: "67 240 из 100 000" },
    ],
  },
  trickster: {
    sections: {
      conversations: {
        value: "18",
        caption: "за сегодня",
        delta: "↑ 3 ко вчера",
        secondaryLabel: "Успешные ответы",
        secondaryValue: "98,1%",
        progress: null,
      },
      agents: {
        value: "1",
        caption: "активен",
        delta: "",
        secondaryLabel: "",
        secondaryValue: "",
        progress: null,
      },
      knowledge: {
        value: "40 GB",
        caption: "из 500 GB",
        delta: "",
        secondaryLabel: "Использовано",
        secondaryValue: "8%",
        progress: 8,
      },
      channels: {
        value: "1",
        caption: "подключён",
        delta: "",
        secondaryLabel: "Статус",
        secondaryValue: "Работает",
        progress: null,
      },
      settings: {
        value: "Trickster Team",
        caption: "",
        delta: "",
        secondaryLabel: "Ваша роль",
        secondaryValue: "Администратор",
        progress: null,
      },
      plan: {
        value: "Superior",
        caption: "текущий тариф",
        delta: "",
        secondaryLabel: "Возможности",
        secondaryValue: "Расширенные",
        progress: null,
      },
    },
    agents: [
      {
        name: "Trickster Concierge",
        status: "Активен",
        updated: "12 минут назад",
      },
    ],
    limits: [
      { label: "Месячный бюджет", value: 12, caption: "12%" },
      { label: "API-запросы", value: 21, caption: "21 340 из 100 000" },
    ],
  },
};

const workspaceStore = useWorkspaceStore();
const { activeWorkspaceId } = storeToRefs(workspaceStore);
const dashboard = computed(
  () => dashboards[activeWorkspaceId.value] ?? emptyDashboard,
);
const dashboardNavigationItems = computed(() =>
  dashboardSections.map((section) => ({
    ...section,
    ...dashboard.value.sections[section.dataKey],
  })),
);
const agents = computed(() => dashboard.value.agents);
const limits = computed(() => dashboard.value.limits);
</script>
