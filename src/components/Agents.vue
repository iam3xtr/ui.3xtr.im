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
          <b-button type="is-primary" @click="openAgentWizard">
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
                  :type="statusProjection(agent).badgeType"
                  size="is-small"
                >
                  {{ statusProjection(agent).badgeLabel }}
                </b-tag>
              </span>

              <strong class="tr-entity-card__title">{{ agent.name }}</strong>
              <span class="tr-entity-card__description">
                {{ agent.description }}
              </span>

              <!--
                S2 (Task A9.6, `.plan` "Система статусов"): сбой одного канала
                не подменяет основной статус — только поясняет его отдельной
                строкой, не только цветом бейджа.
              -->
              <span
                v-if="statusProjection(agent).needsAttention"
                class="tr-entity-card__description tr-muted"
              >
                {{ statusProjection(agent).attentionMessage }}
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
              @click="openAgentWizard"
            >
              <span class="tr-icon-tile tr-icon-tile--plain tr-entity-card__create-icon">
                <b-icon icon="plus" size="is-medium" />
              </span>
              <strong>Создать нового агента</strong>
              <span>Настройте инструкции и протестируйте агента в песочнице.</span>
            </button>
          </div>

          <!--
            Лимит/capability не скрывает вход, а только поясняет его — Stage
            A9 `.plan`, «Общий вход и жизненный цикл мастера». Presentation
            only: сам тариф ничего не блокирует, реального permission API кит
            не имитирует (see docs/design-system.md, "Мастер создания
            агента").
          -->
          <p v-if="createLimitNote" class="tr-muted">
            {{ createLimitNote }}
          </p>
        </section>
      </ListAsyncState>
    </template>
  </section>
</template>

<script setup>
import { storeToRefs } from "pinia";
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

import { useSimulatedLoading } from "../composables/useSimulatedLoading";
import { AGENT_STATUSES, getAgentModelId, getAgentStatusProjection, useAgentsStore } from "../stores/agents";
import { useChannelsStore } from "../stores/channels";
import { useDemoStore } from "../stores/demo";
import { getModelClassLabel, MODEL_CLASS_IDS, useModelsStore } from "../stores/models";
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
const agentsStore = useAgentsStore();
const channelsStore = useChannelsStore();
const modelsStore = useModelsStore();
const workspaceStore = useWorkspaceStore();
const { activeWorkspaceId, activeWorkspaceTariff } = storeToRefs(workspaceStore);
const route = useRoute();
const router = useRouter();

const loading = computed(() => isLoading.value || demoStore.isLoading);

const query = ref("");
const statusFilter = ref("");
const modelFilter = ref("");

const agentStatuses = AGENT_STATUSES;
// Фильтр строится по классам модели (`src/stores/models.js`, Task A9.5), а не
// по сырому каталогу моделей — младший тариф не должен заново узнавать
// конкретные модели на этом экране, раз мастер уже прячет их за классами
// (Stage A9 `.plan` decision 4, post-review fix). value — classId (сравнимый
// с `getModel(...)?.classId`), label — тот же короткий русский лейбл класса,
// что показывает каталог агента ниже.
const agentModels = computed(
  () => MODEL_CLASS_IDS.map((classId) => ({ value: classId, label: getModelClassLabel(classId) })),
);

const agents = computed(
  () => agentsStore.listByWorkspace(activeWorkspaceId.value),
);

const hasActiveAgentFilters = computed(
  () => Boolean(query.value.trim() || statusFilter.value || modelFilter.value),
);

/**
 * Подпись эффективной модели агента (обычной или BYOK — см.
 * `getAgentModelId`) для карточки каталога и полнотекстового поиска — класс
 * модели (Task A9.5), не сырое каталожное имя (post-review fix, тот же
 * `.plan` decision 4, что и `agentModels`): каталог/фильтр не должны
 * заставлять узнавать конкретные модели там, где мастер их уже прячет.
 * Свободный BYOK-идентификатор (`vendor/model`) не резолвится каталогом и не
 * относится ни к одному классу — показывается как есть, а не как пустая
 * строка/`undefined`.
 *
 * @param {import("../stores/agents").Agent} agent
 * @returns {string}
 */
function agentModelLabel(agent) {
  const modelId = getAgentModelId(agent);
  if (!modelId) {
    return "";
  }

  const model = modelsStore.getModel(modelId);
  return model ? getModelClassLabel(model.classId) : modelId;
}

/**
 * S2 card projection (Task A9.6): derived from the agent's own lifecycle and
 * its channels, not a second source of truth — see
 * `stores/agents.js#getAgentStatusProjection`. Demo density clones
 * (`displayAgents`, `_demoKey`) keep the original numeric `id`, so this still
 * resolves the same real channel list as the entity they clone.
 *
 * @param {import("../stores/agents").Agent} agent
 * @returns {import("../stores/agents").AgentStatusProjection}
 */
function statusProjection(agent) {
  return getAgentStatusProjection(
    agent,
    channelsStore.listByAgent(activeWorkspaceId.value, agent.id),
  );
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
    // Фильтр сравнивает по классу модели, не по сырому id (post-review fix,
    // см. `agentModels`/`agentModelLabel`) — BYOK-модель вне каталога не
    // относится ни к одному классу и просто не совпадёт ни с одним фильтром.
    const matchesModel = !modelFilter.value
      || modelsStore.getModel(getAgentModelId(agent))?.classId === modelFilter.value;

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

// Единственная точка входа в создание агента (Stage A9, Task A9.2): все
// триггеры каталога ведут в общий route-driven мастер вместо отдельной
// локальной формы — см. `src/components/agents/AgentWizard.vue`.
function openAgentWizard() {
  router.push({ name: "agent-wizard" });
}

// Лимит/capability не скрывает вход, а поясняет его (Stage A9 `.plan`) — по
// текущему fixture-контракту нет отдельного лимита на число агентов, только
// общая осведомлённость о тарифе; presentation-only, ничего не блокирует.
const createLimitNote = computed(() => (
  activeWorkspaceTariff.value.displayName === "Free"
    ? "Тариф Free ограничивает часть возможностей агентов — подробности в разделе «Тариф»."
    : ""
));

watch(activeWorkspaceId, () => {
  query.value = "";
  statusFilter.value = "";
  modelFilter.value = "";
});

// `/agents?create=1` — тот же общий вход, что и остальные триггеры каталога:
// вместо локальной модалки редиректит в мастер, не оставляя query-параметр
// висеть после перехода.
watch(
  () => route.query.create,
  (create) => {
    if (create === "1") {
      router.replace({ name: "agent-wizard" });
    }
  },
  { immediate: true },
);
</script>
