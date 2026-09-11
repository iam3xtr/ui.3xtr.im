<template>
  <section class="tr-workspace-plans">
    <div class="tr-page-header">
      <div>
        <h1 class="tr-page-title">Тариф</h1>
        <p class="tr-page-subtitle">Выберите подходящий тариф для вашего пространства.</p>
      </div>
    </div>

    <Loader v-if="isLoading" size="section" class="tr-loader--standalone" />

    <TariffSelector
      v-else
      v-model="selectedTariffId"
      v-model:billing-period="billingPeriod"
      :tariffs="tariffOptions"
    />
  </section>
</template>

<script setup>
import { storeToRefs } from "pinia";
import { ref, watch } from "vue";

import { useSimulatedLoading } from "../composables/useSimulatedLoading";
import { useWorkspaceStore } from "../stores/workspace";
import Loader from "./common/Loader.vue";
import TariffSelector from "./TariffSelector.vue";

const { isLoading } = useSimulatedLoading();
const workspaceStore = useWorkspaceStore();
const { activeWorkspaceId, activeWorkspaceTariff } = storeToRefs(workspaceStore);

/** @type {import("vue").Ref<"monthly" | "yearly">} */
const billingPeriod = ref("monthly");

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

// Активный workspace берётся из store (Task A5.8 requirement): the selector
// opens on whichever tariff matches the current workspace's
// `activeWorkspaceTariff.displayName`, and re-syncs on workspace switch.
// Picking a different tariff below stays local/in-memory — it does not
// rewrite `stores/workspace.js`'s per-workspace tariff fixture, matching the
// cabinet's own `WorkspacePlans.vue`, which renders `TariffSelector`
// `readonly` (no client-side plan change without a checkout flow).
function resolveTariffId(tariff) {
  return tariffOptions.find((option) => option.displayName === tariff.displayName)?.id ?? "free";
}

const selectedTariffId = ref(resolveTariffId(activeWorkspaceTariff.value));

watch(activeWorkspaceId, () => {
  selectedTariffId.value = resolveTariffId(activeWorkspaceTariff.value);
});
</script>
