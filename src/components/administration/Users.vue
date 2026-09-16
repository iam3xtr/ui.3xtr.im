<template>
  <section class="tr-workbench-page tr-administration-users">
    <div class="tr-page-header">
      <div>
        <h1 class="tr-page-title">Пользователи</h1>
        <p class="tr-page-subtitle">
          Облегчённый справочник учётных записей платформы — presentation-каталог без форм и API.
        </p>
      </div>
    </div>

    <Toolbar
      v-model:search="query"
      class="tr-workbench-page__header"
      search-placeholder="Поиск пользователей"
      :filters-active="Boolean(statusFilter)"
    >
      <template #filters>
        <ToolbarDropdown
          v-model="statusFilter"
          class="tr-page-toolbar__filter"
          aria-label="Фильтр пользователей по статусу"
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
        Показаны не все пользователи: часть списка недоступна из-за временной
        ошибки. Остальной каталог ниже — актуален.
      </b-message>

      <ListAsyncState
        v-bind="demoStore.listAsyncState"
        :empty="users.length === 0 || demoStore.isEmpty"
        empty-icon="account-multiple-outline"
        empty-title="Здесь пока нет пользователей"
      >
        <b-table :data="filteredUsers" hoverable mobile-cards>
          <b-table-column field="name" label="Пользователь" v-slot="{ row }">
            <strong>{{ row.name }}</strong>
            <br>
            <small class="tr-muted">{{ row.email }}</small>
          </b-table-column>

          <b-table-column field="role" label="Роль" v-slot="{ row }">
            {{ row.role }}
          </b-table-column>

          <b-table-column field="workspaces" label="Пространства" v-slot="{ row }">
            {{ row.workspaces }}
          </b-table-column>

          <b-table-column field="status" label="Статус" v-slot="{ row }">
            <b-tag :type="row.status === 'Активен' ? 'is-primary' : 'is-danger'" size="is-small">
              {{ row.status }}
            </b-tag>
          </b-table-column>

          <b-table-column field="lastActive" label="Последняя активность" v-slot="{ row }">
            {{ row.lastActive }}
          </b-table-column>

          <template #empty>
            <AsyncState
              variant="no-results"
              icon="magnify"
              title="Пользователи не найдены"
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

// Облегчённый каталог пользователей (Task A8.3) — платформенный, не
// per-workspace список (в отличие от `workspace/Members.vue`): читает
// `useAdministrationStore()` напрямую, без `activeWorkspaceId`. Demo-режим —
// упрощённый по сравнению с остальными каталогами (Task A7.3): только
// loading/empty/error через `ListAsyncState` и partial `b-message`-баннером
// поверх доступной таблицы — эта административная поверхность не моделирует
// отказ в доступе/нехватку прав (Task A8.3). Табличный, а не карточный
// паттерн — записи однородны по набору полей, см.
// `docs/design-system.md`, «Списки: каталог карточек или таблица».
const { isLoading } = useSimulatedLoading();
const demoStore = useDemoStore();
const administrationStore = useAdministrationStore();

const loading = computed(() => isLoading.value || demoStore.isLoading);

const users = computed(() => administrationStore.users);

const query = ref("");
const statusFilter = ref("");
const statusOptions = ["Активен", "Заблокирован"];

const filteredUsers = computed(() => {
  const search = query.value.trim().toLocaleLowerCase();

  return users.value.filter((user) => {
    const matchesSearch = !search
      || [user.name, user.email, user.role].some(
        (value) => value.toLocaleLowerCase().includes(search),
      );
    const matchesStatus = !statusFilter.value || user.status === statusFilter.value;

    return matchesSearch && matchesStatus;
  });
});
</script>
