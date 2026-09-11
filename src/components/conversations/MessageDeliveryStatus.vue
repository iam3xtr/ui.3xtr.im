<template>
  <span
    v-if="icon"
    class="tr-message-delivery"
    :class="`is-${delivery.status}`"
    :title="tooltip"
  >
    <b-icon :icon="icon" size="is-small" />

    <button
      v-if="delivery.status === 'failed' && delivery.retryable"
      type="button"
      class="tr-message-delivery__retry"
      @click="emit('retry')"
    >
      Повторить
    </button>
  </span>
</template>

<script setup>
import { computed } from "vue";

// Delivery-status badge for an outgoing message (Task A5.7), the kit
// counterpart of get.3xtr.im's `conversations/components/MessageDeliveryStatus.vue`
// stripped to what the kit's fixtures model: a status icon, a tooltip with
// the error message when one is set, and a "Повторить" action gated on
// `retryable` — there is no queued/sending polling loop here, since the
// store never simulates the delivery pipeline over time (Task A5.7 keeps the
// composer's own network-call surface at zero).
const props = defineProps({
  /** @type {import("vue").PropType<import("../../stores/conversations").MessageDelivery>} */
  delivery: {
    type: Object,
    required: true,
  },
});

const emit = defineEmits(["retry"]);

const ICONS = {
  queued: "clock-outline",
  sending: "progress-clock",
  delivered: "check",
  read: "check-all",
  failed: "alert-circle-outline",
  cancelled: "minus",
};

const LABELS = {
  queued: "В очереди",
  sending: "Отправляется",
  delivered: "Доставлено",
  read: "Прочитано",
  failed: "Не доставлено",
  cancelled: "Отменено",
};

const icon = computed(() => ICONS[props.delivery.status] ?? null);

const tooltip = computed(() => {
  const label = LABELS[props.delivery.status] ?? props.delivery.status;
  return props.delivery.errorMessage ? `${label}: ${props.delivery.errorMessage}` : label;
});
</script>
