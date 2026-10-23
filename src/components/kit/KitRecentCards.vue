<template>
  <!--
    Recent/list card reference (Task S2-10, Issue #20). Presentation-only: title,
    optional header action, rows, status and the empty / loading / error states
    with 0 / 1 / many rows. The two columns follow the width of the wrapper
    below, so the width switch shows the container-aware 2/1 behaviour at any
    viewport size. Row links and the header action are separate controls.
  -->
  <section class="tr-card mb-5" data-testid="recent-reference">
    <h2 class="tr-card__title">Последние записи: состояния и колонки</h2>

    <b-field label="Ширина контейнера" class="mb-4">
      <b-select v-model="containerWidth" data-testid="recent-width">
        <option v-for="option in widths" :key="option.value" :value="option.value">
          {{ option.label }}
        </option>
      </b-select>
    </b-field>

    <div :style="hostStyle" data-testid="recent-host">
      <div class="tr-recent-grid">
        <div class="tr-recent-grid__items" data-testid="recent-items">
          <article
            v-for="card in cards"
            :key="card.key"
            class="tr-card tr-recent"
            :data-testid="`recent-${card.key}`"
            :aria-busy="card.state === 'loading' ? 'true' : undefined"
          >
            <div class="tr-recent__header">
              <h3 class="tr-card__title tr-recent__title mb-0">{{ card.title }}</h3>
              <button v-if="card.action" type="button" class="button is-small tr-recent__action">
                {{ card.action }}
              </button>
            </div>

            <p v-if="card.state === 'loading'" class="tr-recent__state" role="status">Загрузка…</p>
            <p v-else-if="card.state === 'error'" class="tr-recent__state tr-recent__state--error" role="alert">
              Не удалось загрузить список.
            </p>
            <p v-else-if="!card.rows.length" class="tr-recent__state">Пока ничего нет.</p>
            <b-table v-else :data="card.rows" hoverable mobile-cards>
              <b-table-column field="name" label="Название" v-slot="{ row }">
                <a class="tr-recent__link" :href="`#${row.id}`" @click.prevent>{{ row.name }}</a>
              </b-table-column>
              <b-table-column field="status" label="Статус" v-slot="{ row }">
                <b-tag class="tr-status-tag" :title="row.status">{{ row.status }}</b-tag>
              </b-table-column>
            </b-table>
          </article>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, ref } from "vue";

const widths = [
  { value: "100%", label: "Вся ширина" },
  { value: "720px", label: "720 px" },
  { value: "480px", label: "480 px" },
  { value: "320px", label: "320 px" },
];
const containerWidth = ref("100%");
const hostStyle = computed(() => ({ maxWidth: containerWidth.value }));

const many = [
  { id: "a1", name: "Поддержка клиентов", status: "Активен" },
  { id: "a2", name: "Очень длинное название агента для проверки переноса строки в таблице", status: "Черновик" },
  { id: "a3", name: "Продажи", status: "Пауза" },
];

const cards = [
  { key: "many", title: "Много строк", action: "Все записи", state: "ready", rows: many },
  { key: "one", title: "Одна строка", action: null, state: "ready", rows: many.slice(0, 1) },
  { key: "empty", title: "Пусто", action: "Создать", state: "ready", rows: [] },
  { key: "loading", title: "Загрузка", action: null, state: "loading", rows: [] },
  { key: "error", title: "Ошибка", action: "Повторить", state: "error", rows: [] },
];
</script>
