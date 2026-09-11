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

    <Loader v-if="loading" size="section" />

    <AsyncState
      v-else-if="demoStore.isPermissionDenied"
      variant="permission-denied"
      v-bind="demoStore.permissionDeniedState"
    />

    <template v-else>
      <b-message
        v-if="demoStore.isPartial"
        type="is-warning"
        :closable="false"
      >
        Показаны не все агенты: часть списка недоступна из-за временной
        ошибки. Остальной каталог ниже — актуален.
      </b-message>

      <!--
        `loading` из `demoStore.listAsyncState` переопределён в false: этот
        блок и так рендерится только в v-else от внешнего `Loader`, который
        уже перехватил `demoStore.isLoading` выше — без переопределения
        одноимённое поле объекта осталось бы мёртвым и вводящим в заблуждение
        (структурно недостижимым в этой позиции).
      -->
      <ListAsyncState v-bind="demoStore.listAsyncState" :loading="false">
        <template #empty-action>
          <b-button type="is-primary" @click="openCreateModal">
            Создать нового агента
          </b-button>
        </template>

        <section class="tr-catalog" aria-label="Список агентов">
          <div class="tr-catalog-grid">
            <button
              v-for="agent in displayAgents"
              :key="agent._demoKey ?? agent.id"
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
      </ListAsyncState>
    </template>
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
import { useDemoStore } from "../stores/demo";
import { useModalStore } from "../stores/modal";
import { useModelsStore } from "../stores/models";
import { useWorkspaceStore } from "../stores/workspace";
import AsyncState from "./common/AsyncState.vue";
import ListAsyncState from "./common/ListAsyncState.vue";
import Loader from "./common/Loader.vue";
import Toolbar from "./common/Toolbar.vue";
import ToolbarDropdown from "./common/ToolbarDropdown.vue";

// Demo-режим (Stage A7, Task A7.3): каталог агентов читает
// `useDemoStore()` (Task A7.1) и рендерит loading/empty/error через
// `ListAsyncState`, permission-denied через прямой `AsyncState` (сам стор не
// включает его в `listAsyncState` — см. комментарий в `stores/demo.js`), а
// partial — банером `b-message` поверх доступного содержимого, не заменяя
// его. `ready` не меняет существующую логику — `filteredAgents` и её
// no-results-параграф остаются как есть; демо-переключатели «много данных»/
// «длинные подписи» — только в `displayAgents`, presentation-only.
const { isLoading } = useSimulatedLoading();
const demoStore = useDemoStore();
const modalStore = useModalStore();
const agentsStore = useAgentsStore();
const modelsStore = useModelsStore();
const workspaceStore = useWorkspaceStore();
const { activeWorkspaceId } = storeToRefs(workspaceStore);
const route = useRoute();
const router = useRouter();

const loading = computed(() => isLoading.value || demoStore.isLoading);

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

// Плотность и длина подписей карточек каталога для demo-режима
// (Task A7.3): чисто presentation-проекция `filteredAgents`, ничего не
// пишет в `useAgentsStore()`. `DENSE_TARGET_COUNT` — сколько карточек
// показать при «много данных», циклически повторяя существующие fixture-
// агенты (клик по дублю по-прежнему открывает тот же реальный агент — id не
// меняется, меняется только отображаемое имя и `_demoKey`, служебный ключ
// `v-for` для дублей с одинаковым `id`).
const DENSE_TARGET_COUNT = 24;
const LONG_LABEL_SUFFIX = " — демонстрационное длинное название для проверки переноса строк в карточке и панели фильтров";

const displayAgents = computed(() => {
  let list = filteredAgents.value;

  if (demoStore.denseData && list.length > 0 && list.length < DENSE_TARGET_COUNT) {
    const dense = [...list];
    let i = 0;
    while (dense.length < DENSE_TARGET_COUNT) {
      const source = list[i % list.length];
      const copyIndex = Math.floor(dense.length / list.length) + 1;
      dense.push({
        ...source,
        name: `${source.name} (${copyIndex})`,
        _demoKey: `${source.id}-dense-${dense.length}`,
      });
      i += 1;
    }
    list = dense;
  }

  if (demoStore.longLabels) {
    list = list.map((agent) => ({
      ...agent,
      name: `${agent.name}${LONG_LABEL_SUFFIX}`,
      description: `${agent.description}${LONG_LABEL_SUFFIX}`,
    }));
  }

  return list;
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
