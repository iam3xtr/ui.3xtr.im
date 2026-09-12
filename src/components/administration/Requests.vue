<template>
  <section class="tr-workbench-page tr-administration-requests">
    <div class="tr-page-header">
      <div>
        <h1 class="tr-page-title">Запросы</h1>
        <p class="tr-page-subtitle">
          Облегчённый лог запросов к моделям — presentation-каталог без форм и API.
        </p>
      </div>
    </div>

    <Toolbar
      v-model:search="query"
      class="tr-workbench-page__header"
      search-placeholder="Поиск запросов"
      :filters-active="Boolean(statusFilter)"
    >
      <template #filters>
        <ToolbarDropdown
          v-model="statusFilter"
          class="tr-page-toolbar__filter"
          aria-label="Фильтр запросов по статусу"
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
        Показаны не все запросы: часть лога недоступна из-за временной
        ошибки. Остальной лог ниже — актуален.
      </b-message>

      <ListAsyncState
        v-bind="demoStore.listAsyncState"
        :empty="requests.length === 0 || demoStore.isEmpty"
        empty-icon="history"
        empty-title="Здесь пока нет запросов"
      >
        <b-table :data="filteredRequests" hoverable mobile-cards>
          <b-table-column field="id" label="ID" v-slot="{ row }">
            #{{ row.id }}
          </b-table-column>

          <b-table-column field="model" label="Модель" v-slot="{ row }">
            {{ row.model }}
          </b-table-column>

          <b-table-column field="workspace" label="Пространство" v-slot="{ row }">
            {{ row.workspace }}
          </b-table-column>

          <b-table-column field="tokens" label="Токены" v-slot="{ row }">
            {{ row.tokens }}
          </b-table-column>

          <b-table-column field="status" label="Статус" v-slot="{ row }">
            <b-tag :type="row.status === 'Успех' ? 'is-primary' : 'is-danger'" size="is-small">
              {{ row.status }}
            </b-tag>
          </b-table-column>

          <b-table-column field="created" label="Создан" v-slot="{ row }">
            {{ row.created }}
          </b-table-column>

          <template #empty>
            <AsyncState
              variant="no-results"
              icon="magnify"
              title="Запросы не найдены"
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

// Облегчённый лог запросов к моделям (Task A8.3) — см. `Users.vue` для
// общего контракта demo-режима/каталога. Не имеет маршрута-аналога верхнего
// уровня в get.3xtr.im (там лог запросов открывается только вложенно, из
// `models/:id/requests`, и есть только детальный `/requests/:id`) —
// задокументированный кит-only верхнеуровневый пробел, см.
// `docs/design-system.md`, «Route families».
const { isLoading } = useSimulatedLoading();
const demoStore = useDemoStore();
const administrationStore = useAdministrationStore();

const loading = computed(() => isLoading.value || demoStore.isLoading);

const requests = computed(() => administrationStore.requests);

const query = ref("");
const statusFilter = ref("");
const statusOptions = ["Успех", "Ошибка"];

const filteredRequests = computed(() => {
  const search = query.value.trim().toLocaleLowerCase();

  return requests.value.filter((request) => {
    const matchesSearch = !search
      || [request.model, request.workspace, String(request.id)].some(
        (value) => value.toLocaleLowerCase().includes(search),
      );
    const matchesStatus = !statusFilter.value || request.status === statusFilter.value;

    return matchesSearch && matchesStatus;
  });
});
</script>
