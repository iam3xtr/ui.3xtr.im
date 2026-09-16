<template>
  <section class="tr-workbench-page">
    <Loader v-if="loading" size="section" />

    <AsyncState
      v-else-if="demoStore.isPermissionDenied"
      variant="permission-denied"
      v-bind="demoStore.permissionDeniedState"
    />

    <template v-else>
      <Toolbar
        v-model:search="query"
        class="tr-workbench-page__header"
        search-placeholder="Поиск коллекций"
        :filters-active="Boolean(typeFilter)"
      >
        <template #filters>
          <ToolbarDropdown
            v-model="typeFilterProxy"
            class="tr-page-toolbar__filter"
            aria-label="Фильтр коллекций по типу"
            all-label="Все типы"
            :options="collectionTypeOptions"
          />
        </template>
      </Toolbar>

      <b-message
        v-if="demoStore.isPartial"
        type="is-warning"
        :closable="false"
      >
        Показаны не все коллекции: часть списка недоступна из-за временной
        ошибки. Остальной каталог ниже — актуален.
      </b-message>

      <ListAsyncState
        v-bind="demoStore.listAsyncState"
        :empty="collections.length === 0 || demoStore.isEmpty"
        empty-icon="book-outline"
        empty-title="Здесь пока нет коллекций"
        empty-message="Создайте первую коллекцию, чтобы добавить файлы, ссылки или текст."
      >
        <template #empty-action>
          <b-button type="is-primary" @click="openCreateModal">
            Создать коллекцию
          </b-button>
        </template>

        <section class="tr-catalog" aria-label="Коллекции знаний">
          <div class="tr-catalog-grid">
            <RouterLink
              v-for="collection in displayCollections"
              :key="collection._demoKey ?? collection.id"
              :to="{ name: 'knowledge-collection', params: { id: collection.id } }"
              class="tr-card tr-card--interactive tr-entity-card tr-entity-card--interactive"
            >
              <span class="tr-entity-card__header">
                <span class="tr-icon-tile tr-icon-tile--plain tr-entity-card__icon">
                  <b-icon
                    :icon="getCollectionType(collection.type).icon"
                    size="is-medium"
                  />
                </span>
                <b-tag size="is-small">
                  {{ getCollectionType(collection.type).label }}
                </b-tag>
              </span>

              <strong class="tr-entity-card__title">
                {{ collection.name }}
              </strong>
              <span class="tr-entity-card__description">
                {{ collection.description }}
              </span>

              <span class="tr-entity-card__footer">
                <span>{{ collection.objects.length }} элементов</span>
                <b-icon icon="arrow-right" size="is-small" />
              </span>
            </RouterLink>

            <p
              v-if="filteredCollections.length === 0 && hasActiveFilters"
              class="tr-catalog-empty"
            >
              По вашему запросу коллекции не найдены.
            </p>

            <button
              class="tr-card tr-card--interactive tr-entity-card tr-entity-card--interactive tr-entity-card--create"
              type="button"
              @click="openCreateModal"
            >
              <span class="tr-icon-tile tr-icon-tile--plain tr-entity-card__create-icon">
                <b-icon icon="plus" size="is-medium" />
              </span>
              <strong>Создать новую коллекцию</strong>
              <span>Добавьте файлы, ссылки или Markdown-документы.</span>
            </button>
          </div>
        </section>
      </ListAsyncState>
    </template>

    <CollectionFormModal />
  </section>
</template>

<script setup>
import { storeToRefs } from "pinia";
import { computed, ref, watch } from "vue";
import { RouterLink } from "vue-router";

import { useSimulatedLoading } from "../composables/useSimulatedLoading";
import { COLLECTION_TYPES, useKnowledgeStore } from "../stores/knowledge";
import { useDemoStore } from "../stores/demo";
import { useModalStore } from "../stores/modal";
import { useWorkspaceStore } from "../stores/workspace";
import { AsyncState, ListAsyncState, Loader, Toolbar, ToolbarDropdown } from "@iam3xtr/vue";
import CollectionFormModal from "./knowledge/CollectionFormModal.vue";

// Каталог коллекций (Task A5.6) — теперь только каталог: детали коллекции
// живут за собственными маршрутами `/knowledge/:id(...)`, обслуживаемыми
// route-driven shell'ом `knowledge/CollectionDetail.vue` (тот же приём, что
// `Agents.vue` + `agents/AgentDetail.vue` в Task A5.4), а не внутренним
// `selectedId`, как было до этой задачи.
//
// Demo-режим (Stage A7, Task A7.4) — тот же контракт, что `Agents.vue`/
// `ChannelsView.vue`/`Conversations.vue` (Task A7.3): loading/empty/error
// через `ListAsyncState`, permission-denied прямым `AsyncState`, partial —
// `b-message`-баннером поверх доступных карточек; «много данных»/«длинные
// подписи» — только в `displayCollections`, presentation-only, без записи в
// `useKnowledgeStore()`.
const { isLoading } = useSimulatedLoading();
const demoStore = useDemoStore();
const modalStore = useModalStore();
const knowledgeStore = useKnowledgeStore();

/** @typedef {import("../stores/knowledge").CollectionType} CollectionType */

const collectionTypes = COLLECTION_TYPES;

const workspaceStore = useWorkspaceStore();
const { activeWorkspaceId } = storeToRefs(workspaceStore);
const query = ref("");
/** @type {import("vue").Ref<CollectionType | "">} */
const typeFilter = ref("");
const typeFilterProxy = computed({
  get: () => typeFilter.value,
  set: (value) => {
    typeFilter.value = value;
  },
});
const collectionTypeOptions = computed(
  () => collectionTypes.map((type) => ({ value: type.value, label: type.label })),
);

const loading = computed(() => isLoading.value || demoStore.isLoading);

const collections = computed(
  () => knowledgeStore.listByWorkspace(activeWorkspaceId.value),
);
const hasActiveFilters = computed(
  () => Boolean(query.value.trim() || typeFilter.value),
);
const filteredCollections = computed(() => {
  const search = query.value.trim().toLocaleLowerCase();

  return collections.value.filter((collection) => {
    const matchesSearch = !search
      || [collection.name, collection.description]
        .some((value) => value.toLocaleLowerCase().includes(search));
    const matchesType = !typeFilter.value
      || collection.type === typeFilter.value;

    return matchesSearch && matchesType;
  });
});

// Плотность и длина подписей каталога коллекций для demo-режима
// (Task A7.4) — presentation-проекция `filteredCollections`, ничего не
// пишет в `useKnowledgeStore()`. Клик по дублю по-прежнему ведёт на тот же
// реальный `id`; `_demoKey` — служебный ключ `v-for` для дублей.
const DENSE_TARGET_COUNT = 24;
const LONG_LABEL_SUFFIX = " — демонстрационное длинное название для проверки переноса строк в карточке коллекции";

const displayCollections = computed(() => {
  let list = filteredCollections.value;

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
    list = list.map((collection) => ({
      ...collection,
      name: `${collection.name}${LONG_LABEL_SUFFIX}`,
      description: `${collection.description}${LONG_LABEL_SUFFIX}`,
    }));
  }

  return list;
});

/**
 * @param {CollectionType} type
 */
function getCollectionType(type) {
  return knowledgeStore.getCollectionType(type);
}

function openCreateModal() {
  modalStore.open("knowledge-collection-form");
}

watch(
  activeWorkspaceId,
  () => {
    query.value = "";
    typeFilter.value = "";
  },
  { flush: "sync" },
);
</script>
