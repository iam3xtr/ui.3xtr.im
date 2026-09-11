<template>
  <!-- Интерактивная витрина компонентов и состояний UI-kit. -->
          <PageHeader
            title="Trickster UI Kit"
            subtitle="Основные Buefy-компоненты и состояния."
          >
            <b-button>Отмена</b-button>
            <b-button type="is-primary">Сохранить</b-button>
          </PageHeader>

          <section class="tr-card mb-5">
            <h2 class="tr-card__title">Кнопки</h2>
            <div class="buttons">
              <b-button type="is-primary">Основная</b-button>
              <b-button type="is-primary" outlined>Outlined</b-button>
              <b-button type="is-primary" light>Light</b-button>
              <b-button type="is-success">Успех</b-button>
              <b-button type="is-warning">Предупреждение</b-button>
              <b-button type="is-danger">Удалить</b-button>
              <b-button disabled>Недоступна</b-button>
            </div>
          </section>

          <section class="tr-card mb-5">
            <h2 class="tr-card__title">Поля формы</h2>

            <div class="tr-grid tr-grid--2">
              <div>
                <b-field
                  label="Название агента"
                  message="До 64 символов"
                >
                  <b-input
                    v-model="form.name"
                    maxlength="64"
                    placeholder="Например, Консультант"
                  />
                </b-field>

                <b-field label="Описание">
                  <b-input
                    v-model="form.description"
                    type="textarea"
                    placeholder="Кратко опишите назначение"
                  />
                </b-field>
              </div>

              <div>
                <b-field label="Модель">
                  <b-select v-model="form.model" expanded>
                    <option value="gpt-4o">GPT-4o</option>
                    <option value="claude">Claude</option>
                    <option value="gemini">Gemini</option>
                  </b-select>
                </b-field>

                <b-field
                  label="API endpoint"
                  type="is-danger"
                  message="Укажите корректный HTTPS URL"
                >
                  <b-input
                    v-model="form.endpoint"
                    type="url"
                    icon="link"
                  />
                </b-field>

                <b-checkbox v-model="form.active">
                  Активировать после сохранения
                </b-checkbox>
              </div>
            </div>
          </section>

          <section class="tr-grid tr-grid--2 mb-5">
            <article class="tr-card">
              <h2 class="tr-card__title">Теги</h2>
              <b-taglist>
                <b-tag type="is-primary">Активен</b-tag>
                <b-tag>Черновик</b-tag>
                <b-tag type="is-success">Проиндексировано</b-tag>
                <b-tag type="is-warning">Ожидает</b-tag>
                <b-tag type="is-danger">Ошибка</b-tag>
              </b-taglist>
            </article>

            <article class="tr-card">
              <h2 class="tr-card__title">Уведомления</h2>
              <b-notification type="is-primary" :closable="false">
                Конфигурация агента сохранена.
              </b-notification>
              <b-notification type="is-warning" :closable="false">
                Лимит хранилища использован на 82%.
              </b-notification>
            </article>
          </section>

          <section class="tr-card mb-5">
            <h2 class="tr-card__title">Лимиты</h2>

            <div class="tr-stack">
              <div>
                <div class="tr-row tr-row--between">
                  <span>Месячный бюджет</span>
                  <span class="tr-muted">38%</span>
                </div>
                <b-progress :value="38" type="is-primary" />
              </div>

              <div>
                <div class="tr-row tr-row--between">
                  <span>Хранилище знаний</span>
                  <span class="tr-muted">51%</span>
                </div>
                <b-progress :value="51" type="is-primary" />
              </div>
            </div>
          </section>

          <section class="tr-card mb-5">
            <h2 class="tr-card__title">Загрузчик</h2>
            <p class="tr-muted mb-4">
              Единый компонент <code>Loader</code> с тремя размерами.
              Анимация подчиняется <code>prefers-reduced-motion</code> —
              в системах с этой настройкой рендерится статичный логотип.
            </p>

            <div class="tr-stack">
              <div>
                <p class="tr-muted mb-2">inline — внутри кнопки</p>
                <b-button disabled>
                  <Loader size="inline" label="Сохранение" />
                  Сохранение…
                </b-button>
              </div>

              <div>
                <p class="tr-muted mb-2">section — в карточке фиксированной высоты</p>
                <div class="tr-card tr-uikit-demo-frame tr-uikit-demo-frame--section">
                  <Loader
                    size="section"
                    label="Загрузка диалогов"
                    class="tr-uikit-demo-frame__fill"
                  />
                </div>
              </div>

              <div>
                <p class="tr-muted mb-2">screen — полноэкранное состояние приложения</p>
                <div class="tr-card tr-uikit-demo-frame tr-uikit-demo-frame--screen">
                  <Loader
                    size="screen"
                    label="Загрузка приложения"
                    class="tr-uikit-demo-frame__fill"
                  />
                </div>
              </div>
            </div>
          </section>

          <section class="tr-card mb-5">
            <h2 class="tr-card__title">Выбор тарифа</h2>
            <TariffSelector
              v-model="selectedTariffId"
              v-model:billing-period="selectedBillingPeriod"
              :tariffs="tariffOptions"
              :disabled-tariff-ids="['legendary']"
            />
          </section>

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
            <h2 class="tr-card__title">Копируемый блок</h2>
            <p class="tr-muted mb-4">
              <code>CopyPre</code> — ограниченный по высоте
              <code>&lt;pre&gt;</code> с кнопкой копирования, доступной с
              клавиатуры.
            </p>
            <CopyPre :text="apiKeyExample" title="Скопировать ключ API" />
          </section>

          <section class="tr-card mb-5">
            <h2 class="tr-card__title">Диалог подтверждения</h2>
            <p class="tr-muted mb-4">
              Подтверждение опасного действия — штатный <code>b-dialog</code>,
              не собственная реализация.
            </p>
            <b-button type="is-danger" outlined @click="confirmDeleteAgent">
              Удалить агента…
            </b-button>
            <p class="tr-muted mt-2">
              Вызов идёт через <code>useModalStore().confirm()</code> —
              общий store-API оверлеев (Task A4.5), не собственный
              <code>ConfirmDialog</code>.
            </p>
          </section>

          <section class="tr-card mb-5">
            <h2 class="tr-card__title">Баннер и тост</h2>
            <div class="tr-stack">
              <b-message
                title="Индексация завершена"
                type="is-success"
                :closable="false"
              >
                Коллекция «База знаний» проиндексирована, доступно 128
                документов.
              </b-message>
              <b-button @click="showSavedToast">Показать тост</b-button>
            </div>
          </section>

          <section class="tr-card mb-5">
            <h2 class="tr-card__title">Загрузка поверх контента и скелет</h2>

            <div class="tr-grid tr-grid--2">
              <div>
                <p class="tr-muted mb-2">b-loading — оверлей поверх блока</p>
                <div class="tr-card tr-uikit-demo-frame tr-uikit-demo-frame--overlay">
                  <b-loading v-model="isOverlayLoading" :is-full-page="false" />
                  <div class="tr-uikit-demo-frame__body">
                    <b-button
                      size="is-small"
                      @click="isOverlayLoading = !isOverlayLoading"
                    >
                      Переключить загрузку
                    </b-button>
                  </div>
                </div>
              </div>

              <div>
                <p class="tr-muted mb-2">b-skeleton — заглушка на время запроса</p>
                <b-skeleton width="80%" />
                <b-skeleton width="60%" />
                <b-skeleton width="90%" />
              </div>
            </div>
          </section>

          <section class="tr-card mb-5">
            <div class="tr-row tr-row--between mb-4">
              <h2 class="tr-card__title mb-0">Загрузка файлов</h2>
              <b-button size="is-small" @click="resetUploadDemo">
                Повторить демо
              </b-button>
            </div>

            <b-upload v-model="uploadPickedFile" drag-drop expanded>
              <div class="has-text-centered tr-uikit-demo-padded">
                <p><b-icon icon="upload" size="is-medium" /></p>
                <p>
                  Перетащите файл сюда или нажмите для выбора — он встанет в
                  очередь ниже
                </p>
              </div>
            </b-upload>

            <div class="tr-stack mt-4">
              <div v-for="item in uploadQueue" :key="item.id">
                <div class="tr-row tr-row--between mb-2">
                  <span>
                    {{ item.name }}
                    <span class="tr-muted">({{ item.size }})</span>
                  </span>
                  <span class="tr-muted">{{ uploadStatusLabel(item.status) }}</span>
                </div>
                <b-progress
                  v-if="item.status === 'queued' || item.status === 'uploading'"
                  :value="item.progress"
                  size="is-small"
                  show-value
                />
                <b-message
                  v-else-if="item.status === 'success'"
                  type="is-success"
                  :closable="false"
                >
                  Файл «{{ item.name }}» загружен успешно.
                </b-message>
                <b-message v-else type="is-danger" :closable="false">
                  Не удалось загрузить «{{ item.name }}»: {{ item.errorReason }}.
                </b-message>
              </div>
            </div>
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

          <section class="tr-card mb-5">
            <h2 class="tr-card__title">Боковая панель</h2>
            <b-button @click="modalStore.open('uikit-sidebar')">
              Открыть панель
            </b-button>
            <b-sidebar
              :model-value="modalStore.isOpen('uikit-sidebar')"
              type="is-light"
              right
              overlay
              @update:model-value="(value) => (value ? modalStore.open('uikit-sidebar') : modalStore.close('uikit-sidebar'))"
            >
              <div class="tr-uikit-demo-padded">
                <h3 class="tr-card__title">Свойства</h3>
                <p class="tr-muted">
                  Демонстрация штатной боковой панели Buefy, открытой через
                  общий <code>useModalStore()</code>.
                </p>
                <b-button class="mt-4" @click="modalStore.close('uikit-sidebar')">
                  Закрыть
                </b-button>
              </div>
            </b-sidebar>
          </section>

          <section class="tr-card mb-5">
            <h2 class="tr-card__title">Async-состояния</h2>
            <p class="tr-muted mb-4">
              AsyncState — единый блок для пяти состояний контента
              (<code>.tr-async-state</code>, Task A3.7). ListAsyncState
              выбирает нужный вариант по фиксированному приоритету
              loading &gt; error &gt; empty &gt; no-results и не выполняет
              запросов.
            </p>

            <div class="tr-grid tr-grid--2 mb-5">
              <div class="tr-card">
                <AsyncState variant="loading" />
              </div>

              <div class="tr-card">
                <AsyncState
                  variant="empty"
                  icon="shape-outline"
                  title="Здесь пока пусто"
                  message="Создайте первый объект, чтобы он появился в списке."
                >
                  <b-button
                    type="is-primary"
                    size="is-small"
                    @click="modalStore.open('uikit-create-agent')"
                  >
                    Создать
                  </b-button>
                </AsyncState>
              </div>

              <div class="tr-card">
                <AsyncState
                  variant="no-results"
                  icon="magnify"
                  title="Ничего не найдено"
                  message="Измените условия поиска или сбросьте фильтры."
                />
              </div>

              <div class="tr-card">
                <AsyncState
                  variant="error"
                  icon="alert-circle-outline"
                  title="Не удалось загрузить данные"
                  message="Проверьте соединение и повторите попытку."
                >
                  <b-button size="is-small" @click="showSavedToast">
                    Повторить
                  </b-button>
                </AsyncState>
              </div>

              <div class="tr-card">
                <AsyncState
                  variant="permission-denied"
                  icon="lock-outline"
                  title="Доступ ограничен"
                  message="У вас нет прав для просмотра этого раздела."
                />
              </div>
            </div>

            <div class="tr-card tr-uikit-demo-padded">
              <p class="tr-muted mb-2">
                ListAsyncState — переключите флаги, чтобы увидеть приоритет
                loading &gt; error &gt; empty &gt; no-results.
              </p>
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

          <b-modal
            :model-value="modalStore.isOpen('uikit-create-agent')"
            has-modal-card
            trap-focus
            :destroy-on-hide="false"
            @update:model-value="(value) => (value ? modalStore.open('uikit-create-agent') : modalStore.close('uikit-create-agent'))"
          >
            <div class="modal-card">
              <header class="modal-card-head">
                <p class="modal-card-title">Новый агент</p>
                <button
                  class="delete"
                  aria-label="Закрыть"
                  @click="modalStore.close('uikit-create-agent')"
                />
              </header>

              <section class="modal-card-body">
                <b-field label="Название">
                  <b-input v-model="form.name" />
                </b-field>
              </section>

              <footer class="modal-card-foot">
                <b-button @click="modalStore.close('uikit-create-agent')">
                  Отмена
                </b-button>
                <b-button
                  type="is-primary"
                  @click="modalStore.close('uikit-create-agent')"
                >
                  Создать
                </b-button>
              </footer>
            </div>
          </b-modal>
</template>

<script setup>
import { onUnmounted, reactive, ref, watch } from "vue";

import { useModalStore } from "../stores/modal";
import { useToasterStore } from "../stores/toaster";
import AsyncState from "./common/AsyncState.vue";
import CopyPre from "./common/CopyPre.vue";
import ListAsyncState from "./common/ListAsyncState.vue";
import Loader from "./common/Loader.vue";
import PageHeader from "./common/PageHeader.vue";
import Toolbar from "./common/Toolbar.vue";
import ToolbarDropdown from "./common/ToolbarDropdown.vue";
import TariffSelector from "./TariffSelector.vue";

const activeTab = ref(0);
const toolbarDemoQuery = ref("");
const toolbarDemoStatus = ref("");
const listAsyncDemo = reactive({
  loading: false,
  error: false,
  empty: false,
  noResults: false,
});
const selectedTariffId = ref("superior");
/** @type {import("vue").Ref<"monthly" | "yearly">} */
const selectedBillingPeriod = ref("monthly");

const isOverlayLoading = ref(false);
const paginationPage = ref(1);
const apiKeyExample = "sk-trickster-3f9a1c7e0d4b4c2a9f6e8d1b2a3c4d5e";

const modalStore = useModalStore();
const toaster = useToasterStore();

function confirmDeleteAgent() {
  modalStore.confirm({
    title: "Удалить агента",
    message: "Действие необратимо. Продолжить?",
    confirmText: "Удалить",
    cancelText: "Отмена",
    type: "is-danger",
    hasIcon: true,
    onConfirm: () => toaster.error("Агент удалён"),
  });
}

function showSavedToast() {
  toaster.success("Изменения сохранены");
}

// Демо-поток b-upload: локальная fixture-state machine без сети и без
// собственного компонента загрузки — очередь, прогресс, успех и ошибка
// воспроизводятся таймерами поверх статичных данных. См. Task A4.6.
const UPLOAD_STATUS_LABELS = {
  queued: "В очереди",
  uploading: "Загрузка",
  success: "Готово",
  error: "Ошибка",
};
const DEFAULT_UPLOAD_ERROR_REASON = "сервис вернул ошибку при обработке файла";
const UPLOAD_DEMO_FIXTURES = [
  { name: "brand-guidelines.pdf", size: "2.4 МБ", outcome: "success" },
  {
    name: "corrupted-archive.zip",
    size: "1.1 МБ",
    outcome: "error",
    errorReason: "архив повреждён и не может быть распакован",
  },
];

const uploadPickedFile = ref(null);
const uploadQueue = ref([]);
let uploadQueueNextId = 0;

function uploadStatusLabel(status) {
  return UPLOAD_STATUS_LABELS[status] || status;
}

function formatUploadFileSize(bytes) {
  if (!Number.isFinite(bytes)) return "";
  const units = ["Б", "КБ", "МБ", "ГБ"];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  const precision = unitIndex > 0 && value < 10 ? 1 : 0;
  return `${value.toFixed(precision)} ${units[unitIndex]}`;
}

function runUploadDemoStep(item) {
  // Задержка перед стартом загрузки нужна, чтобы стадия "queued" была
  // реально видна на экране, а не перезаписывалась в "uploading" в тот же
  // тик рендера (Task A4.6 review finding). Id таймера складывается на сам
  // item, чтобы resetUploadDemo/размонтирование могли его отменить и не
  // мутировать уже отсоединённый объект.
  item.timerId = setTimeout(() => {
    item.status = "uploading";
    const tick = () => {
      item.progress = Math.min(100, item.progress + 25);
      if (item.progress < 100) {
        item.timerId = setTimeout(tick, 400);
        return;
      }
      item.status = item.outcome;
    };
    item.timerId = setTimeout(tick, 400);
  }, 500);
}

function clearUploadTimers(items) {
  items.forEach((item) => clearTimeout(item.timerId));
}

function enqueueUpload(name, size, outcome, errorReason) {
  const item = reactive({
    id: ++uploadQueueNextId,
    name,
    size,
    outcome,
    errorReason: outcome === "error" ? errorReason || DEFAULT_UPLOAD_ERROR_REASON : null,
    status: "queued",
    progress: 0,
  });
  uploadQueue.value.push(item);
  runUploadDemoStep(item);
}

function resetUploadDemo() {
  clearUploadTimers(uploadQueue.value);
  uploadQueue.value = [];
  UPLOAD_DEMO_FIXTURES.forEach((fixture) =>
    enqueueUpload(fixture.name, fixture.size, fixture.outcome, fixture.errorReason),
  );
}

watch(uploadPickedFile, (file) => {
  if (!file) return;
  const outcome = uploadQueue.value.length % 2 === 0 ? "success" : "error";
  enqueueUpload(file.name, formatUploadFileSize(file.size), outcome);
  uploadPickedFile.value = null;
});

resetUploadDemo();
onUnmounted(() => clearUploadTimers(uploadQueue.value));

const form = reactive({
  name: "Консультант",
  description: "",
  model: "gpt-4o",
  endpoint: "http://example.test",
  active: true,
});

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

/** @type {import("./TariffSelector.vue").TariffSelectorTariff[]} */
const tariffOptions = [
  {
    id: "free",
    displayName: "Free",
    priceLabel: "Бесплатно",
    monthlyPriceLabel: "Бесплатно",
    yearlyPriceLabel: "Бесплатно",
    color: "#6b6b6b",
    isFree: true,
    rank: 0,
    description: "Для знакомства с платформой.",
    conditions: ["1 рабочее пространство", "Базовая поддержка"],
    limits: [
      { key: "credits", label: "Кредиты", caption: "100 / мес", progress: 0 },
      { key: "cost", label: "Цена за 1 000 кредитов", caption: "$5", progress: null },
    ],
  },
  {
    id: "fine",
    displayName: "Fine",
    priceLabel: "$11 в месяц",
    monthlyPriceLabel: "$11 в месяц",
    yearlyPriceLabel: "$111 в год",
    yearlyRegularPriceLabel: "$132",
    color: "#169b62",
    rank: 1,
    yearlySavingsLabel: "Экономия $21",
    description: "Для небольших команд.",
    conditions: ["До 10 участников", "Приоритетная поддержка"],
    limits: [
      { key: "credits", label: "Кредиты", caption: "1 000 / мес", progress: 0 },
      { key: "cost", label: "Цена за 1 000 кредитов", caption: "$4", progress: null },
    ],
  },
  {
    id: "superior",
    displayName: "Superior",
    priceLabel: "$33 в месяц",
    monthlyPriceLabel: "$33 в месяц",
    yearlyPriceLabel: "$333 в год",
    yearlyRegularPriceLabel: "$396",
    color: "#2f6bc2",
    rank: 2,
    yearlySavingsLabel: "Экономия $63",
    description: "Для растущих команд.",
    conditions: ["До 25 участников", "Приоритетная поддержка"],
    limits: [
      { key: "credits", label: "Кредиты", caption: "5 000 / мес", progress: 0 },
      { key: "cost", label: "Цена за 1 000 кредитов", caption: "$3", progress: null },
    ],
  },
  {
    id: "epic",
    displayName: "Epic",
    priceLabel: "$55 в месяц",
    monthlyPriceLabel: "$55 в месяц",
    yearlyPriceLabel: "$555 в год",
    yearlyRegularPriceLabel: "$660",
    color: "#7041d4",
    rank: 3,
    yearlySavingsLabel: "Экономия $100",
    description: "Для команд с большим объёмом задач.",
    conditions: ["До 50 участников", "Расширенная аналитика"],
    limits: [
      { key: "credits", label: "Кредиты", caption: "25 000 / мес", progress: 0 },
      { key: "cost", label: "Цена за 1 000 кредитов", caption: "$2", progress: null },
    ],
  },
  {
    id: "legendary",
    displayName: "Legendary",
    priceLabel: "По запросу",
    color: "#b96d00",
    rank: 4,
    description: "Максимальные лимиты для крупных команд.",
    conditions: ["До 100 участников", "Выделенная поддержка"],
    limits: [
      { key: "credits", label: "Кредиты", caption: "100 000 / мес", progress: 0 },
      { key: "cost", label: "Цена за 1 000 кредитов", caption: "$1", progress: null },
    ],
  },
];
</script>
