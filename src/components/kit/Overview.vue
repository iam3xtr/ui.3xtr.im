<template>
  <!--
    Обзор (Task A8.6): фундаментальные примитивы справочника — кнопки, теги,
    уведомления, лимиты, загрузчик, выбор тарифа и копируемый блок. Часть
    прежней единой `/kit` (Task A5.3), разделённой на маршрутные подразделы.
  -->
  <PageHeader
    title="Trickster UI Kit"
    subtitle="Справочник контрактов дизайн-системы: компоненты, паттерны и состояния кабинета."
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
    <h2 class="tr-card__title">Копируемый блок</h2>
    <p class="tr-muted mb-4">
      <code>CopyPre</code> — ограниченный по высоте
      <code>&lt;pre&gt;</code> с кнопкой копирования, доступной с
      клавиатуры.
    </p>
    <CopyPre :text="apiKeyExample" title="Скопировать ключ API" />
  </section>
</template>

<script setup>
import { ref } from "vue";

import CopyPre from "../common/CopyPre.vue";
import Loader from "../common/Loader.vue";
import PageHeader from "../common/PageHeader.vue";
import TariffSelector from "../TariffSelector.vue";

const selectedTariffId = ref("superior");
/** @type {import("vue").Ref<"monthly" | "yearly">} */
const selectedBillingPeriod = ref("monthly");
const apiKeyExample = "sk-trickster-3f9a1c7e0d4b4c2a9f6e8d1b2a3c4d5e";

/** @type {import("../TariffSelector.vue").TariffSelectorTariff[]} */
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
