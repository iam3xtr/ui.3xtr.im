<template>
  <section class="tr-workbench-page tr-administration-providers">
    <div class="tr-page-header">
      <div>
        <h1 class="tr-page-title">Провайдеры</h1>
        <p class="tr-page-subtitle">
          Облегчённый справочник вендоров моделей — presentation-каталог без форм и API.
        </p>
      </div>
    </div>

    <Toolbar
      v-model:search="query"
      class="tr-workbench-page__header"
      search-placeholder="Поиск провайдеров"
      :filters-active="Boolean(statusFilter)"
    >
      <template #filters>
        <ToolbarDropdown
          v-model="statusFilter"
          class="tr-page-toolbar__filter"
          aria-label="Фильтр провайдеров по статусу"
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
        Показаны не все провайдеры: часть списка недоступна из-за временной
        ошибки. Остальной каталог ниже — актуален.
      </b-message>

      <ListAsyncState
        v-bind="demoStore.listAsyncState"
        :empty="providers.length === 0 || demoStore.isEmpty"
        empty-icon="connection"
        empty-title="Здесь пока нет провайдеров"
      >
        <b-table :data="filteredProviders" hoverable mobile-cards>
          <b-table-column field="name" label="Провайдер" v-slot="{ row }">
            <strong>{{ row.name }}</strong>
          </b-table-column>

          <b-table-column field="protocol" label="Протокол" v-slot="{ row }">
            <AdminMarker domain="protocol" :value="row.protocol" />
          </b-table-column>

          <b-table-column field="modelsCount" label="Модели" v-slot="{ row }">
            {{ row.modelsCount }}
          </b-table-column>

          <b-table-column field="status" label="Статус" v-slot="{ row }">
            <b-tag :type="row.status === 'Подключён' ? 'is-primary' : undefined" size="is-small">
              <AdminMarker domain="status" :value="row.status" />
            </b-tag>
          </b-table-column>

          <template #empty>
            <AsyncState
              variant="no-results"
              icon="magnify"
              title="Провайдеры не найдены"
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
import { AsyncState, ListAsyncState, Loader, Toolbar, ToolbarDropdown } from "@iam3xtr/vue";
import AdminMarker from "./AdminMarker.vue";

// Облегчённый каталог провайдеров моделей (Task A8.3) — см. `Users.vue` для
// общего контракта demo-режима/каталога. Не связан с
// `stores/models.js` (BYOK-каталог агентов): это отдельный операторский
// платформенный fixture-домен, не про выбор модели агентом.
const { isLoading } = useSimulatedLoading();
const demoStore = useDemoStore();
const administrationStore = useAdministrationStore();

const loading = computed(() => isLoading.value || demoStore.isLoading);

const providers = computed(() => administrationStore.providers);

const query = ref("");
const statusFilter = ref("");
const statusOptions = ["Подключён", "Отключён"];

const filteredProviders = computed(() => {
  const search = query.value.trim().toLocaleLowerCase();

  return providers.value.filter((provider) => {
    const matchesSearch = !search
      || [provider.name, provider.protocol].some(
        (value) => value.toLocaleLowerCase().includes(search),
      );
    const matchesStatus = !statusFilter.value || provider.status === statusFilter.value;

    return matchesSearch && matchesStatus;
  });
});
</script>
