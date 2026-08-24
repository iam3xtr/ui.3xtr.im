<template>
  <section class="tr-workbench-page">
    <header
      v-if="viewMode === 'list'"
      class="tr-workbench-page__header tr-page-toolbar"
    >
      <SearchField
        v-model="query"
        class="tr-page-toolbar__search"
        placeholder="Поиск по агентам"
      />

      <b-select
        v-model="statusFilter"
        class="tr-page-toolbar__filter"
        aria-label="Фильтр агентов по статусу"
        expanded
      >
        <option value="">Все статусы</option>
        <option v-for="status in agentStatuses" :key="status">
          {{ status }}
        </option>
      </b-select>

      <b-select
        v-model="modelFilter"
        class="tr-page-toolbar__filter"
        aria-label="Фильтр агентов по модели"
        expanded
      >
        <option value="">Все модели</option>
        <option v-for="model in agentModels" :key="model">
          {{ model }}
        </option>
      </b-select>
    </header>

    <section
      v-if="viewMode === 'list'"
      class="tr-agents__catalog"
      aria-label="Список агентов"
    >
      <div class="tr-agents__grid">
        <button
          v-for="agent in filteredAgents"
          :key="agent.id"
          class="tr-card tr-agent-card"
          type="button"
          @click="selectAgent(agent.id)"
        >
          <span class="tr-agent-card__header">
            <span class="tr-agent-card__icon">
              <b-icon icon="robot-outline" size="is-medium" />
            </span>
            <b-tag
              :type="agent.status === 'Активен' ? 'is-primary' : undefined"
              size="is-small"
            >
              {{ agent.status }}
            </b-tag>
          </span>

          <strong class="tr-agent-card__title">{{ agent.name }}</strong>
          <span class="tr-agent-card__description">
            {{ agent.description }}
          </span>

          <span class="tr-agent-card__footer">
            <span>{{ agent.model }}</span>
            <span>Обновлён {{ agent.updated }}</span>
          </span>
        </button>

        <p
          v-if="filteredAgents.length === 0 && hasActiveAgentFilters"
          class="tr-agents__empty"
        >
          По вашему запросу агенты не найдены.
        </p>

        <button
          class="tr-card tr-agent-card tr-agent-card--create"
          type="button"
          @click="openCreateModal"
        >
          <span class="tr-agent-card__create-icon">
            <b-icon icon="plus" size="is-medium" />
          </span>
          <strong>Создать нового агента</strong>
          <span>Настройте инструкции и протестируйте агента в песочнице.</span>
        </button>
      </div>
    </section>

    <section
      v-else
      class="tr-conversations tr-agents tr-agents__workbench"
      :class="[
        `is-${viewMode}-view`,
        { 'is-properties-open': isPropertiesVisible },
      ]"
    >
      <article
        v-if="selectedAgent"
        class="tr-conversations__panel tr-conversations__chat"
      >
        <header class="tr-conversations__header">
          <b-button
            class="tr-conversations__list-action tr-conversations__icon-action"
            icon-left="arrow-left"
            aria-label="К агентам"
            title="К агентам"
            @click="showAgentCatalog"
          />

          <div class="tr-conversations__identity">
            <span class="tr-conversation-avatar">
              <b-icon icon="robot-outline" size="is-small" />
            </span>
            <span>
              <strong>{{ selectedAgent.name }}</strong>
              <small>{{ selectedAgent.status }}</small>
            </span>
          </div>

          <b-button
            v-if="!isPropertiesVisible"
            class="tr-conversations__settings-action tr-conversations__icon-action"
            icon-left="cog-outline"
            aria-label="Открыть настройки агента"
            title="Открыть настройки агента"
            @click="openProperties"
          />
        </header>

        <div class="tr-conversations__messages" aria-live="polite">
          <div class="tr-agents__sandbox-note">
            <b-icon icon="flask-outline" size="is-small" />
            Сообщения здесь не попадут в реальные диалоги.
          </div>

          <div
            v-for="message in selectedAgent.messages"
            :key="message.id"
            class="tr-chat-message"
            :class="{ 'is-outgoing': message.outgoing }"
          >
            <p>{{ message.text }}</p>
            <small>{{ message.time }}</small>
          </div>
        </div>

        <footer class="tr-conversations__composer">
          <b-input
            v-model="draft"
            class="tr-conversations__composer-input"
            placeholder="Сообщение для агента"
            @keyup.enter="sendMessage"
          />
          <b-button
            type="is-primary"
            icon-left="send"
            aria-label="Отправить"
            @click="sendMessage"
          />
        </footer>
      </article>

      <aside
        v-if="selectedAgent"
        class="tr-conversations__panel tr-conversations__properties"
      >
        <header class="tr-conversations__header">
          <b-button
            class="tr-conversations__properties-action tr-conversations__icon-action"
            icon-left="arrow-left"
            aria-label="К песочнице"
            title="К песочнице"
            @click="viewMode = 'chat'"
          />
          <h2 class="tr-conversations__title">Настройки</h2>
          <b-button
            class="tr-conversations__properties-close tr-conversations__icon-action"
            icon-left="close"
            aria-label="Закрыть настройки агента"
            title="Закрыть настройки агента"
            @click="closeProperties"
          />
        </header>

        <div class="tr-conversations__properties-body">
          <b-field label="Название">
            <b-input v-model="selectedAgent.name" />
          </b-field>

          <b-field label="Статус">
            <b-select v-model="selectedAgent.status" expanded>
              <option>Активен</option>
              <option>Черновик</option>
              <option>Приостановлен</option>
            </b-select>
          </b-field>

          <b-field label="Модель">
            <b-select v-model="selectedAgent.model" expanded>
              <option>GPT-4.1 mini</option>
              <option>GPT-4.1</option>
              <option>GPT-4o mini</option>
            </b-select>
          </b-field>

          <b-field label="Температура">
            <b-slider
              v-model="selectedAgent.temperature"
              :min="0"
              :max="1"
              :step="0.1"
              :tooltip="true"
            />
          </b-field>

          <b-field label="Системная инструкция">
            <b-input
              v-model="selectedAgent.instructions"
              type="textarea"
              rows="7"
            />
          </b-field>
        </div>
      </aside>
    </section>
  </section>

  <b-modal v-model="isCreateOpen" has-modal-card>
    <form class="modal-card" @submit.prevent="createAgent">
      <header class="modal-card-head">
        <p class="modal-card-title">Новый агент</p>
        <button
          class="delete"
          type="button"
          aria-label="Закрыть"
          @click="isCreateOpen = false"
        />
      </header>

      <section class="modal-card-body">
        <b-field label="Название">
          <b-input
            v-model="newAgentName"
            placeholder="Например, Консультант"
            required
          />
        </b-field>
      </section>

      <footer class="modal-card-foot">
        <b-button @click="isCreateOpen = false">Отмена</b-button>
        <b-button native-type="submit" type="is-primary">
          Создать
        </b-button>
      </footer>
    </form>
  </b-modal>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";

import { useWorkspaceStore } from "../stores/workspace";
import SearchField from "./SearchField.vue";

type ViewMode = "list" | "chat" | "properties";

interface SandboxMessage {
  id: number;
  text: string;
  time: string;
  outgoing: boolean;
}

interface Agent {
  id: number;
  name: string;
  description: string;
  model: string;
  status: string;
  updated: string;
  temperature: number;
  instructions: string;
  messages: SandboxMessage[];
}

const query = ref("");
const statusFilter = ref("");
const modelFilter = ref("");
const draft = ref("");
const selectedId = ref<number | null>(null);
const viewMode = ref<ViewMode>("list");
const propertiesOpen = ref(true);
const isWideLayout = ref(false);
const isCreateOpen = ref(false);
const newAgentName = ref("");
let wideLayoutQuery: MediaQueryList | null = null;
const workspaceStore = useWorkspaceStore();
const { activeWorkspaceId } = storeToRefs(workspaceStore);
const route = useRoute();

const agentStatuses = ["Активен", "Черновик", "Приостановлен"];
const agentModels = ["GPT-4.1 mini", "GPT-4.1", "GPT-4o mini"];

const demoAgents: Agent[] = [
  {
    id: 1,
    name: "Консультант",
    description: "Отвечает на вопросы клиентов о продуктах и доставке.",
    model: "GPT-4.1 mini",
    status: "Активен",
    updated: "2 ч",
    temperature: 0.4,
    instructions: "Помогай клиентам выбрать продукт. Отвечай кратко и по делу.",
    messages: [
      {
        id: 1,
        text: "Здравствуйте! Чем я могу помочь?",
        time: "10:24",
        outgoing: false,
      },
    ],
  },
  {
    id: 2,
    name: "Sales Assistant",
    description: "Квалифицирует лиды и готовит персональные предложения.",
    model: "GPT-4.1",
    status: "Черновик",
    updated: "Вчера",
    temperature: 0.6,
    instructions: "Уточняй задачу клиента и предлагай подходящий тариф.",
    messages: [],
  },
  {
    id: 3,
    name: "Support Bot",
    description: "Помогает решать типовые технические вопросы.",
    model: "GPT-4o mini",
    status: "Приостановлен",
    updated: "3 д",
    temperature: 0.2,
    instructions: "Используй базу знаний и запрашивай детали ошибки.",
    messages: [],
  },
];

const agentsByWorkspace = ref<Record<string, Agent[]>>({
  demo: demoAgents,
  trickster: [
    {
      id: 1,
      name: "Trickster Concierge",
      description: "Помогает команде настраивать рабочее пространство.",
      model: "GPT-4.1",
      status: "Активен",
      updated: "12 мин",
      temperature: 0.3,
      instructions: "Помогай пользователям работать с продуктами Trickster.",
      messages: [
        {
          id: 1,
          text: "Готов к тестированию. Задайте вопрос о настройке пространства.",
          time: "11:02",
          outgoing: false,
        },
      ],
    },
  ],
  empty: [],
});

const agents = computed(
  () => agentsByWorkspace.value[activeWorkspaceId.value] ?? [],
);

const selectedAgent = computed(
  () => agents.value.find((agent) => agent.id === selectedId.value),
);

const isPropertiesVisible = computed(
  () => Boolean(selectedAgent.value)
    && (
      isWideLayout.value
        ? propertiesOpen.value
        : viewMode.value === "properties"
    ),
);

const hasActiveAgentFilters = computed(
  () => Boolean(query.value.trim() || statusFilter.value || modelFilter.value),
);

const filteredAgents = computed(() => {
  const search = query.value.trim().toLocaleLowerCase();

  return agents.value.filter((agent) => {
    const matchesSearch = !search || [
      agent.name,
      agent.description,
      agent.model,
      agent.status,
    ].some((value) => value.toLocaleLowerCase().includes(search));
    const matchesStatus = !statusFilter.value
      || agent.status === statusFilter.value;
    const matchesModel = !modelFilter.value
      || agent.model === modelFilter.value;

    return matchesSearch && matchesStatus && matchesModel;
  });
});

function selectAgent(id: number): void {
  selectedId.value = id;
  viewMode.value = "chat";
}

function showAgentCatalog(): void {
  viewMode.value = "list";
}

function openCreateModal(): void {
  newAgentName.value = "";
  isCreateOpen.value = true;
}

function createAgent(): void {
  const name = newAgentName.value.trim();

  if (!name) {
    return;
  }

  const workspaceId = activeWorkspaceId.value;
  const workspaceAgents = agentsByWorkspace.value[workspaceId]
    ?? (agentsByWorkspace.value[workspaceId] = []);
  const id = Date.now();

  workspaceAgents.push({
    id,
    name,
    description: "Новый агент без описания.",
    model: "GPT-4.1 mini",
    status: "Черновик",
    updated: "Сейчас",
    temperature: 0.4,
    instructions: "",
    messages: [],
  });
  selectedId.value = id;
  viewMode.value = "chat";
  isCreateOpen.value = false;
}

watch(activeWorkspaceId, () => {
  selectedId.value = null;
  query.value = "";
  statusFilter.value = "";
  modelFilter.value = "";
  draft.value = "";
  viewMode.value = "list";
  propertiesOpen.value = true;
  isCreateOpen.value = false;
});

watch(
  () => route.query.create,
  (create) => {
    if (create === "1") {
      openCreateModal();
    }
  },
  { immediate: true },
);

function openProperties(): void {
  if (isWideLayout.value) {
    propertiesOpen.value = true;
    return;
  }

  viewMode.value = "properties";
}

function closeProperties(): void {
  if (isWideLayout.value) {
    propertiesOpen.value = false;
    return;
  }

  viewMode.value = "chat";
}

function sendMessage(): void {
  const text = draft.value.trim();
  const agent = selectedAgent.value;

  if (!text || !agent) {
    return;
  }

  const now = new Intl.DateTimeFormat("ru", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());
  const messageId = Date.now();

  agent.messages.push({
    id: messageId,
    text,
    time: now,
    outgoing: true,
  });
  agent.messages.push({
    id: messageId + 1,
    text: "Тестовый ответ агента на сообщение оператора.",
    time: now,
    outgoing: false,
  });
  agent.updated = "Сейчас";
  draft.value = "";
}

function syncWideLayout(event: MediaQueryListEvent | MediaQueryList): void {
  isWideLayout.value = event.matches;
}

onMounted(() => {
  wideLayoutQuery = window.matchMedia("(min-width: 1280px)");
  syncWideLayout(wideLayoutQuery);
  wideLayoutQuery.addEventListener("change", syncWideLayout);
});

onBeforeUnmount(() => {
  wideLayoutQuery?.removeEventListener("change", syncWideLayout);
});
</script>

<style scoped lang="scss">
.tr-agents__catalog {
  min-height: 0;
  overflow-y: auto;
  padding: 2px;
}

.tr-agents__grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1rem;
  padding-bottom: 1rem;
}

.tr-agent-card {
  min-width: 0;
  min-height: 220px;
  display: flex;
  align-items: stretch;
  flex-direction: column;
  gap: 0.75rem;
  color: var(--tr-text);
  font: inherit;
  text-align: start;
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;
}

.tr-agent-card:hover {
  border-color: var(--tr-primary);
  transform: translateY(-2px);
}

.tr-agent-card:focus-visible {
  outline: 3px solid rgb(142 100 206 / 0.24);
  outline-offset: 2px;
}

.tr-agent-card__header,
.tr-agent-card__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.tr-agent-card__icon,
.tr-agent-card__create-icon {
  display: inline-grid;
  place-items: center;
  color: var(--tr-primary);
  background: transparent;
  border: 0;
}

.tr-agent-card__icon {
  width: 44px;
  height: 44px;
  border-radius: 50%;
}

.tr-agent-card__title {
  overflow: hidden;
  color: var(--tr-text-strong);
  font-size: 1.125rem;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tr-agent-card__description {
  display: -webkit-box;
  overflow: hidden;
  color: var(--tr-text-muted);
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
}

.tr-agent-card__footer {
  align-items: flex-end;
  margin-top: auto;
  padding-top: 0.75rem;
  color: var(--tr-text-muted);
  border-top: 1px solid var(--tr-divider);
  font-size: 0.75rem;
}

.tr-agent-card__footer span:last-child {
  text-align: end;
}

.tr-agent-card--create {
  align-items: center;
  justify-content: center;
  color: var(--tr-text-muted);
  text-align: center;
  background: transparent;
  border-style: dashed;
  box-shadow: none;
}

.tr-agent-card--create strong {
  color: var(--tr-text-strong);
  font-size: 1.125rem;
  font-weight: 600;
}

.tr-agent-card--create > span:last-child {
  max-width: 280px;
}

.tr-agent-card__create-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
}

.tr-agents__empty {
  min-height: 220px;
  display: grid;
  place-items: center;
  margin: 0;
  padding: 1.25rem;
  color: var(--tr-text-muted);
  text-align: center;
}

.tr-agents__workbench {
  grid-template-columns: minmax(0, 2fr) minmax(280px, 1fr);
}

.tr-agents__workbench:not(.is-properties-open) {
  grid-template-columns: minmax(0, 1fr);
}

.tr-agents__workbench .tr-conversations__list-action {
  display: inline-flex;
}

@media (max-width: 1024px) {
  .tr-agents__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 768px) {
  .tr-agents__grid {
    grid-template-columns: 1fr;
  }

  .tr-agent-card {
    min-height: 200px;
  }
}
</style>
