<template>
  <section class="tr-tariff-selector" aria-label="Выбор тарифа">
    <div class="tr-tariff-selector__billing" aria-label="Период оплаты">
      <button
        class="tr-tariff-selector__billing-option"
        :class="{ 'tr-tariff-selector__billing-option--active': billingPeriod === 'monthly' }"
        type="button"
        :aria-pressed="billingPeriod === 'monthly'"
        @click="setBillingPeriod('monthly')"
      >
        За месяц
      </button>
      <button
        class="tr-tariff-selector__billing-option"
        :class="{ 'tr-tariff-selector__billing-option--active': billingPeriod === 'yearly' }"
        type="button"
        :aria-pressed="billingPeriod === 'yearly'"
        @click="setBillingPeriod('yearly')"
      >
        За год
      </button>
    </div>

    <div class="tr-tariff-selector__cards" role="list">
      <article
        v-for="tariff in visibleTariffs"
        :key="tariff.id"
        class="tr-card tr-tariff-selector__card"
        :class="{
          'tr-tariff-selector__card--current': tariff.id === modelValue,
          'tr-tariff-selector__card--disabled': isDisabled(tariff),
        }"
        :style="{ '--tr-tariff-color': tariff.color ?? 'var(--tr-primary)' }"
      >
        <span class="tr-tariff-selector__heading">
          <strong class="tr-tariff-selector__name">{{ tariff.displayName }}</strong>
          <span class="tr-tariff-selector__badges">
            <!-- <span v-if="tariff.id === modelValue" class="tr-tariff-selector__current">
              Текущий
            </span> -->
            <span v-if="billingPeriod === 'yearly' && tariff.yearlySavingsLabel" class="tr-tariff-selector__saving">
              {{ tariff.yearlySavingsLabel }}
            </span>
          </span>
        </span>

        <span v-if="tariff.description" class="tr-tariff-selector__description">
          {{ tariff.description }}
        </span>

        <span class="tr-tariff-selector__price-area">
          <span
            v-if="billingPeriod === 'yearly' && tariff.yearlyRegularPriceLabel"
            class="tr-tariff-selector__price tr-tariff-selector__price--regular"
          >
            {{ tariff.yearlyRegularPriceLabel }}
          </span>
          <strong class="tr-tariff-selector__price">{{ getPriceLabel(tariff) }}</strong>
        </span>

        <button
          class="tr-tariff-selector__action"
          type="button"
          :disabled="isActionDisabled(tariff)"
          @click="handleAction(tariff)"
        >
          {{ getActionLabel(tariff) }}
        </button>

        <span class="tr-tariff-selector__limits">
          <span v-for="limit in tariff.limits" :key="limit.key" class="tr-tariff-selector__limit">
            <span class="tr-tariff-selector__limit-label">{{ limit.label }}</span>
            <span class="tr-muted tr-tariff-selector__caption">{{ limit.caption }}</span>
          </span>
        </span>

        <ul v-if="tariff.conditions?.length" class="tr-tariff-selector__conditions">
          <li v-for="condition in tariff.conditions" :key="condition">{{ condition }}</li>
        </ul>
      </article>
    </div>
  </section>
</template>

<script setup>
import { computed } from "vue";

/**
 * @typedef {import("../stores/workspace").WorkspaceTariff & {
 *   id: string,
 *   color?: string,
 *   isFree?: boolean,
 *   description?: string,
 *   monthlyPriceLabel?: string,
 *   yearlyPriceLabel?: string,
 *   yearlyRegularPriceLabel?: string,
 *   yearlySavingsLabel?: string,
 *   rank?: number,
 *   conditions?: string[],
 *   disabled?: boolean,
 * }} TariffSelectorTariff
 */

const props = defineProps({
  /** @type {import("vue").PropType<TariffSelectorTariff[]>} */
  tariffs: {
    type: Array,
    required: true,
  },
  modelValue: {
    type: String,
    default: undefined,
  },
  billingPeriod: {
    type: String,
    default: "monthly",
  },
  disabledTariffIds: {
    type: Array,
    default: () => [],
  },
  showFree: {
    type: Boolean,
    default: true,
  },
});

const emit = defineEmits(["update:modelValue", "update:billingPeriod", "select"]);

const visibleTariffs = computed(() => props.tariffs.filter(
  (tariff) => props.showFree || !tariff.isFree,
));

function isDisabled(tariff) {
  return tariff.disabled || props.disabledTariffIds.includes(tariff.id);
}

function selectTariff(tariff) {
  if (isDisabled(tariff)) return;

  emit("update:modelValue", tariff.id);
  emit("select", tariff);
}

function setBillingPeriod(billingPeriod) {
  emit("update:billingPeriod", billingPeriod);
}

function getPriceLabel(tariff) {
  if (props.billingPeriod === "yearly") {
    return tariff.yearlyPriceLabel ?? tariff.priceLabel;
  }

  return tariff.monthlyPriceLabel ?? tariff.priceLabel;
}

function getActionLabel(tariff) {
  if (isDisabled(tariff)) return "Недоступен";
  if (tariff.id === props.modelValue) {
    return props.billingPeriod === "monthly"
      ? "Перейти на годовую оплату"
      : "Текущий тариф";
  }

  const currentTariff = props.tariffs.find((item) => item.id === props.modelValue);
  if (currentTariff?.rank !== undefined && tariff.rank !== undefined) {
    return tariff.rank > currentTariff.rank ? "Повысить тариф" : "Понизить тариф";
  }

  return "Выбрать тариф";
}

function isActionDisabled(tariff) {
  return isDisabled(tariff)
    || (tariff.id === props.modelValue && props.billingPeriod === "yearly");
}

function handleAction(tariff) {
  if (tariff.id === props.modelValue) {
    setBillingPeriod("yearly");
    return;
  }

  selectTariff(tariff);
}
</script>
