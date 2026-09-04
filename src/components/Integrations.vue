<template>
  <section class="tr-workbench-page tr-integrations">
    <header class="tr-page-toolbar">
      <SearchField
        v-model="query"
        class="tr-page-toolbar__search"
        placeholder="Поиск интеграций"
      />

      <ToolbarDropdown
        v-model="categoryFilterProxy"
        class="tr-page-toolbar__filter"
        aria-label="Фильтр интеграций по категории"
        all-label="Все категории"
        :options="integrationCategories"
      />

      <ToolbarDropdown
        v-model="statusFilterProxy"
        class="tr-page-toolbar__filter"
        aria-label="Фильтр интеграций по статусу"
        all-label="Все статусы"
        :options="integrationStatuses"
      />

      <MobileFilters :active="Boolean(categoryFilter || statusFilter)">
        <b-field label="Категория">
          <b-select v-model="categoryFilter" expanded>
            <option value="">Все категории</option>
            <option
              v-for="category in integrationCategories"
              :key="category"
            >
              {{ category }}
            </option>
          </b-select>
        </b-field>

        <b-field label="Статус">
          <b-select v-model="statusFilter" expanded>
            <option value="">Все статусы</option>
            <option v-for="status in integrationStatuses" :key="status">
              {{ status }}
            </option>
          </b-select>
        </b-field>
      </MobileFilters>
    </header>

    <div class="tr-catalog">
      <div class="tr-catalog__grid">
        <article
          v-for="integration in filteredIntegrations"
          :key="integration.id"
          class="tr-card tr-card--interactive tr-entity-card"
        >
          <header class="tr-entity-card__header">
            <span class="tr-icon-tile tr-icon-tile--plain tr-entity-card__icon">
              <b-icon :icon="integration.icon" size="is-medium" />
            </span>
            <b-tag
              :type="integration.status === 'Подключено'
                ? 'is-primary'
                : undefined"
              size="is-small"
            >
              {{ integration.status }}
            </b-tag>
          </header>

          <strong class="tr-entity-card__title">
            {{ integration.name }}
          </strong>
          <p class="tr-entity-card__description">
            {{ integration.description }}
          </p>

          <footer class="tr-entity-card__footer">
            <span>{{ integration.category }}</span>
            <b-button
              v-if="integration.status === 'Доступно'"
              size="is-small"
              type="is-primary"
              @click="connectIntegration(integration.id)"
            >
              Подключить
            </b-button>
            <span
              v-else-if="integration.status === 'Подключено'"
              class="tr-entity-card__connected"
            >
              <b-icon icon="check" size="is-small" />
              Настроено
            </span>
            <span v-else>В разработке</span>
          </footer>
        </article>

        <p
          v-if="filteredIntegrations.length === 0"
          class="tr-catalog__empty"
        >
          Интеграции не найдены.
        </p>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import { computed, ref, watch } from "vue";

import { useWorkspaceStore } from "../stores/workspace";
import MobileFilters from "./MobileFilters.vue";
import SearchField from "./SearchField.vue";
import ToolbarDropdown from "./ToolbarDropdown.vue";

type IntegrationCategory = "Мессенджеры" | "CRM" | "Коммуникации" | "Разработка";
type IntegrationStatus = "Подключено" | "Доступно" | "Скоро";

interface IntegrationDefinition {
  id: string;
  name: string;
  description: string;
  category: IntegrationCategory;
  icon: string;
  isComingSoon?: boolean;
}

interface Integration extends IntegrationDefinition {
  status: IntegrationStatus;
}

const integrationCategories: IntegrationCategory[] = [
  "Мессенджеры",
  "CRM",
  "Коммуникации",
  "Разработка",
];
const integrationStatuses: IntegrationStatus[] = [
  "Подключено",
  "Доступно",
  "Скоро",
];

const integrationCatalog: IntegrationDefinition[] = [
  {
    id: "telegram",
    name: "Telegram",
    description: "Подключайте ботов и обрабатывайте обращения из Telegram.",
    category: "Мессенджеры",
    icon: "send-outline",
  },
  {
    id: "whatsapp",
    name: "WhatsApp Business",
    description: "Общайтесь с клиентами через официальный WhatsApp Business API.",
    category: "Мессенджеры",
    icon: "whatsapp",
  },
  {
    id: "vk",
    name: "VK",
    description: "Получайте сообщения сообществ и отвечайте от имени группы.",
    category: "Мессенджеры",
    icon: "vk",
  },
  {
    id: "email",
    name: "Email",
    description: "Создавайте диалоги из входящих писем корпоративной почты.",
    category: "Коммуникации",
    icon: "email-outline",
  },
  {
    id: "slack",
    name: "Slack",
    description: "Отправляйте уведомления и взаимодействуйте с командой в Slack.",
    category: "Коммуникации",
    icon: "slack",
  },
  {
    id: "amocrm",
    name: "amoCRM",
    description: "Синхронизируйте контакты, сделки и историю коммуникаций.",
    category: "CRM",
    icon: "account-box-multiple-outline",
  },
  {
    id: "bitrix24",
    name: "Битрикс24",
    description: "Передавайте обращения и данные клиентов в Битрикс24.",
    category: "CRM",
    icon: "briefcase-outline",
  },
  {
    id: "hubspot",
    name: "HubSpot",
    description: "Обогащайте карточки клиентов и автоматизируйте работу с лидами.",
    category: "CRM",
    icon: "chart-box-outline",
    isComingSoon: true,
  },
  {
    id: "webhook",
    name: "Webhook",
    description: "Передавайте события в собственные сервисы по защищённому URL.",
    category: "Разработка",
    icon: "webhook",
  },
];

const workspaceStore = useWorkspaceStore();
const { activeWorkspaceId } = storeToRefs(workspaceStore);
const query = ref("");
const categoryFilter = ref<IntegrationCategory | "">("");
const statusFilter = ref<IntegrationStatus | "">("");
const categoryFilterProxy = computed<string>({
  get: () => categoryFilter.value,
  set: (value) => {
    categoryFilter.value = value as IntegrationCategory | "";
  },
});
const statusFilterProxy = computed<string>({
  get: () => statusFilter.value,
  set: (value) => {
    statusFilter.value = value as IntegrationStatus | "";
  },
});
const connectedByWorkspace = ref<Record<string, string[]>>({
  demo: ["telegram", "email", "webhook"],
  trickster: ["telegram"],
  empty: [],
});

const integrations = computed<Integration[]>(() => {
  const connected = connectedByWorkspace.value[activeWorkspaceId.value] ?? [];

  return integrationCatalog.map((integration) => ({
    ...integration,
    status: integration.isComingSoon
      ? "Скоро"
      : connected.includes(integration.id)
        ? "Подключено"
        : "Доступно",
  }));
});

const filteredIntegrations = computed(() => {
  const search = query.value.trim().toLocaleLowerCase();

  return integrations.value.filter((integration) => {
    const matchesSearch = !search || [
      integration.name,
      integration.description,
      integration.category,
    ].some((value) => value.toLocaleLowerCase().includes(search));
    const matchesCategory = !categoryFilter.value
      || integration.category === categoryFilter.value;
    const matchesStatus = !statusFilter.value
      || integration.status === statusFilter.value;

    return matchesSearch && matchesCategory && matchesStatus;
  });
});

function connectIntegration(id: string): void {
  const workspaceId = activeWorkspaceId.value;
  const connected = connectedByWorkspace.value[workspaceId]
    ?? (connectedByWorkspace.value[workspaceId] = []);

  if (!connected.includes(id)) {
    connected.push(id);
  }
}

watch(activeWorkspaceId, () => {
  query.value = "";
  categoryFilter.value = "";
  statusFilter.value = "";
});
</script>
