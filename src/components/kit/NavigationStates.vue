<template>
  <!--
    Навигация и состояния (Task A8.6): вкладки, Toolbar и матрица
    demo-состояний — часть прежней единой `/kit` (Task A5.3), разделённой на
    маршрутные подразделы.
  -->
  <PageHeader
    title="Навигация и состояния"
    subtitle="Вкладки, тулбар и контракты loading/empty/error/permission-denied."
  />

  <section class="tr-card mb-5">
    <h2 class="tr-card__title">Toolbar</h2>
    <p class="tr-muted mb-4">
      <code>Toolbar</code> собирает поиск (<code>ToolbarSearch</code>,
      горячая клавиша <code>Ctrl/⌘ K</code>), фильтры
      (<code>ToolbarDropdown</code> в слоте <code>filters</code>) и
      действия в один контракт <code>.tr-page-toolbar</code>; ниже
      768px тот же слот фильтров переходит в <code>MobileFilters</code>
      вместо второй строки тулбара.
    </p>

    <Toolbar
      v-model:search="toolbarDemoQuery"
      search-placeholder="Поиск по демо-записям"
      :filters-active="Boolean(toolbarDemoStatus)"
    >
      <template #filters>
        <ToolbarDropdown
          v-model="toolbarDemoStatus"
          class="tr-page-toolbar__filter"
          aria-label="Фильтр по статусу"
          all-label="Все статусы"
          :options="['Активен', 'Черновик']"
        />
      </template>

      <template #actions>
        <b-button type="is-primary" icon-left="plus">
          Добавить
        </b-button>
      </template>
    </Toolbar>
  </section>

  <section class="tr-card mb-5">
    <h2 class="tr-card__title">Вкладки</h2>

    <b-tabs v-model="activeTab" type="is-boxed">
      <b-tab-item label="Обзор">
        Содержимое обзора.
      </b-tab-item>
      <b-tab-item label="Настройки">
        Содержимое настроек.
      </b-tab-item>
      <b-tab-item label="Интеграции">
        Подключённые интеграции.
      </b-tab-item>
      <b-tab-item label="Тест-сессии">
        История тестовых запусков.
      </b-tab-item>
    </b-tabs>
  </section>

  <section class="tr-card mb-5">
    <h2 class="tr-card__title">Матрица demo-состояний</h2>
    <p class="tr-muted mb-4">
      Витрина всех шести значений <code>DEMO_MODES</code>
      (<code>src/stores/demo.js</code>, Task A7.1) для контрактов,
      которыми реально пользуются маршруты кита (Task A7.3–A7.5):
      <code>ListAsyncState</code> для каталогов/списков, прямой
      <code>AsyncState</code> для detail/сводных экранов и баннер
      <code>b-message</code> поверх контента для <code>partial</code>.
      Это не таблица «каждый контракт × все шесть режимов» — ни один
      раздел ниже не показывает все шесть карточек сразу, потому что
      сами контракты неравнозначны на маршрутах кита:
      <code>ListAsyncState</code> не имеет ветки
      <code>permission-denied</code> (на маршрутах она всегда рендерится
      отдельным прямым <code>AsyncState</code>), а прямой
      <code>AsyncState</code> не имеет вариантов <code>empty</code>/
      <code>partial</code>. Каждый раздел показывает ровно те состояния,
      которые этот контракт реально принимает в приложении — вместе все
      разделы покрывают все шесть значений. Тексты карточек — read-only
      проекция <code>useDemoStore().listAsyncState</code> /
      <code>permissionDeniedState</code>, но сами карточки не подписаны
      на текущий режим стора: карточки внутри каждого раздела
      показываются одновременно, а не только выбранное в панели «Demo»,
      и переход на этот раздел не меняет persisted demo-режим.
    </p>

    <div class="tr-row tr-row--between mb-5">
      <span class="tr-muted">
        Текущий глобальный demo-режим (панель «Demo» в навбаре)
      </span>
      <b-tag type="is-info">{{ currentDemoModeLabel }}</b-tag>
    </div>

    <h3 class="tr-card__title">Каталог/список — ListAsyncState</h3>
    <p class="tr-muted mb-4">
      Приоритет фиксирован: loading &gt; error &gt; empty &gt;
      no-results. <code>no-results</code> зависит от поиска/фильтра,
      а не от <code>DEMO_MODES</code> — отдельное демо приоритета ниже.
    </p>
    <div class="tr-grid tr-grid--2 mb-5">
      <div
        v-for="card in listContractCards"
        :key="`list-${card.mode}`"
        class="tr-card"
      >
        <p class="tr-muted mb-2">{{ demoModeLabel(card.mode) }}</p>
        <ListAsyncState v-bind="card.props">
          <p class="tr-muted">
            Контент готов — ни один флаг выше не включён.
          </p>
          <template v-if="card.mode === 'empty'" #empty-action>
            <b-button
              type="is-primary"
              size="is-small"
              @click="toaster.success('Демонстрация действия из empty-action')"
            >
              Создать
            </b-button>
          </template>
        </ListAsyncState>
      </div>
    </div>

    <h3 class="tr-card__title">Detail/сводный экран — прямой AsyncState</h3>
    <div class="tr-grid tr-grid--2 mb-5">
      <div
        v-for="card in directContractCards"
        :key="`direct-${card.mode}`"
        class="tr-card"
      >
        <p class="tr-muted mb-2">{{ demoModeLabel(card.mode) }}</p>
        <p v-if="card.mode === 'ready'" class="tr-muted">
          Контент готов — Loader/AsyncState не рендерятся.
        </p>
        <AsyncState
          v-else
          :variant="card.variant"
          :icon="card.icon"
          :title="card.title"
          :message="card.message"
        />
      </div>
    </div>

    <h3 class="tr-card__title">Partial — баннер поверх контента</h3>
    <p class="tr-muted mb-4">
      <code>partial</code> не заменяет контент отдельным
      <code>AsyncState</code> — тот же <code>b-message
      type="is-warning"</code>, что в <code>Agents.vue</code> /
      <code>Files.vue</code>, ложится баннером поверх всё ещё
      доступных данных, а не вместо них.
    </p>
    <div class="tr-card tr-uikit-demo-padded">
      <b-message type="is-warning" :closable="false">
        Показаны не все записи: часть списка недоступна из-за
        временной ошибки. Остальной список ниже — актуален.
      </b-message>
      <p class="tr-muted">
        Пример строки каталога, оставшейся доступной под баннером.
      </p>
    </div>
  </section>

  <section class="tr-card mb-5">
    <h2 class="tr-card__title">Приоритет ListAsyncState</h2>
    <p class="tr-muted mb-4">
      Отдельное демо документированного приоритета
      <code>ListAsyncState</code> (loading &gt; error &gt; empty &gt;
      no-results): переключатели ниже управляют только этим примером,
      а не глобальным demo-режимом, и не входят в матрицу выше — эта
      страница остаётся справочником для приоритета флагов, не
      дублирующей разметкой состояний.
    </p>
    <div class="tr-card tr-uikit-demo-padded">
      <div class="buttons mb-3">
        <b-switch v-model="listAsyncDemo.loading">loading</b-switch>
        <b-switch v-model="listAsyncDemo.error">error</b-switch>
        <b-switch v-model="listAsyncDemo.empty">empty</b-switch>
        <b-switch v-model="listAsyncDemo.noResults">
          no-results
        </b-switch>
      </div>

      <ListAsyncState
        :loading="listAsyncDemo.loading"
        :error="listAsyncDemo.error"
        error-icon="alert-circle-outline"
        error-title="Не удалось загрузить данные"
        error-message="Проверьте соединение и повторите попытку."
        :empty="listAsyncDemo.empty"
        empty-icon="shape-outline"
        empty-title="Здесь пока пусто"
        empty-message="Создайте первый объект, чтобы он появился в списке."
        :no-results="listAsyncDemo.noResults"
        no-results-icon="magnify"
        no-results-title="Ничего не найдено"
        no-results-message="Измените условия поиска или сбросьте фильтры."
      >
        <p class="tr-muted">
          Контент готов — ни один флаг выше не включён.
        </p>
      </ListAsyncState>
    </div>
  </section>
</template>

<script setup>
import { computed, reactive, ref } from "vue";

import { DEMO_MODE_LABELS, useDemoStore } from "../../stores/demo";
import { useToasterStore } from "../../stores/toaster";
import AsyncState from "../common/AsyncState.vue";
import ListAsyncState from "../common/ListAsyncState.vue";
import PageHeader from "../common/PageHeader.vue";
import Toolbar from "../common/Toolbar.vue";
import ToolbarDropdown from "../common/ToolbarDropdown.vue";

const activeTab = ref(0);
const toolbarDemoQuery = ref("");
const toolbarDemoStatus = ref("");
const listAsyncDemo = reactive({
  loading: false,
  error: false,
  empty: false,
  noResults: false,
});

const toaster = useToasterStore();

// Матрица demo-состояний (Task A7.6): read-only проекция `useDemoStore()`
// (Task A7.1) — карточки читают только статичные тексты стора
// (`listAsyncState`/`permissionDeniedState`, те же, что реально показывают
// маршруты Task A7.3–A7.5), а не его текущий режим/флаги. Открытие этого
// раздела поэтому не читает и не переписывает persisted `mode`: карточки
// ниже сами перечисляют шесть значений `DEMO_MODES`, глобальный режим виден
// отдельной строкой (`currentDemoModeLabel`) только для справки.
const demoStore = useDemoStore();

// Те же русские подписи, что в панели «Demo» навбара — общий экспорт из
// `stores/demo.js`, а не отдельный словарь, чтобы обе поверхности не могли
// разойтись в тексте.
function demoModeLabel(mode) {
  return DEMO_MODE_LABELS[mode] || mode;
}

const currentDemoModeLabel = computed(() => demoModeLabel(demoStore.mode));

const listContractCards = computed(() => [
  {
    mode: "ready",
    props: { ...demoStore.listAsyncState, loading: false, error: false, empty: false },
  },
  {
    mode: "loading",
    props: { ...demoStore.listAsyncState, loading: true, error: false, empty: false },
  },
  {
    mode: "empty",
    props: { ...demoStore.listAsyncState, loading: false, error: false, empty: true },
  },
  {
    mode: "error",
    props: { ...demoStore.listAsyncState, loading: false, error: true, empty: false },
  },
]);

const directContractCards = computed(() => [
  { mode: "ready" },
  { mode: "loading", variant: "loading" },
  {
    mode: "error",
    variant: "error",
    icon: demoStore.listAsyncState.errorIcon,
    title: demoStore.listAsyncState.errorTitle,
    message: demoStore.listAsyncState.errorMessage,
  },
  {
    mode: "permission-denied",
    variant: "permission-denied",
    ...demoStore.permissionDeniedState,
  },
]);
</script>
