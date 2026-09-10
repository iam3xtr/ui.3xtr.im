<template>
  <!-- Интерактивная витрина компонентов и состояний UI-kit. -->
          <div class="tr-page-header">
            <div>
              <h1 class="tr-page-title">Trickster UI Kit</h1>
              <p class="tr-page-subtitle">
                Основные Buefy-компоненты и состояния.
              </p>
            </div>

            <div class="buttons">
              <b-button>Отмена</b-button>
              <b-button type="is-primary">Сохранить</b-button>
            </div>
          </div>

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
            <h2 class="tr-card__title">Диалог подтверждения</h2>
            <p class="tr-muted mb-4">
              Подтверждение опасного действия — штатный <code>b-dialog</code>,
              не собственная реализация.
            </p>
            <b-button type="is-danger" outlined @click="confirmDeleteAgent">
              Удалить агента…
            </b-button>
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
            <h2 class="tr-card__title">Загрузка файлов</h2>
            <b-upload v-model="uploadedFile" drag-drop expanded>
              <div class="has-text-centered tr-uikit-demo-padded">
                <p><b-icon icon="upload" size="is-medium" /></p>
                <p>Перетащите файл сюда или нажмите для выбора</p>
              </div>
            </b-upload>
            <p v-if="uploadedFile" class="tr-muted mt-2">
              Выбран файл: {{ uploadedFile.name }}
            </p>
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
            <b-button @click="isSidebarOpen = true">Открыть панель</b-button>
            <b-sidebar v-model="isSidebarOpen" type="is-light" right overlay>
              <div class="tr-uikit-demo-padded">
                <h3 class="tr-card__title">Свойства</h3>
                <p class="tr-muted">
                  Демонстрация штатной боковой панели Buefy.
                </p>
                <b-button class="mt-4" @click="isSidebarOpen = false">
                  Закрыть
                </b-button>
              </div>
            </b-sidebar>
          </section>

          <section class="tr-card has-text-centered">
            <h2 class="tr-card__title">Пустое состояние</h2>
            <div class="tr-async-state tr-async-state--empty">
              <span class="tr-async-state__icon">
                <b-icon icon="shape-outline" size="is-large" />
              </span>
              <strong class="tr-async-state__title">Здесь пока пусто</strong>
              <span class="tr-async-state__message">
                Создайте первый объект, чтобы он появился в списке.
              </span>
            </div>
            <b-button
              class="mt-4"
              type="is-primary"
              @click="isModalOpen = true"
            >
              Создать
            </b-button>
          </section>

          <b-modal
            v-model="isModalOpen"
            has-modal-card
            trap-focus
            :destroy-on-hide="false"
          >
            <div class="modal-card">
              <header class="modal-card-head">
                <p class="modal-card-title">Новый агент</p>
                <button
                  class="delete"
                  aria-label="Закрыть"
                  @click="isModalOpen = false"
                />
              </header>

              <section class="modal-card-body">
                <b-field label="Название">
                  <b-input v-model="form.name" />
                </b-field>
              </section>

              <footer class="modal-card-foot">
                <b-button @click="isModalOpen = false">Отмена</b-button>
                <b-button type="is-primary" @click="isModalOpen = false">
                  Создать
                </b-button>
              </footer>
            </div>
          </b-modal>
</template>

<script setup>
import { reactive, ref } from "vue";
import { useDialog, useToast } from "buefy";

import Loader from "./common/Loader.vue";
import TariffSelector from "./TariffSelector.vue";

const activeTab = ref(0);
const isModalOpen = ref(false);
const selectedTariffId = ref("superior");
/** @type {import("vue").Ref<"monthly" | "yearly">} */
const selectedBillingPeriod = ref("monthly");

const isOverlayLoading = ref(false);
const uploadedFile = ref(null);
const paginationPage = ref(1);
const isSidebarOpen = ref(false);

const dialog = useDialog();
const toast = useToast();

function confirmDeleteAgent() {
  dialog.confirm({
    title: "Удалить агента",
    message: "Действие необратимо. Продолжить?",
    confirmText: "Удалить",
    cancelText: "Отмена",
    type: "is-danger",
    hasIcon: true,
    onConfirm: () => toast.open({ message: "Агент удалён", type: "is-danger" }),
  });
}

function showSavedToast() {
  toast.open({ message: "Изменения сохранены", type: "is-success" });
}

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
