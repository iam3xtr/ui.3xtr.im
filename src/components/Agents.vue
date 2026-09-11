<template>
  <section class="tr-workbench-page">
    <Toolbar
      class="tr-workbench-page__header"
      v-model:search="query"
      search-placeholder="Поиск по агентам"
      :filters-active="Boolean(statusFilter || modelFilter)"
    >
      <template #filters>
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
      </template>
    </Toolbar>

    <Loader v-if="isLoading" size="section" />

    <section v-else class="tr-catalog" aria-label="Список агентов">
      <div class="tr-catalog-grid">
        <button
          v-for="agent in filteredAgents"
          :key="agent.id"
          class="tr-card tr-card--interactive tr-entity-card tr-entity-card--interactive"
          type="button"
          @click="openAgent(agent.id)"
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
            <span>{{ agentModelLabel(agent) }}</span>
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
  </section>

  <b-modal
    :model-value="modalStore.isOpen('agents-create')"
    has-modal-card
    @update:model-value="(value) => (value ? modalStore.open('agents-create') : modalStore.close('agents-create'))"
  >
    <form class="modal-card" @submit.prevent="createAgent">
      <header class="modal-card-head">
        <p class="modal-card-title">Новый агент</p>
        <button
          class="delete"
          type="button"
          aria-label="Закрыть"
          @click="modalStore.close('agents-create')"
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
        <b-button @click="modalStore.close('agents-create')">
          Отмена
        </b-button>
        <b-button native-type="submit" type="is-primary">
          Создать
        </b-button>
      </footer>
    </form>
  </b-modal>
</template>

<script setup>
import { storeToRefs } from "pinia";
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

import { useSimulatedLoading } from "../composables/useSimulatedLoading";
import { AGENT_STATUSES, getAgentModelId, useAgentsStore } from "../stores/agents";
import { useModalStore } from "../stores/modal";
import { useModelsStore } from "../stores/models";
import { useWorkspaceStore } from "../stores/workspace";
import Loader from "./common/Loader.vue";
import Toolbar from "./common/Toolbar.vue";
import ToolbarDropdown from "./common/ToolbarDropdown.vue";

const { isLoading } = useSimulatedLoading();
const modalStore = useModalStore();
const agentsStore = useAgentsStore();
const modelsStore = useModelsStore();
const workspaceStore = useWorkspaceStore();
const { activeWorkspaceId } = storeToRefs(workspaceStore);
const route = useRoute();
const router = useRouter();

const query = ref("");
const statusFilter = ref("");
const modelFilter = ref("");
const newAgentName = ref("");

const agentStatuses = AGENT_STATUSES;
// Фильтр строится из реального каталога моделей (`src/stores/models.js`,
// Task A6.1), а не из устаревшего списка отображаемых имён — value остаётся
// каталожным UID (сравнимым с `getAgentModelId`), label — читаемым именем.
const agentModels = computed(
  () => modelsStore.models.map((model) => ({ value: model.id, label: model.name })),
);

const agents = computed(
  () => agentsStore.listByWorkspace(activeWorkspaceId.value),
);

const hasActiveAgentFilters = computed(
  () => Boolean(query.value.trim() || statusFilter.value || modelFilter.value),
);

/**
 * Читаемое имя эффективной модели агента (обычной или BYOK — см.
 * `getAgentModelId`) для карточки каталога и полнотекстового поиска.
 * Свободный BYOK-идентификатор (`vendor/model`) не резолвится каталогом —
 * показывается как есть, а не как пустая строка/`undefined`.
 *
 * @param {import("../stores/agents").Agent} agent
 * @returns {string}
 */
function agentModelLabel(agent) {
  const modelId = getAgentModelId(agent);
  if (!modelId) {
    return "";
  }

  return modelsStore.getModel(modelId)?.name ?? modelId;
}

const filteredAgents = computed(() => {
  const search = query.value.trim().toLocaleLowerCase();

  return agents.value.filter((agent) => {
    const matchesSearch = !search || [
      agent.name,
      agent.description,
      agentModelLabel(agent),
      agent.status,
    ].some((value) => value.toLocaleLowerCase().includes(search));
    const matchesStatus = !statusFilter.value
      || agent.status === statusFilter.value;
    const matchesModel = !modelFilter.value
      || getAgentModelId(agent) === modelFilter.value;

    return matchesSearch && matchesStatus && matchesModel;
  });
});

/**
 * @param {number} id
 */
function openAgent(id) {
  router.push({ name: "agent", params: { id } });
}

function openCreateModal() {
  newAgentName.value = "";
  modalStore.open("agents-create");
}

function createAgent() {
  const name = newAgentName.value.trim();

  if (!name) {
    return;
  }

  const agent = agentsStore.createAgent(activeWorkspaceId.value, name);

  modalStore.close("agents-create");
  openAgent(agent.id);
}

watch(activeWorkspaceId, () => {
  query.value = "";
  statusFilter.value = "";
  modelFilter.value = "";
  modalStore.close("agents-create");
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
</script>
