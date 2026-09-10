<template>
  <section class="tr-workbench-page">
    <header
      v-if="viewMode === 'list'"
      class="tr-workbench-page__header tr-page-toolbar"
    >
      <ToolbarSearch
        v-model="query"
        class="tr-page-toolbar__search"
        placeholder="Поиск по агентам"
      />

      <ToolbarDropdown
        v-model="statusFilter"
        class="tr-page-toolbar__filter"
        aria-label="Фильтр агентов по статусу"
        all-label="Все статусы"
        :options="agentStatuses"
      />

      <ToolbarDropdown
        v-model="modelFilter"
        class="tr-page-toolbar__filter"
        aria-label="Фильтр агентов по модели"
        all-label="Все модели"
        :options="agentModels"
      />

      <MobileFilters :active="Boolean(statusFilter || modelFilter)">
        <b-field label="Статус">
          <b-select v-model="statusFilter" expanded>
            <option value="">Все статусы</option>
            <option v-for="status in agentStatuses" :key="status">
              {{ status }}
            </option>
          </b-select>
        </b-field>

        <b-field label="Модель">
          <b-select v-model="modelFilter" expanded>
            <option value="">Все модели</option>
            <option v-for="model in agentModels" :key="model">
              {{ model }}
            </option>
          </b-select>
        </b-field>
      </MobileFilters>
    </header>

    <Loader v-if="viewMode === 'list' && isLoading" size="section" />

    <section
      v-else-if="viewMode === 'list'"
      class="tr-catalog"
      aria-label="Список агентов"
    >
      <div class="tr-catalog-grid">
        <button
          v-for="agent in filteredAgents"
          :key="agent.id"
          class="tr-card tr-card--interactive tr-entity-card tr-entity-card--interactive"
          type="button"
          @click="selectAgent(agent.id)"
        >
          <span class="tr-entity-card__header">
            <span class="tr-icon-tile tr-icon-tile--plain tr-entity-card__icon">
              <b-icon icon="robot-outline" size="is-medium" />
            </span>
            <b-tag
              :type="agent.status === 'Активен' ? 'is-primary' : undefined"
              size="is-small"
            >
              {{ agent.status }}
            </b-tag>
          </span>

          <strong class="tr-entity-card__title">{{ agent.name }}</strong>
          <span class="tr-entity-card__description">
            {{ agent.description }}
          </span>

          <span class="tr-entity-card__footer">
            <span>{{ agent.model }}</span>
            <span>Обновлён {{ agent.updated }}</span>
          </span>
        </button>

        <p
          v-if="filteredAgents.length === 0 && hasActiveAgentFilters"
          class="tr-catalog-empty"
        >
          По вашему запросу агенты не найдены.
        </p>

        <button
          class="tr-card tr-card--interactive tr-entity-card tr-entity-card--interactive tr-entity-card--create"
          type="button"
          @click="openCreateModal"
        >
          <span class="tr-icon-tile tr-icon-tile--plain tr-entity-card__create-icon">
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
        class="tr-conversation-panel tr-conversation-chat"
      >
        <header class="tr-conversation-header">
          <b-button
            class="tr-conversation-list-action tr-conversation-icon-action"
            icon-left="arrow-left"
            aria-label="К агентам"
            title="К агентам"
            @click="showAgentCatalog"
          />

          <div class="tr-conversation-identity">
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
            class="tr-conversation-settings-action tr-conversation-icon-action"
            icon-left="cog-outline"
            aria-label="Открыть настройки агента"
            title="Открыть настройки агента"
            @click="openProperties"
          />
        </header>

        <div class="tr-conversation-messages" aria-live="polite">
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

        <footer class="tr-conversation-composer">
          <b-input
            v-model="draft"
            class="tr-conversation-composer-input"
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
        class="tr-conversation-panel tr-conversation-properties"
      >
        <header class="tr-conversation-header">
          <b-button
            class="tr-conversation-properties-action tr-conversation-icon-action"
            icon-left="arrow-left"
            aria-label="К песочнице"
            title="К песочнице"
            @click="viewMode = 'chat'"
          />
          <h2 class="tr-conversation-title">Настройки</h2>
          <b-button
            class="tr-conversation-properties-close tr-conversation-icon-action"
            icon-left="close"
            aria-label="Закрыть настройки агента"
            title="Закрыть настройки агента"
            @click="closeProperties"
          />
        </header>

        <div class="tr-conversation-properties-body">
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

<script setup>
import { storeToRefs } from "pinia";
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";

import { useSimulatedLoading } from "../composables/useSimulatedLoading";
import { useWorkspaceStore } from "../stores/workspace";
import Loader from "./common/Loader.vue";
import MobileFilters from "./MobileFilters.vue";
import ToolbarDropdown from "./ToolbarDropdown.vue";
import ToolbarSearch from "./ToolbarSearch.vue";

const { isLoading } = useSimulatedLoading();

/** @typedef {"list" | "chat" | "properties"} ViewMode */

/**
 * @typedef {Object} SandboxMessage
 * @property {number} id
 * @property {string} text
 * @property {string} time
 * @property {boolean} outgoing
 */

/**
 * @typedef {Object} Agent
 * @property {number} id
 * @property {string} name
 * @property {string} description
 * @property {string} model
 * @property {string} status
 * @property {string} updated
 * @property {number} temperature
 * @property {string} instructions
 * @property {SandboxMessage[]} messages
 */

const query = ref("");
const statusFilter = ref("");
const modelFilter = ref("");
const draft = ref("");
const selectedId = ref(/** @type {number | null} */ (null));
/** @type {import("vue").Ref<ViewMode>} */
const viewMode = ref("list");
const propertiesOpen = ref(true);
const isWideLayout = ref(false);
const isCreateOpen = ref(false);
const newAgentName = ref("");
/** @type {MediaQueryList | null} */
let wideLayoutQuery = null;
const workspaceStore = useWorkspaceStore();
const { activeWorkspaceId } = storeToRefs(workspaceStore);
const route = useRoute();

const agentStatuses = ["Активен", "Черновик", "Приостановлен"];
const agentModels = ["GPT-4.1 mini", "GPT-4.1", "GPT-4o mini"];

/** @type {Agent[]} */
const demoAgents = [
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

/** @type {import("vue").Ref<Record<string, Agent[]>>} */
const agentsByWorkspace = ref({
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

/**
 * @param {number} id
 */
function selectAgent(id) {
  selectedId.value = id;
  viewMode.value = "chat";
}

function showAgentCatalog() {
  viewMode.value = "list";
}

function openCreateModal() {
  newAgentName.value = "";
  isCreateOpen.value = true;
}

function createAgent() {
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

function openProperties() {
  if (isWideLayout.value) {
    propertiesOpen.value = true;
    return;
  }

  viewMode.value = "properties";
}

function closeProperties() {
  if (isWideLayout.value) {
    propertiesOpen.value = false;
    return;
  }

  viewMode.value = "chat";
}

function sendMessage() {
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

/**
 * @param {MediaQueryListEvent | MediaQueryList} event
 */
function syncWideLayout(event) {
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
