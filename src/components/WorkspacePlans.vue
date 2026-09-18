<template>
  <section class="tr-workspace-plans">
    <div class="tr-page-header">
      <div>
        <h1 class="tr-page-title">Тариф</h1>
        <p class="tr-page-subtitle">Выберите подходящий тариф для вашего пространства.</p>
      </div>
    </div>

    <Loader v-if="loading" size="section" class="tr-loader--standalone" />

    <AsyncState
      v-else-if="demoStore.isPermissionDenied"
      variant="permission-denied"
      v-bind="demoStore.permissionDeniedState"
    />

    <AsyncState
      v-else-if="demoStore.isError"
      variant="error"
      :icon="demoStore.listAsyncState.errorIcon"
      :title="demoStore.listAsyncState.errorTitle"
      :message="demoStore.listAsyncState.errorMessage"
    />

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
import { computed, ref, watch } from "vue";

import { useSimulatedLoading } from "../composables/useSimulatedLoading";
import { useDemoStore } from "../stores/demo";
import {
  formatResourceCapCaption,
  getResourceLimitLabel,
  useWorkspaceStore,
} from "../stores/workspace";
import { AsyncState, Loader } from "@iam3xtr/vue";
import TariffSelector from "./TariffSelector.vue";

// Demo-режим (Stage A7, Task A7.5): loading/permission-denied/error через
// `Loader`/прямой `AsyncState` — тот же приём, что `Dashboard.vue`/
// `workspace/Usage.vue`. `tariffOptions` — статичный каталог, не fixture
// список из стора, поэтому здесь нет ни `empty`, ни `partial`: сравнивать
// не с чем.
const { isLoading } = useSimulatedLoading();
const demoStore = useDemoStore();
const loading = computed(() => isLoading.value || demoStore.isLoading);
const workspaceStore = useWorkspaceStore();
const { activeWorkspaceId, activeWorkspaceTariff } = storeToRefs(workspaceStore);

/** @type {import("vue").Ref<"monthly" | "yearly">} */
const billingPeriod = ref("monthly");

/**
 * Каждый план описывает свой предел через тот же семиключевой контракт, что
 * `stores/workspace.js`'s измеренные лимиты (Task A10.6), но без `used` —
 * это каталог возможностей тарифа, не расход. `capLimit` — план-специфичный
 * cap (`null` unlimited, `0` не входит в план), caption строится общим
 * `formatResourceCapCaption`, поэтому подписи/единицы/период совпадают с
 * тем, что видно на `workspace/Usage.vue`/в обзоре агента.
 *
 * @param {[string, number | null][]} caps
 */
function buildPlanLimits(caps) {
  return caps.map(([key, cap]) => ({
    key,
    label: getResourceLimitLabel(key),
    caption: formatResourceCapCaption(key, cap),
    progress: null,
  }));
}

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
    limits: buildPlanLimits([
      ["members", 3],
      ["agents", 5],
      ["collections", 5],
      ["objects", 200],
      ["channels", 0],
      ["extracted", 50_000_000],
      ["conversations", 1000],
    ]),
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
    conditions: ["Приоритетная поддержка"],
    limits: buildPlanLimits([
      ["members", 25],
      ["agents", null],
      ["collections", null],
      ["objects", 5000],
      ["channels", 10],
      ["extracted", 5_368_709_120],
      ["conversations", null],
    ]),
  },
  {
    id: "business",
    displayName: "Business",
    priceLabel: "По запросу",
    color: "#7041d4",
    rank: 2,
    description: "Для крупных команд и масштабных задач.",
    conditions: ["Выделенная поддержка"],
    limits: buildPlanLimits([
      ["members", null],
      ["agents", null],
      ["collections", null],
      ["objects", null],
      ["channels", null],
      ["extracted", null],
      ["conversations", null],
    ]),
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
