<template>
  <section class="tr-workspace-plan">
    <div class="tr-page-header">
      <div>
        <h1 class="tr-page-title">Тариф</h1>
        <p class="tr-page-subtitle">Выберите подходящий тариф для вашего пространства.</p>
      </div>
    </div>

    <TariffSelector
      v-model="selectedTariffId"
      v-model:billing-period="billingPeriod"
      :tariffs="tariffOptions"
    />
  </section>
</template>

<script setup lang="ts">
import { ref } from "vue";

import TariffSelector, { type TariffSelectorTariff } from "./TariffSelector.vue";

const selectedTariffId = ref("free");
const billingPeriod = ref<"monthly" | "yearly">("monthly");

const tariffOptions: TariffSelectorTariff[] = [
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
      { key: "members", label: "Участники", caption: "До 3", progress: null },
    ],
  },
  {
    id: "superior",
    displayName: "Superior",
    priceLabel: "2 900 ₽ / мес",
    monthlyPriceLabel: "2 900 ₽ / мес",
    yearlyPriceLabel: "29 000 ₽ / год",
    yearlyRegularPriceLabel: "34 800 ₽",
    yearlySavingsLabel: "Экономия 5 800 ₽",
    color: "#2f6bc2",
    rank: 1,
    description: "Для растущих команд.",
    conditions: ["До 25 участников", "Приоритетная поддержка"],
    limits: [
      { key: "credits", label: "Кредиты", caption: "1 000 000 / мес", progress: 0 },
      { key: "members", label: "Участники", caption: "До 25", progress: null },
    ],
  },
  {
    id: "business",
    displayName: "Business",
    priceLabel: "По запросу",
    color: "#7041d4",
    rank: 2,
    description: "Для крупных команд и масштабных задач.",
    conditions: ["Безлимитные участники", "Выделенная поддержка"],
    limits: [
      { key: "credits", label: "Кредиты", caption: "Без ограничений", progress: null },
      { key: "members", label: "Участники", caption: "Без ограничений", progress: null },
    ],
  },
];
</script>
