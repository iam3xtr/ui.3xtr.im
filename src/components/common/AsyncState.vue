<template>
  <div
    class="tr-async-state"
    :class="`tr-async-state--${variant}`"
    :role="variant === 'loading' ? null : role"
    :aria-live="variant === 'loading' ? null : ariaLive"
  >
    <Loader v-if="variant === 'loading'" size="section" />

    <template v-else>
      <span v-if="icon" class="tr-async-state__icon">
        <b-icon :icon="icon" size="is-large" />
      </span>
      <strong v-if="title" class="tr-async-state__title">{{ title }}</strong>
      <span v-if="message" class="tr-async-state__message">{{ message }}</span>
      <div v-if="$slots.default" class="tr-async-state__actions">
        <slot />
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed } from "vue";

import Loader from "./Loader.vue";

// Единый контент-блок для пяти async/empty-состояний из контракта
// `.tr-async-state` (Task A3.7, docs/agent-migration-guide.md, раздел 9).
// Presentation-only: компонент ничего не запрашивает и не решает про
// permissions — вызывающая страница передаёт готовые icon/title/message (или
// делегирует выбор варианта ListAsyncState.vue).
const props = defineProps({
  variant: {
    type: String,
    required: true,
    validator: (value) => [
      "loading",
      "empty",
      "no-results",
      "error",
      "permission-denied",
    ].includes(value),
  },
  // MDI-имя для b-icon. Необязательно: не все состояния показывают иконку —
  // например, .tr-async-state--no-results внутри узкой панели списка
  // диалогов (Conversations.vue) обходится одним сообщением.
  icon: {
    type: String,
    default: null,
  },
  title: {
    type: String,
    default: null,
  },
  message: {
    type: String,
    default: null,
  },
});

// error — единственный вариант, прерывающий пользователя новой информацией;
// остальные — статичное описание состояния (agent-migration-guide.md, п.9).
const role = computed(() => (props.variant === "error" ? "alert" : "status"));
const ariaLive = computed(() => (props.variant === "error" ? "assertive" : "polite"));
</script>
