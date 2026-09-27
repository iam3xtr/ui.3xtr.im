<template>
  <section class="tr-workbench-page tr-administration-tariffs">
    <div class="tr-page-header">
      <div>
        <h1 class="tr-page-title">Тарифы</h1>
        <p class="tr-page-subtitle">
          Облегчённый справочник тарифных планов платформы — presentation-каталог без форм и API.
        </p>
      </div>
    </div>

    <Toolbar
      v-model:search="query"
      class="tr-workbench-page__header"
      search-placeholder="Поиск тарифов"
      :filters-active="Boolean(statusFilter)"
    >
      <template #filters>
        <ToolbarDropdown
          v-model="statusFilter"
          class="tr-page-toolbar__filter"
          aria-label="Фильтр тарифов по статусу"
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
        Показаны не все тарифы: часть списка недоступна из-за временной
        ошибки. Остальной каталог ниже — актуален.
      </b-message>

      <ListAsyncState
        v-bind="demoStore.listAsyncState"
        :empty="tariffs.length === 0 || demoStore.isEmpty"
        empty-icon="tag-multiple-outline"
        empty-title="Здесь пока нет тарифов"
      >
        <b-table :data="filteredTariffs" hoverable mobile-cards>
          <b-table-column field="name" label="Тариф" v-slot="{ row }">
            <strong>{{ row.name }}</strong>
          </b-table-column>

          <b-table-column field="price" label="Цена" v-slot="{ row }">
            {{ row.price }}
          </b-table-column>

          <b-table-column field="membersLimit" label="Участники" v-slot="{ row }">
            {{ row.membersLimit }}
          </b-table-column>

          <b-table-column field="workspacesCount" label="Пространства" v-slot="{ row }">
            {{ row.workspacesCount }}
          </b-table-column>

          <b-table-column field="status" label="Статус" v-slot="{ row }">
            <b-tag :type="row.status === 'Активен' ? 'is-primary' : undefined" size="is-small">
              {{ row.status }}
            </b-tag>
          </b-table-column>

          <template #empty>
            <AsyncState
              variant="no-results"
              icon="magnify"
              title="Тарифы не найдены"
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

// Облегчённый каталог тарифных планов платформы (Task A8.3) — см.
// `Users.vue` для общего контракта demo-режима/каталога. Не связан с
// `WorkspacePlans.vue`/`TariffSelector.vue` (выбор тарифа конкретным
// рабочим пространством): это отдельный операторский список всех тарифов
// платформы, включая архивные, без интерактивного выбора.
const { isLoading } = useSimulatedLoading();
const demoStore = useDemoStore();
const administrationStore = useAdministrationStore();

const loading = computed(() => isLoading.value || demoStore.isLoading);

const tariffs = computed(() => administrationStore.tariffs);

const query = ref("");
const statusFilter = ref("");
const statusOptions = ["Активен", "Архив"];

const filteredTariffs = computed(() => {
  const search = query.value.trim().toLocaleLowerCase();

  return tariffs.value.filter((tariff) => {
    const matchesSearch = !search || tariff.name.toLocaleLowerCase().includes(search);
    const matchesStatus = !statusFilter.value || tariff.status === statusFilter.value;

    return matchesSearch && matchesStatus;
  });
});
</script>
