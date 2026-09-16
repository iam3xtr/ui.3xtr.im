<template>
  <!--
    Таблицы (Task A8.6): b-table модификаторы и пагинация — часть прежней
    единой `/kit` (Task A5.3), разделённой на маршрутные подразделы.
  -->
  <PageHeader
    title="Таблицы"
    subtitle="Табличные модификаторы и постраничная навигация."
  />

  <section class="tr-card mb-5">
    <div class="tr-row tr-row--between mb-4">
      <h2 class="tr-card__title mb-0">Таблица</h2>
      <b-button type="is-primary" icon-left="plus">
        Добавить
      </b-button>
    </div>

    <b-table
      :data="agents"
      hoverable
      mobile-cards
      paginated
      :per-page="5"
      pagination-size="is-small"
    >
      <b-table-column field="name" label="Название" v-slot="{ row }">
        <strong>{{ row.name }}</strong>
      </b-table-column>

      <b-table-column field="status" label="Статус" v-slot="{ row }">
        <b-tag :type="row.status === 'Активен' ? 'is-primary' : undefined">
          {{ row.status }}
        </b-tag>
      </b-table-column>

      <b-table-column field="owner" label="Владелец" v-slot="{ row }">
        {{ row.owner }}
      </b-table-column>

      <b-table-column field="updated" label="Обновлено" v-slot="{ row }">
        {{ row.updated }}
      </b-table-column>

      <b-table-column v-slot="{ row }" width="80">
        <b-dropdown
          position="is-bottom-left"
          aria-role="list"
          append-to-body
        >
          <template #trigger>
            <b-button
              icon-left="dots-vertical"
              size="is-small"
              aria-label="Действия"
            />
          </template>
          <b-dropdown-item aria-role="listitem">
            Редактировать {{ row.name }}
          </b-dropdown-item>
          <b-dropdown-item aria-role="listitem">
            Дублировать
          </b-dropdown-item>
        </b-dropdown>
      </b-table-column>
    </b-table>

    <p class="tr-muted mt-4 mb-2">
      Модификатор <code>--compact</code> — плотные списки без
      построчных действий.
    </p>
    <b-table :data="limitsBreakdown" class="tr-table--compact" hoverable mobile-cards>
      <b-table-column field="label" label="Лимит" v-slot="{ row }">
        {{ row.label }}
      </b-table-column>
      <b-table-column field="caption" label="Использовано" v-slot="{ row }">
        {{ row.caption }}
      </b-table-column>
    </b-table>

    <p class="tr-muted mt-4 mb-2">
      Модификатор <code>--breakdown</code> — сводка «строка: значение»
      без шапки, например разбивка стоимости.
    </p>
    <b-table :data="costBreakdown" class="tr-table--breakdown" mobile-cards>
      <b-table-column field="label" label="Статья" v-slot="{ row }">
        {{ row.label }}
      </b-table-column>
      <b-table-column field="value" label="Сумма" v-slot="{ row }">
        {{ row.value }}
      </b-table-column>
    </b-table>
  </section>

  <section class="tr-card mb-5">
    <div class="tr-row tr-row--between mb-4">
      <h2 class="tr-card__title mb-0">Пагинация</h2>
      <span class="tr-muted">Страница {{ paginationPage }} из 5</span>
    </div>
    <b-pagination
      v-model="paginationPage"
      :total="50"
      :per-page="10"
      order="is-centered"
    />
  </section>
</template>

<script setup>
import { ref } from "vue";

import { PageHeader } from "@iam3xtr/vue/navigation";

const paginationPage = ref(1);

const agents = [
  {
    name: "Консультант",
    status: "Активен",
    owner: "Иван Петров",
    updated: "2 часа назад",
  },
  {
    name: "Sales Assistant",
    status: "Черновик",
    owner: "Анна Смирнова",
    updated: "Вчера",
  },
];

const limitsBreakdown = [
  { label: "Месячный бюджет", caption: "38%" },
  { label: "Хранилище знаний", caption: "51%" },
  { label: "API-запросы", caption: "67 240 из 100 000" },
];

const costBreakdown = [
  { label: "Подписка Superior", value: "$33,00" },
  { label: "Дополнительные кредиты", value: "$8,40" },
  { label: "Итого", value: "$41,40" },
];
</script>
