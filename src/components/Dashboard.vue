<template>
  <div>
    <Loader v-if="loading" size="section" class="tr-loader--standalone" />

    <AsyncState
      v-else-if="demoStore.isPermissionDenied"
      variant="permission-denied"
      v-bind="demoStore.permissionDeniedState"
    />

    <AsyncState
      v-else-if="demoStore.isError"
      variant="error"
      :icon="demoStore.listAsyncState.errorIcon"
      :title="demoStore.listAsyncState.errorTitle"
      :message="demoStore.listAsyncState.errorMessage"
    />

    <RouterLink
      v-else-if="agents.length === 0 || demoStore.isEmpty"
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
      <b-message
        v-if="demoStore.isPartial"
        type="is-warning"
        :closable="false"
      >
        Показан не весь обзор: часть виджетов недоступна из-за временной
        ошибки. Остальные ниже — актуальны.
      </b-message>

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
import { useDemoStore } from "../stores/demo";
import { useProfileStore } from "../stores/profile";
import { useWorkspaceStore } from "../stores/workspace";

import AsyncState from "./common/AsyncState.vue";
import Loader from "./common/Loader.vue";

// Demo-режим (Stage A7, Task A7.5): та же схема, что у каталогов Task A7.3 —
// `Loader` на загрузку, прямой `AsyncState` на permission-denied/error,
// `b-message`-баннер на partial поверх виджетов. `empty` переиспользует уже
// существующую CTA-карточку «Создать первого агента» (реальный
// эквивалент AsyncState-empty для этого экрана), а не заводит второй
// empty-контракт — она срабатывает и когда агентов правда нет, и когда
// demo-режим форсирует пустоту.
const { isLoading } = useSimulatedLoading();
const demoStore = useDemoStore();
const loading = computed(() => isLoading.value || demoStore.isLoading);

// Tile set and order mirror get.3xtr.im's Dashboard.vue tiles (Task A5.3):
// conversations, agents, knowledge, workspace settings/plan, then the
// account tile. The former "Интеграции" tile pointed at `/agents/` — a
// leftover from before Task A5.1 dropped the standalone `/integrations`
// route — so it's replaced with the account tile the cabinet actually
// shows, backed by the shared profile fixture (see `profileTile` below).
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
    routeName: "workspace-plans",
    dataKey: "plan",
    label: "Тариф",
    icon: "credit-card-outline",
  },
  {
    routeName: "profile",
    dataKey: "profile",
    label: "Профиль",
    icon: "account-outline",
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

// Account tile: the profile fixture is a personal record, not scoped to a
// workspace (mirrors auth.user in get.3xtr.im's Dashboard.vue), so it's read
// from the shared profile store instead of the per-workspace `dashboards`
// fixtures above.
const profileStore = useProfileStore();
const { profile } = storeToRefs(profileStore);
const profileTile = computed(() => ({
  value: profile.value.name,
  caption: "",
  delta: "",
  secondaryLabel: "Email",
  secondaryValue: profile.value.emailVerified ? "Подтверждён" : "Не подтверждён",
  progress: null,
}));

const dashboardNavigationItems = computed(() =>
  dashboardSections.map((section) => ({
    ...section,
    ...(section.dataKey === "profile"
      ? profileTile.value
      : dashboard.value.sections[section.dataKey]),
  })),
);
const agents = computed(() => dashboard.value.agents);
const limits = computed(() => dashboard.value.limits);
</script>
