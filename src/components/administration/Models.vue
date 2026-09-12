<template>
  <section class="tr-workbench-page tr-administration-models">
    <div class="tr-page-header">
      <div>
        <h1 class="tr-page-title">Модели</h1>
        <p class="tr-page-subtitle">
          Облегчённый справочник моделей платформы — presentation-каталог без форм и API.
        </p>
      </div>
    </div>

    <Toolbar
      v-model:search="query"
      class="tr-workbench-page__header"
      search-placeholder="Поиск моделей"
      :filters-active="Boolean(statusFilter)"
    >
      <template #filters>
        <ToolbarDropdown
          v-model="statusFilter"
          class="tr-page-toolbar__filter"
          aria-label="Фильтр моделей по статусу"
          all-label="Все статусы"
          :options="statusOptions"
        />
      </template>
    </Toolbar>

    <Loader v-if="loading" size="section" />

    <template v-else>
      <b-message
        v-if="demoStore.isPartial"
        type="is-warning"
        :closable="false"
      >
        Показаны не все модели: часть списка недоступна из-за временной
        ошибки. Остальной каталог ниже — актуален.
      </b-message>

      <ListAsyncState
        v-bind="demoStore.listAsyncState"
        :empty="models.length === 0 || demoStore.isEmpty"
        empty-icon="brain"
        empty-title="Здесь пока нет моделей"
      >
        <b-table :data="filteredModels" hoverable mobile-cards>
          <b-table-column field="name" label="Модель" v-slot="{ row }">
            <strong>{{ row.name }}</strong>
          </b-table-column>

          <b-table-column field="providerName" label="Провайдер" v-slot="{ row }">
            {{ row.providerName }}
          </b-table-column>

          <b-table-column field="contextWindow" label="Контекст" v-slot="{ row }">
            {{ row.contextWindow }}
          </b-table-column>

          <b-table-column field="status" label="Статус" v-slot="{ row }">
            <b-tag :type="row.status === 'Включена' ? 'is-primary' : undefined" size="is-small">
              {{ row.status }}
            </b-tag>
          </b-table-column>

          <template #empty>
            <AsyncState
              variant="no-results"
              icon="magnify"
              title="Модели не найдены"
              message="Измените поисковый запрос или фильтр."
            />
          </template>
        </b-table>
      </ListAsyncState>
    </template>
  </section>
</template>

<script setup>
import { computed, ref } from "vue";

import { useSimulatedLoading } from "../../composables/useSimulatedLoading";
import { useAdministrationStore } from "../../stores/administration";
import { useDemoStore } from "../../stores/demo";
import AsyncState from "../common/AsyncState.vue";
import ListAsyncState from "../common/ListAsyncState.vue";
import Loader from "../common/Loader.vue";
import Toolbar from "../common/Toolbar.vue";
import ToolbarDropdown from "../common/ToolbarDropdown.vue";

// Облегчённый каталог моделей платформы (Task A8.3) — см. `Users.vue` для
// общего контракта demo-режима/каталога. Не связан с `stores/models.js`
// (BYOK-каталог агентов): это отдельный операторский платформенный
// fixture-домен для матчинга Sidebar-раздела «Администрирование», а не для
// выбора модели агентом.
const { isLoading } = useSimulatedLoading();
const demoStore = useDemoStore();
const administrationStore = useAdministrationStore();

const loading = computed(() => isLoading.value || demoStore.isLoading);

const models = computed(() => administrationStore.models);

const query = ref("");
const statusFilter = ref("");
const statusOptions = ["Включена", "Отключена"];

const filteredModels = computed(() => {
  const search = query.value.trim().toLocaleLowerCase();

  return models.value.filter((model) => {
    const matchesSearch = !search
      || [model.name, model.providerName].some(
        (value) => value.toLocaleLowerCase().includes(search),
      );
    const matchesStatus = !statusFilter.value || model.status === statusFilter.value;

    return matchesSearch && matchesStatus;
  });
});
</script>
